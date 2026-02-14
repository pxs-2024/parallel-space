"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Space, ToolId, PointerEvt, Cell, GridMode } from "./engine/types";
import { FloorPlanEngine } from "./engine/engine";
import { Button } from "@/components/ui/button";
import { useSpaceKeyListener } from "./hooks/useKeyDownLinstener";
import { useInitAndResizeCanvas } from "./hooks/useInitAndResizeCanvas";
import { InputNameDialog } from "./input-name-dialog";
import { hitGenerate } from "./engine/hitGenerate";
import { AddSpaceCmd } from "./engine/commands";

export type CanvasGridSelectorHandle = {
	getSpaces: () => Space[];
	/** 本次编辑中在 history 里被更新过的已有空间 id（含正在编辑空间） */
	getUpdatedSpaceIds: () => string[];
	/** 本次编辑中在 history 里新建的空间 id */
	getCreatedSpaceIds: () => string[];
	/** 本次编辑中只改了名称/描述的空间 id，完成时需提交服务端 */
	getEditedInfoSpaceIds: () => string[];
};

type Props = {
	initialSpaces?: Space[] | null;
	persistCallbacks?: any | null;
	editMode?: boolean;
	/** 非编辑模式（none）下点击空间时调用，用于打开对应抽屉等 */
	onSpaceSelect?: (spaceId: string) => void;
};

export const CanvasGridSelector = forwardRef<CanvasGridSelectorHandle, Props>(function CanvasGridSelector(
	{
		initialSpaces = null,
		persistCallbacks = null,
		editMode = true,
		onSpaceSelect,
	},
	ref
) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const [tool, setTool] = useState<ToolId>("editDefault");
	const [spaces, setSpaces] = useState<Space[]>(initialSpaces ?? []);
	const [gridMode, setGridMode] = useState<GridMode>("full");
	const [error, setError] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogName, setDialogName] = useState("");
	const [dialogDesc, setDialogDesc] = useState("");
	const [pendingCells, setPendingCells] = useState<Cell[] | null>(null);
	// 右键菜单（仅编辑模式、点在空间上时显示）：用自定义定位避免 Radix 受控时无定位
	const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
	const [contextMenuSpaceId, setContextMenuSpaceId] = useState<string | null>(null);
	const contextMenuRef = useRef<HTMLDivElement>(null);
	/** 非编辑模式下左键按下位置，用于区分点击与拖拽（拖拽不打开抽屉） */
	const pointerDownRef = useRef<{ screenX: number; screenY: number } | null>(null);
	// 编辑信息弹窗
	const [editInfoOpen, setEditInfoOpen] = useState(false);
	const [editInfoSpaceId, setEditInfoSpaceId] = useState<string | null>(null);
	const [editInfoName, setEditInfoName] = useState("");
	const [editInfoDesc, setEditInfoDesc] = useState("");
	// 是否处于「编辑空间」状态（用于显示「保存图形」按钮）
	const [editingSpaceId, setEditingSpaceIdState] = useState<string | null>(null);

	const spaceKeyRef = useSpaceKeyListener();

	const engine = useMemo(() => {
		return new FloorPlanEngine(
			{
				spaces: initialSpaces ?? [],
				selectedCells: [],
				selectedSpaceId: null,
				hoverSpaceId: null,
				view: null as any,
				overlay: null,
				gridMode: "full",
				editMode: true,
				editingSpaceId: null,
				editedInfoSpaceIds: [],
			},
			persistCallbacks
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// resize hook 仍可复用：让 canvas 尺寸正确
	const viewportRef = useInitAndResizeCanvas(
		canvasRef as unknown as React.RefObject<HTMLCanvasElement>,
		wrapRef as unknown as React.RefObject<HTMLDivElement>,
		engine
	);

	// attach canvas
	useEffect(() => {
		const c = canvasRef.current;
		if (!c) return;
		engine.attachCanvas(c, () => viewportRef. current);
	}, [engine]);

	// tool 同步
	useEffect(() => {
		engine.setTool(editMode ? tool : "none");
	}, [engine, tool, editMode]);

	// 编辑模式下按 Esc 切回 editDefault
	useEffect(() => {
		if (!editMode) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Escape") {
				setTool("editDefault");
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [editMode]);

	// 外部 spaces 同步（persist 模式下父组件回灌）
	useEffect(() => {
		if (initialSpaces == null) return;
		setSpaces(initialSpaces);
		engine.syncSpacesFromOutside(initialSpaces);
	}, [initialSpaces, engine]);

	// 网格模式、编辑模式同步到 engine；退出编辑模式时清除“编辑空间”状态
	useEffect(() => {
		engine.setGridMode(gridMode);
	}, [engine, gridMode]);
	useEffect(() => {
		engine.setEditMode(editMode);
	}, [engine, editMode]);

	// 同步「编辑空间」状态以便侧栏显示「保存图形」按钮
	useEffect(() => {
		const unsub = engine.subscribe(() => {
			setEditingSpaceIdState(engine.getState().editingSpaceId);
		});
		setEditingSpaceIdState(engine.getState().editingSpaceId);
		return () => {
			unsub();
		};
	}, [engine]);

	useImperativeHandle(
		ref,
		() => ({
			getSpaces: () => {
				const st = engine.getState();
				if (!st.editingSpaceId) return st.spaces;
				return st.spaces.map((s) =>
					s.id === st.editingSpaceId ? { ...s, cells: st.selectedCells } : s
				);
			},
			getUpdatedSpaceIds: () => engine.getUpdatedSpaceIds(),
			getCreatedSpaceIds: () => engine.getCreatedSpaceIds(),
			getEditedInfoSpaceIds: () => engine.getEditedInfoSpaceIds(),
		}),
		[engine]
	);

	// 输入归一化
	const getScreenXY = (clientX: number, clientY: number) => {
		const wrap = wrapRef.current;
		if (!wrap) return null;
		const rect = wrap.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		const { width, height } = viewportRef.current;
		if (x < 0 || y < 0 || x >= width || y >= height) return null;
		return { screenX: x, screenY: y };
	};

	const toPointerEvt = (e: React.PointerEvent): PointerEvt | null => {
		const s = getScreenXY(e.clientX, e.clientY);
		if (!s) return null;
		return {
			pointerId: e.pointerId,
			screenX: s.screenX,
			screenY: s.screenY,
			button: e.button,
			shiftKey: e.shiftKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			metaKey: e.metaKey,
			isSpaceKey: !!spaceKeyRef.current,
		};
	};

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		const evt = toPointerEvt(e);
		if (!evt) return;
		if (!editMode) pointerDownRef.current = { screenX: evt.screenX, screenY: evt.screenY };
		(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
		engine.pointerDown(evt);
	};

	const onPointerMove = (e: React.PointerEvent) => {
		const evt = toPointerEvt(e);
		if (!evt) return;
		engine.pointerMove(evt);
	};

	const onPointerUp = (e: React.PointerEvent) => {
		const evt = toPointerEvt(e);
		if (!evt) return;
		engine.pointerUp(evt);
		// 仅非编辑模式且为点击（未拖拽）时打开抽屉
		if (!editMode && onSpaceSelect && evt.button === 0) {
			const down = pointerDownRef.current;
			pointerDownRef.current = null;
			const moveThreshold = 5;
			const isClick =
				down &&
				Math.hypot(evt.screenX - down.screenX, evt.screenY - down.screenY) <= moveThreshold;
			if (isClick) {
				const spaceId = engine.getSpaceIdAt(evt.screenX, evt.screenY);
				if (spaceId) onSpaceSelect(spaceId);
			}
		}
	};

	const onWheel = (e: React.WheelEvent) => {
		const s = getScreenXY(e.clientX, e.clientY);
		if (!s) return;
		engine.wheelZoomAt(s.screenX, s.screenY, e.deltaY);
	};

	// 点击「生成图形」：先校验选区，失败直接提示错误，成功则打开输入名称/描述的弹窗
	const onGenerateClick = () => {
		setError("");
		const result = hitGenerate(engine.getState().selectedCells);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setPendingCells(result.cells);
		setDialogName("");
		setDialogDesc("");
		setDialogOpen(true);
	};

	const onDialogConfirm = () => {
		if (!pendingCells || pendingCells.length === 0) return;
		engine.commitCommand(
			new AddSpaceCmd(dialogName, dialogDesc.trim() || undefined, pendingCells)
		);
		setPendingCells(null);
		setDialogOpen(false);
	};

	// 右键：仅当点在空间上时在光标处显示菜单
	const onCanvasContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		if (!editMode) return;
		const xy = getScreenXY(e.clientX, e.clientY);
		if (!xy) return;
		const spaceId = engine.getSpaceIdAt(xy.screenX, xy.screenY);
		if (spaceId) {
			setContextMenuSpaceId(spaceId);
			setContextMenuPosition({ x: e.clientX, y: e.clientY });
		}
	};

	const closeContextMenu = () => {
		setContextMenuPosition(null);
		setContextMenuSpaceId(null);
	};

	// 点击菜单外关闭
	useEffect(() => {
		if (!contextMenuPosition) return;
		const onMouseDown = (e: MouseEvent) => {
			if (contextMenuRef.current?.contains(e.target as Node)) return;
			closeContextMenu();
		};
		document.addEventListener("mousedown", onMouseDown);
		return () => document.removeEventListener("mousedown", onMouseDown);
	}, [contextMenuPosition]);

	const onEditSpace = () => {
		if (contextMenuSpaceId) {
			engine.setEditingSpaceId(contextMenuSpaceId);
			closeContextMenu();
		}
	};

	const onEditInfo = () => {
		if (!contextMenuSpaceId) return;
		const space = engine.getState().spaces.find((s) => s.id === contextMenuSpaceId);
		if (space) {
			setEditInfoSpaceId(contextMenuSpaceId);
			setEditInfoName(space.name);
			setEditInfoDesc(space.description ?? "");
			setEditInfoOpen(true);
		}
		closeContextMenu();
	};

	const onEditInfoConfirm = () => {
		if (!editInfoSpaceId) return;
		engine.updateSpaceInfoLocal(editInfoSpaceId, editInfoName, editInfoDesc);
		setEditInfoOpen(false);
		setEditInfoSpaceId(null);
	};

	return (
		<div className="flex flex-1 min-h-0">
			<div
				ref={wrapRef}
				className="canvas-transparent relative flex-1 min-h-0 overflow-hidden border border-border rounded-md"
				onContextMenu={onCanvasContextMenu}
			>
				<canvas
					ref={canvasRef}
					className="block touch-none"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onWheel={onWheel}
				/>
			</div>
			{/* 自定义右键菜单：仅编辑模式且点在空间上时显示 */}
			{contextMenuPosition && contextMenuSpaceId && (
				<div
					ref={contextMenuRef}
					className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
					style={{ left: contextMenuPosition.x + 2, top: contextMenuPosition.y + 2 }}
				>
					<button
						type="button"
						className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
						onClick={onEditSpace}
					>
						编辑空间
					</button>
					<button
						type="button"
						className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
						onClick={onEditInfo}
					>
						编辑信息
					</button>
				</div>
			)}
			{editMode && (
				<div className="flex flex-col gap-2 border-l border-border bg-muted/30 px-3 py-3 shrink-0 w-48">
					<Button
						size="sm"
						variant={gridMode === "full" ? "default" : "outline"}
						onClick={() => setGridMode((m) => (m === "full" ? "none" : "full"))}
					>
						{gridMode === "full" ? "隐藏网格" : "显示网格"}
					</Button>
					<Button
						size="sm"
						variant={tool === "select" ? "default" : "outline"}
						onClick={() => setTool((t) => (t === "select" ? "editDefault" : "select"))}
					>
						选择
					</Button>
					<Button
						size="sm"
						variant={tool === "deselect" ? "secondary" : "outline"}
						onClick={() => setTool((t) => (t === "deselect" ? "editDefault" : "deselect"))}
					>
						取消
					</Button>
					<Button size="sm" variant="outline" onClick={onGenerateClick}>
						生成图形
					</Button>
					{editingSpaceId != null && (
						<Button
							size="sm"
							variant="default"
							onClick={() => engine.applyEditingSpace()}
						>
							保存图形
						</Button>
					)}
					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
					<InputNameDialog
						open={dialogOpen}
						onOpenChange={(open) => {
							setDialogOpen(open);
							if (!open) setPendingCells(null);
						}}
						name={dialogName}
						onNameChange={setDialogName}
						description={dialogDesc}
						onDescriptionChange={setDialogDesc}
						onConfirm={onDialogConfirm}
					/>
					<InputNameDialog
						open={editInfoOpen}
						onOpenChange={(open) => {
							setEditInfoOpen(open);
							if (!open) setEditInfoSpaceId(null);
						}}
						title="编辑信息"
						name={editInfoName}
						onNameChange={setEditInfoName}
						description={editInfoDesc}
						onDescriptionChange={setEditInfoDesc}
						onConfirm={onEditInfoConfirm}
					/>
					<Button
						size="sm"
						variant={tool === "cleanSegments" ? "default" : "outline"}
						onClick={() => engine.resetView()}
					>
						重置视图
					</Button>
				</div>
			)}
		</div>
	);
});
