"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Grid3X3, MousePointer2, Shapes, Check, RotateCcw } from "lucide-react";
import type { Space, ToolId, PointerEvt, Cell, GridMode } from "./engine/types";
import { FloorPlanEngine } from "./engine/engine";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

export const CanvasGridSelector = forwardRef<CanvasGridSelectorHandle, Props>(
	function CanvasGridSelector(
		{ initialSpaces = null, persistCallbacks = null, editMode = true, onSpaceSelect },
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
		const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(
			null
		);
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
			engine.attachCanvas(c, () => viewportRef.current);
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
			// 选择/取消合一模式：左键(0)与中键(1)都交给 engine；否则仅左键
			const isSelectDeselect = editMode && tool === "selectDeselect";
			if (!isSelectDeselect && e.button !== 0) return;
			if (isSelectDeselect && e.button !== 0 && e.button !== 1) return;
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
					{/* 选择/取消模式下：画布右侧中间显示如何生成 space 的操作说明 */}
					{tool === "selectDeselect" && (
						<div
							className="pointer-events-none absolute right-4 top-1/2 z-10 w-40 -translate-y-1/2 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm"
							aria-hidden
						>
							<p className="font-medium text-foreground/80">如何生成空间</p>
							<ul className="mt-1.5 space-y-1">
								<li>· 左键框选：添加选区</li>
								<li>· 中键框选：取消选区</li>
								<li>· 框选完成后点击左侧「生成图形」创建新空间</li>
								<li>· 或右键已有空间 → 编辑空间</li>
							</ul>
						</div>
					)}
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
					<div className="flex flex-col gap-2 border-l border-border bg-muted/30 px-2 py-3 shrink-0 w-12 items-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex size-9 items-center justify-center">
									<Button
										size="icon"
										variant={gridMode === "full" ? "default" : "outline"}
										className="h-9 w-9"
										onClick={() => setGridMode((m) => (m === "full" ? "none" : "full"))}
										aria-label={gridMode === "full" ? "隐藏网格" : "显示网格"}
									>
										<Grid3X3 className="size-4" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-56">
								<div>
									<p className="font-medium">{gridMode === "full" ? "隐藏网格" : "显示网格"}</p>
									<p className="mt-0.5 text-muted-foreground">
										{gridMode === "full"
											? "切换后画布不再显示网格线，便于查看空间轮廓。"
											: "在画布上显示网格线，便于对齐与绘制空间。"}
									</p>
								</div>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex size-9 items-center justify-center">
									<Button
										size="icon"
										variant={tool === "selectDeselect" ? "default" : "outline"}
										className="h-9 w-9"
										onClick={() =>
											setTool((t) => (t === "selectDeselect" ? "editDefault" : "selectDeselect"))
										}
										aria-label="选择/取消"
									>
										<MousePointer2 className="size-4" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-56">
								<div>
									<p className="font-medium">选择/取消</p>
									<p className="mt-0.5 text-muted-foreground">
										左键框选添加选区、中键框选取消选区，用于编辑空间形状或为「生成图形」圈定范围。
									</p>
								</div>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex size-9 items-center justify-center">
									<Button
										size="icon"
										variant="outline"
										className="h-9 w-9"
										onClick={onGenerateClick}
										aria-label="生成图形"
									>
										<Shapes className="size-4" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-56">
								<div>
									<p className="font-medium">生成图形</p>
									<p className="mt-0.5 text-muted-foreground">
										将当前框选的选区转为新空间，需输入名称与描述。
									</p>
								</div>
							</TooltipContent>
						</Tooltip>
						{editingSpaceId != null && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex size-9 items-center justify-center">
										<Button
											size="icon"
											variant="default"
											className="h-9 w-9"
											onClick={() => engine.applyEditingSpace()}
											aria-label="保存图形"
										>
											<Check className="size-4" />
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent side="left" className="max-w-56">
									<div>
										<p className="font-medium">保存图形</p>
										<p className="mt-0.5 text-muted-foreground">
											将当前编辑中的空间形状确认保存并退出编辑。
										</p>
									</div>
								</TooltipContent>
							</Tooltip>
						)}
						{error && (
							<p
								className="text-xs text-destructive text-center wrap-break-word w-full"
								role="alert"
							>
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
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex size-9 items-center justify-center">
									<Button
										size="icon"
										variant={tool === "cleanSegments" ? "default" : "outline"}
										className="h-9 w-9"
										onClick={() => engine.resetView()}
										aria-label="重置视图"
									>
										<RotateCcw className="size-4" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-56">
								<div>
									<p className="font-medium">重置视图</p>
									<p className="mt-0.5 text-muted-foreground">
										将画布缩放与平移恢复为默认，便于重新浏览。
									</p>
								</div>
							</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>
		);
	}
);
