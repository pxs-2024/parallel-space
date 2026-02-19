import type { Cell, FPState, GridMode, PointerEvt, ToolId, Viewport } from "./types";
import type { Space } from "./types";
import { Store } from "./store";
import { History, Command } from "./history";
import { HitTest } from "./hitTest";
import { screenToCell, screenToPoint } from "./camera";
import { toolById } from "./tools";
import type { DragState } from "./states";
import { renderFloorPlan } from "./renderer";
import { MAX_CANVAS_SIZE, SIZE } from "../constants";
import { NoneState } from "./states";
import { ApplyEditingSpaceCmd } from "./commands";
import { cellsToBorderSegments } from "../utils";
export type PersistCallbacks = {
	onCreate: (name: string, cells: any[]) => void | Promise<void>;
	onUpdate: (spaceId: string, cells: any[]) => void | Promise<void>;
	onSpaceSelect: (spaceId: string) => void;
};

export class FloorPlanEngine {
	private store: Store<FPState>;
	private history = new History<FPState>();
	private hitTest = new HitTest();
	private toolId: ToolId = "none";
	private drag: DragState = new NoneState();

	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private viewport: Viewport = { width: 0, height: 0 };
	private raf = 0;

	constructor(initial: FPState, private persist: PersistCallbacks | null) {
		this.store = new Store({
			...initial,
			view: {
				translateX: -MAX_CANVAS_SIZE / 2,
				translateY: -MAX_CANVAS_SIZE / 2,
				scale: 1,
			},
			gridMode: initial.gridMode ?? "full",
			editMode: initial.editMode ?? true,
			editingSpaceId: initial.editingSpaceId ?? null,
			editedInfoSpaceIds: initial.editedInfoSpaceIds ?? [],
			previewSpaces: initial.previewSpaces ?? null,
		});
		this.hitTest.sync(initial.spaces);

		// Observer：state 变化 -> 合帧 render
		this.store.subscribe(() => this.requestRender());
	}

	// ---- public API for React ----
	attachCanvas(canvas: HTMLCanvasElement, getViewport: () => Viewport) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.viewport = getViewport();
		this.requestRender();
	}

	setViewport(vp: Viewport) {
		const isFirstSize = this.viewport.width === 0 && this.viewport.height === 0 && vp.width > 0 && vp.height > 0;
		this.viewport = vp;
		if (isFirstSize) this.setInitialView();
		this.requestRender();
	}

	/** 画布初始：最小缩放且居中 */
	private setInitialView() {
		const { width, height } = this.viewport;
		const scale = FloorPlanEngine.MIN_SCALE;
		const canvasCenter = MAX_CANVAS_SIZE / 2;
		this.store.mutate((s) => ({
			...s,
			view: {
				translateX: width / 2 - canvasCenter * scale,
				translateY: height / 2 - canvasCenter * scale,
				scale,
			},
		}));
	}

	setTool(id: ToolId) {
		this.toolId = id;
    this.requestRender(); 
	}

	syncSpacesFromOutside(spaces: FPState["spaces"]) {
		// 外部 source of truth（persistCallbacks 模式非常适合这样）
		this.store.mutate((s) => ({ ...s, spaces }));
		this.hitTest.sync(spaces);
	}

	syncSelectedSpaceId(id: string | null) {
		this.store.mutate((s) => ({ ...s, selectedSpaceId: id }));
	}

	setGridMode(mode: GridMode) {
		this.store.mutate((s) => ({ ...s, gridMode: mode }));
	}

	setEditMode(editMode: boolean) {
		this.store.mutate((s) => ({
			...s,
			editMode,
			...(editMode ? {} : { editingSpaceId: null, editedInfoSpaceIds: [] }),
		}));
	}

	setEditingSpaceId(spaceId: string | null) {
		this.store.mutate((s) => {
			if (spaceId === null) return { ...s, editingSpaceId: null };
			const space = s.spaces.find((sp) => sp.id === spaceId);
			return {
				...s,
				editingSpaceId: spaceId,
				selectedCells: space ? [...space.cells] : s.selectedCells,
			};
		});
	}

	/** 将当前选区应用为正在编辑的空间图形并退出编辑状态（入 history，完成时随 getUpdatedSpaceIds 提交） */
	applyEditingSpace() {
		const st = this.store.getState();
		if (!st.editingSpaceId) return;
		this.commitCommand(new ApplyEditingSpaceCmd(st.editingSpaceId, [...st.selectedCells]));
	}

	/** 屏幕坐标下所在空间 id（用于右键菜单） */
	getSpaceIdAt(screenX: number, screenY: number): string | null {
		const view = this.store.getState().view;
		const cell = screenToCell(screenX, screenY, view);
		return this.hitTest.innermostSpaceIdByCell(cell);
	}

	/** 本地更新空间名称/描述，并标记为“已编辑信息”，完成时提交 */
	updateSpaceInfoLocal(spaceId: string, name: string, description?: string) {
		this.store.mutate((s) => {
			const spaces = s.spaces.map((sp) =>
				sp.id === spaceId ? { ...sp, name, description: description ?? sp.description } : sp
			);
			const ids = s.editedInfoSpaceIds.includes(spaceId) ? s.editedInfoSpaceIds : [...s.editedInfoSpaceIds, spaceId];
			return { ...s, spaces, editedInfoSpaceIds: ids };
		});
	}

	getEditedInfoSpaceIds(): string[] {
		return this.store.getState().editedInfoSpaceIds;
	}

	/** 清空未使用的选区（完成时调用） */
	clearSelectedCells() {
		this.store.mutate((s) => ({ ...s, selectedCells: [] }));
	}

	/** 设置模版预览（悬浮模版时在画布视口中心浅色绘制，并隐藏原空间） */
	setPreviewSpaces(spaces: FPState["previewSpaces"]) {
		if (spaces == null || spaces.length === 0) {
			this.store.mutate((s) => ({ ...s, previewSpaces: null }));
			return;
		}
		const view = this.store.getState().view;
		const { width, height } = this.viewport;
		// 视口中心对应的格点坐标（世界像素 / SIZE）
		const viewportCenterCellX = (width / 2 - view.translateX) / view.scale / SIZE;
		const viewportCenterCellY = (height / 2 - view.translateY) / view.scale / SIZE;
		// 模版所有格子的包围盒中心
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const sp of spaces) {
			for (const c of sp.cells) {
				minX = Math.min(minX, c.x); minY = Math.min(minY, c.y);
				maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y);
			}
		}
		const templateCenterX = (minX + maxX) / 2;
		const templateCenterY = (minY + maxY) / 2;
		const dx = Math.round(viewportCenterCellX - templateCenterX);
		const dy = Math.round(viewportCenterCellY - templateCenterY);
		const shifted: Space[] = spaces.map((sp) => {
			const cells = sp.cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
			const segs = cellsToBorderSegments(cells);
			return { ...sp, cells, segs };
		});
		this.store.mutate((s) => ({ ...s, previewSpaces: shifted }));
	}

	/**
	 * 按当前视口中心计算与预览相同的偏移，返回偏移后的空间列表（用于确认生成时在视口对应区域创建）
	 */
	getPreviewShiftedSpaces(spaces: { name: string; description: string; cells: Cell[] }[]): { name: string; description: string; cells: Cell[] }[] {
		if (spaces.length === 0) return [];
		const view = this.store.getState().view;
		const { width, height } = this.viewport;
		const viewportCenterCellX = (width / 2 - view.translateX) / view.scale / SIZE;
		const viewportCenterCellY = (height / 2 - view.translateY) / view.scale / SIZE;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const sp of spaces) {
			for (const c of sp.cells) {
				minX = Math.min(minX, c.x); minY = Math.min(minY, c.y);
				maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y);
			}
		}
		const templateCenterX = (minX + maxX) / 2;
		const templateCenterY = (minY + maxY) / 2;
		const dx = Math.round(viewportCenterCellX - templateCenterX);
		const dy = Math.round(viewportCenterCellY - templateCenterY);
		return spaces.map((sp) => ({
			name: sp.name,
			description: sp.description,
			cells: sp.cells.map((c) => ({ x: c.x + dx, y: c.y + dy })),
		}));
	}

	getState() {
		return this.store.getState();
	}
	subscribe(fn: () => void) {
		return this.store.subscribe(fn);
	}

	/** 收集 undo 栈中会更新已有空间的 command 涉及的 spaceId；若正在“编辑空间”则也包含 editingSpaceId */
	getUpdatedSpaceIds(): string[] {
		const ids = new Set<string>();
		for (const cmd of this.history.getUndoStack()) {
			const list = cmd.getUpdatedSpaceIds?.() ?? [];
			list.forEach((id) => ids.add(id));
		}
		const st = this.store.getState();
		if (st.editingSpaceId) ids.add(st.editingSpaceId);
		return Array.from(ids);
	}

	/** 收集 undo 栈中新建空间的 command 产生的 spaceId */
	getCreatedSpaceIds(): string[] {
		const ids: string[] = [];
		for (const cmd of this.history.getUndoStack()) {
			const list = cmd.getCreatedSpaceIds?.() ?? [];
			ids.push(...list);
		}
		return ids;
	}

	/** 执行一条命令并加入历史（用于“生成图形”等 UI 提交） */
	commitCommand(cmd: Command<FPState>) {
		this.history.commit(this.store, cmd);
		this.hitTest.sync(this.store.getState().spaces);
	}

	undo() {
		this.history.undo(this.store);
	}
	redo() {
		this.history.redo(this.store);
	}

	pointerDown(e: PointerEvt) {
		const tool = toolById(this.toolId);
		const ctx = this.makeToolContext();
		this.drag = tool.onPointerDown(ctx, e);
	}
	pointerMove(e: PointerEvt) {
		const ctx = this.makeToolContext();
		this.drag = this.drag.onMove(ctx, e);
	}
	pointerUp(e: PointerEvt) {
		const ctx = this.makeToolContext();
		this.drag = this.drag.onUp(ctx, e);
		this.drag = new NoneState();
		this.hitTest.sync(this.store.getState().spaces);
	}

	// wheel 缩放建议也在 engine 内（避免组件里散落）
	/** 缩放范围，与 wheel 一致 */
	static readonly MIN_SCALE = 0.25;
	static readonly MAX_SCALE = 8;

	wheelZoomAt(screenX: number, screenY: number, deltaY: number) {
		const st = this.store.getState();
		const { translateX, translateY, scale } = st.view;

		const worldX = (screenX - translateX) / scale;
		const worldY = (screenY - translateY) / scale;
		const zoomFactor = Math.exp(-deltaY * 0.001);
		const nextScale = Math.max(FloorPlanEngine.MIN_SCALE, Math.min(FloorPlanEngine.MAX_SCALE, scale * zoomFactor));
		const nextTranslateX = screenX - worldX * nextScale;
		const nextTranslateY = screenY - worldY * nextScale;

		this.store.mutate((s) => ({
			...s,
			view: { translateX: nextTranslateX, translateY: nextTranslateY, scale: nextScale },
		}));
	}

	resetView() {
		const { width, height } = this.viewport;
    const scale = this.store.getState().view.scale;
		const canvasCenterX = MAX_CANVAS_SIZE / 2;
		const canvasCenterY = MAX_CANVAS_SIZE / 2;
		this.store.mutate((s) => ({
			...s,
			view: {
				translateX: width / 2 - canvasCenterX * scale,
				translateY: height / 2 - canvasCenterY * scale,
				scale: scale,
			},
		}));
	}


	// ---- internals ----
	private makeToolContext() {
		return {
			store: this.store,
			history: this.history,
			hitTest: this.hitTest,
			screenToCell,
			screenToPoint,
			commit: (cmd: Command<FPState>) => this.history.commit(this.store, cmd),
			ephemeral: (cmd: Command<FPState>) => cmd.execute(this.store), // 不入 history
		};
	}

	private requestRender() {
		if (this.raf) return;
		this.raf = requestAnimationFrame(() => {
			this.raf = 0;
			this.renderNow();
		});
	}

	private renderNow() {
		if (!this.canvas || !this.ctx) return;
		const state = this.store.getState();
		renderFloorPlan(this.ctx, this.canvas, this.viewport, state);
	}
}
