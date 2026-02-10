"use client";

import { useRef } from "react";
import { clamp } from "./utils";
import type { Space } from "./types";
import { Button } from "@/components/ui/button";
import {
	useFloorPlanSpaces,
	useFloorPlanViewport,
	useFloorPlanToolDrag,
	useFloorPlanDraw,
	useFloorPlanActions,
	useFloorPlanPointerHandlers,
	useFloorPlanCanvasLifecycle,
} from "./hooks";

export type { FloorPlanPersistCallbacks } from "./types";

type CanvasGridSelectorProps = {
	initialSpaces?: Space[] | null;
	persistCallbacks?: import("./types").FloorPlanPersistCallbacks | null;
	noItems?: boolean;
	editMode?: boolean;
};

/**
 * CanvasGridSelector - 物品管理平面图
 * 空间由网格圈选形成，可拖动调整；支持 persistCallbacks 与后端同步，noItems 时隐藏物品侧栏。
 */
const CanvasGridSelector = (props: CanvasGridSelectorProps) => {
	const {
		initialSpaces = null,
		persistCallbacks = null,
		noItems = false,
		editMode = true,
	} = props;

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const spacesState = useFloorPlanSpaces(initialSpaces);
	const {
		spaces,
		setSpaces,
		selected,
		setSelected,
		items,
		setItems,
		error,
		setError,
		selectedSpaceId,
		setSelectedSpaceId,
		selectedRef,
		spacesRef,
		selectedSpaceIdRef,
		spaceCellSetRef,
	} = spacesState;

	const viewport = useFloorPlanViewport(wrapRef, canvasRef);
	const {
		viewRef,
		viewportRef,
		screenToWorldPx,
		getScreenXYFromClient,
		getCellFromScreen,
		getCellFromClient,
		resizeCanvasToDPR,
		resetViewToCenter,
	} = viewport;

	const toolDrag = useFloorPlanToolDrag(editMode);
	const {
		toolMode,
		setToolMode,
		toolModeRef,
		editModeRef,
		dragStateRef,
		hoverSpaceIdRef,
	} = toolDrag;

	const drawApi = useFloorPlanDraw({
		canvasRef,
		viewRef,
		viewportRef,
		selectedRef,
		spacesRef,
		selectedSpaceIdRef,
		hoverSpaceIdRef,
		dragStateRef,
		screenToWorldPx,
	});
	const { scheduleDraw, draw, rafRef } = drawApi;

	const actions = useFloorPlanActions({
		spacesRef,
		spaceCellSetRef,
		selectedRef,
		selectedSpaceIdRef,
		setSpaces,
		setSelected,
		setItems,
		setError,
		setSelectedSpaceId,
		persistCallbacks,
		scheduleDraw,
		hoverSpaceIdRef,
	});
	const {
		hitTestInnermostSpaceIdByCell,
		toggleCell,
		updateSpaceById,
		confirm,
		clearSelected,
		clearSpaces,
		updateSpaceName,
		addItem,
		updateItem,
		removeItem,
	} = actions;

	const lifecycle = useFloorPlanCanvasLifecycle({
		wrapRef,
		canvasRef,
		resizeCanvasToDPR,
		draw,
		viewRef,
		viewportRef,
		rafRef,
		spaces,
		hoverSpaceIdRef,
		scheduleDraw,
		selected,
		selectedSpaceId,
	});
	const { spaceRef } = lifecycle;

	const pointers = useFloorPlanPointerHandlers({
		getScreenXYFromClient,
		getCellFromScreen,
		getCellFromClient,
		viewRef,
		spaceRef,
		toolModeRef,
		editModeRef,
		dragStateRef,
		spacesRef,
		hoverSpaceIdRef,
		persistCallbacks,
		setError,
		setSelected,
		setSelectedSpaceId,
		scheduleDraw,
		hitTestInnermostSpaceIdByCell,
		toggleCell,
		updateSpaceById,
	});
	const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = pointers;

	const onWheel = (e: React.WheelEvent) => {
		const screen = getScreenXYFromClient(e.clientX, e.clientY);
		if (!screen) return;
		const { screenX, screenY } = screen;
		const { translateX, translateY, scale } = viewRef.current;
		const worldX = (screenX - translateX) / scale;
		const worldY = (screenY - translateY) / scale;
		const zoomFactor = Math.exp(-e.deltaY * 0.001);
		const nextScale = clamp(scale * zoomFactor, 0.25, 8);
		const nextTranslateX = screenX - worldX * nextScale;
		const nextTranslateY = screenY - worldY * nextScale;
		viewRef.current = {
			translateX: nextTranslateX,
			translateY: nextTranslateY,
			scale: nextScale,
		};
		scheduleDraw();
	};

	return (
		<div className="flex-1 flex flex-col min-h-0">
			{!persistCallbacks && (
				<div className="flex flex-wrap items-center gap-3 shrink-0">
					<button
						onClick={() => void confirm()}
						disabled={!selected.length}
						className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
					>
						新建空间
					</button>
					<button onClick={clearSelected} className="px-4 py-2 rounded border border-gray-300">
						清空选中
					</button>
					<button onClick={clearSpaces} className="px-4 py-2 rounded border border-gray-300">
						清空空间
					</button>
					<button onClick={resetViewToCenter} className="px-4 py-2 rounded border border-gray-300">
						回到中心
					</button>
					{error && <span className="text-red-500">{error}</span>}
				</div>
			)}

			<div className="flex flex-1 min-h-0">
				<div
					ref={wrapRef}
					className="relative flex-1 border border-border overflow-hidden rounded-md"
				>
					<canvas
						ref={canvasRef}
						className="block touch-none"
						onWheel={onWheel}
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
						onPointerLeave={onPointerLeave}
					/>
				</div>
				{(editMode || !persistCallbacks) && (
					<div className="flex flex-col gap-2 border-l border-border bg-muted/30 px-3 py-3 shrink-0 w-48 overflow-y-auto">
						<Button
							type="button"
							variant={toolMode === "select" ? "default" : "outline"}
							size="sm"
							className="w-full justify-center"
							onClick={() => setToolMode((m) => (m === "select" ? null : "select"))}
						>
							选择
						</Button>
						<Button
							type="button"
							variant={toolMode === "deselect" ? "secondary" : "outline"}
							size="sm"
							className="w-full justify-center"
							onClick={() => setToolMode((m) => (m === "deselect" ? null : "deselect"))}
						>
							取消
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full justify-center"
							disabled={!selected.length}
							onClick={() => void confirm()}
						>
							新建空间
						</Button>
						{error && persistCallbacks && (
							<span className="text-destructive text-xs">{error}</span>
						)}
						{!noItems && selectedSpaceId && (() => {
							const space = spaces.find((s) => s.id === selectedSpaceId);
							const spaceItems = items.filter((i) => i.spaceId === selectedSpaceId);
							if (!space) return null;
							return (
								<div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
									<div className="text-xs font-medium text-gray-500">当前空间</div>
									<input
										type="text"
										value={space.name}
										onChange={(e) => updateSpaceName(space.id, e.target.value)}
										className="px-2 py-1.5 rounded border border-gray-300 text-sm w-full"
										placeholder="空间名称"
									/>
									<div className="text-xs font-medium text-gray-500 mt-1">物品列表</div>
									<button
										type="button"
										onClick={addItem}
										className="px-2 py-1 rounded border border-gray-300 text-sm bg-white"
									>
										+ 添加物品
									</button>
									<ul className="flex flex-col gap-1.5">
										{spaceItems.map((item) => (
											<li
												key={item.id}
												className="flex items-center gap-2 rounded border border-gray-200 bg-white p-2"
											>
												<input
													type="text"
													value={item.name}
													onChange={(e) => updateItem(item.id, { name: e.target.value })}
													className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-transparent hover:border-gray-300 rounded"
												/>
												<input
													type="number"
													min={1}
													value={item.quantity ?? 1}
													onChange={(e) =>
														updateItem(item.id, {
															quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
														})
													}
													className="w-12 px-1 py-1 text-xs border border-gray-200 rounded"
												/>
												<button
													type="button"
													onClick={() => removeItem(item.id)}
													className="text-red-500 hover:text-red-700 text-xs"
												>
													删除
												</button>
											</li>
										))}
									</ul>
								</div>
							);
						})()}
					</div>
				)}
			</div>
		</div>
	);
};

export { CanvasGridSelector };
