import type { Cell, FPState, PointerEvt, ToolId, Viewport } from "./types";
import { Store } from "./store";
import { History, Command } from "./history";
import { HitTest } from "./hitTest";
import { screenToCell, screenToPoint } from "./camera";
import { toolById, } from "./tools";
import type { DragState } from "./states";
import { renderFloorPlan } from "./renderer";
import { MAX_CANVAS_SIZE } from "../constants";
import { NoneState } from "./states";
export type PersistCallbacks = {
	onCreate: (name: string, cells: any[]) => void | Promise<void>;
	onUpdate: (spaceId: string, cells: any[]) => void | Promise<void>;
	onSpaceSelect: (spaceId: string) => void;
};

export class FloorPlanEngine {
	private store: Store<FPState>;
	private history = new History<FPState>();
	private hitTest = new HitTest();
	private toolId: ToolId = "default";
	private drag: DragState = new NoneState();

	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private viewport: Viewport = { width: 0, height: 0 };
	private raf = 0;

	constructor(initial: FPState, private persist: PersistCallbacks | null) {
		this.store = new Store({
      ...initial,
      view:{
        translateX: - MAX_CANVAS_SIZE / 2,
        translateY: - MAX_CANVAS_SIZE / 2,
        scale: 1,
      }
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
		this.viewport = vp;
		this.requestRender();
	}

	setTool(id: ToolId) {
    console.log(id)
		this.toolId = id;
    this.requestRender(); 
	}

  updateSpacesById(id: string, cells: Cell[]) {
    this.store.mutate((s) => ({
      ...s,
      spaces: s.spaces.map((s) =>
        s.id === id ? { ...s, cells: cells as Cell[] } : s
      ),
    }));
  }

	syncSpacesFromOutside(spaces: FPState["spaces"]) {
		// 外部 source of truth（persistCallbacks 模式非常适合这样）
		this.store.mutate((s) => ({ ...s, spaces }));
		this.hitTest.sync(spaces);
	}

	syncSelectedSpaceId(id: string | null) {
		this.store.mutate((s) => ({ ...s, selectedSpaceId: id }));
	}

	getState() {
		return this.store.getState();
	}
	subscribe(fn: () => void) {
		return this.store.subscribe(fn);
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
	wheelZoomAt(screenX: number, screenY: number, deltaY: number) {
		const st = this.store.getState();
		const { translateX, translateY, scale } = st.view;

		const worldX = (screenX - translateX) / scale;
		const worldY = (screenY - translateY) / scale;
		const zoomFactor = Math.exp(-deltaY * 0.001);
		const nextScale = Math.max(0.25, Math.min(8, scale * zoomFactor));
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
    console.log(scale)
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
      updateSpacesById: (id: string, cells: Cell[]) => this.updateSpacesById(id, cells),
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
    console.log(this.viewport,state)
		renderFloorPlan(this.ctx, this.canvas, this.viewport, state);
	}
}
