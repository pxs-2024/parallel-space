"use client";

import { useCallback } from "react";
import type { Cell } from "../types";
import { INITIAL_DRAG_STATE } from "../types";
import type { FloorPlanPersistCallbacks } from "../types";
import type { DragState } from "../types";
import { DRAG_THRESHOLD_PX } from "../constants";
import { buildCellsInRect, subtractCells, unionCells } from "../utils";

type ViewRef = React.MutableRefObject<{ translateX: number; translateY: number; scale: number }>;

type UseFloorPlanPointerHandlersParams = {
	getScreenXYFromClient: (clientX: number, clientY: number) => { screenX: number; screenY: number } | null;
	getCellFromScreen: (screenX: number, screenY: number) => Cell;
	getCellFromClient: (clientX: number, clientY: number) => Cell | null;
	viewRef: ViewRef;
	spaceRef: React.MutableRefObject<boolean>;
	toolModeRef: React.MutableRefObject<"select" | "deselect" | null>;
	editModeRef: React.MutableRefObject<boolean>;
	dragStateRef: React.MutableRefObject<DragState>;
	spacesRef: React.MutableRefObject<{ id: string; cells: Cell[] }[]>;
	hoverSpaceIdRef: React.MutableRefObject<string | null>;
	persistCallbacks: FloorPlanPersistCallbacks | null;
	setError: React.Dispatch<React.SetStateAction<string>>;
	setSelected: React.Dispatch<React.SetStateAction<Cell[]>>;
	setSelectedSpaceId: React.Dispatch<React.SetStateAction<string | null>>;
	scheduleDraw: () => void;
	hitTestInnermostSpaceIdByCell: (cell: Cell) => string | null;
	toggleCell: (cell: Cell) => void;
	updateSpaceById: (id: string, cells: Cell[]) => Promise<void>;
};

/**
 * 画布指针事件：按下、移动、释放、离开
 */
export function useFloorPlanPointerHandlers(params: UseFloorPlanPointerHandlersParams) {
	const {
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
	} = params;

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			setError("");
			if (e.button !== 0) return;

			const screen = getScreenXYFromClient(e.clientX, e.clientY);
			if (!screen) return;

			(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

			if (spaceRef.current) {
				dragStateRef.current = {
					...INITIAL_DRAG_STATE,
					mode: "pan",
					startScreenX: screen.screenX,
					startScreenY: screen.screenY,
					baseTranslateX: viewRef.current.translateX,
					baseTranslateY: viewRef.current.translateY,
					activated: true,
				};
				return;
			}

			const startCell = getCellFromScreen(screen.screenX, screen.screenY);
			const shift = e.shiftKey;
			const tool = toolModeRef.current;
			const canEdit = editModeRef.current || !persistCallbacks;

			if ((tool === "select" || tool === "deselect") && canEdit) {
				dragStateRef.current = {
					...INITIAL_DRAG_STATE,
					mode: "boxSelectCells",
					startScreenX: screen.screenX,
					startScreenY: screen.screenY,
					baseTranslateX: viewRef.current.translateX,
					baseTranslateY: viewRef.current.translateY,
					startCell,
					currentCell: startCell,
					shiftAtStart: true,
					boxSelectSubtract: tool === "deselect",
				};
				return;
			}

			if (shift && canEdit) {
				dragStateRef.current = {
					...INITIAL_DRAG_STATE,
					mode: "boxSelectCells",
					startScreenX: screen.screenX,
					startScreenY: screen.screenY,
					baseTranslateX: viewRef.current.translateX,
					baseTranslateY: viewRef.current.translateY,
					startCell,
					currentCell: startCell,
					shiftAtStart: true,
				};
				return;
			}

			const hitId = hitTestInnermostSpaceIdByCell(startCell);
			if (hitId) {
				const space = spacesRef.current.find((s) => s.id === hitId);
				dragStateRef.current = {
					...INITIAL_DRAG_STATE,
					mode: "moveShape",
					startScreenX: screen.screenX,
					startScreenY: screen.screenY,
					baseTranslateX: viewRef.current.translateX,
					baseTranslateY: viewRef.current.translateY,
					startCell,
					currentCell: startCell,
					spaceId: hitId,
					baseSpaceCells: space ? space.cells.map((c) => ({ ...c })) : null,
				};
				hoverSpaceIdRef.current = hitId;
				scheduleDraw();
				return;
			}

			if (!canEdit && persistCallbacks) {
				dragStateRef.current = {
					...INITIAL_DRAG_STATE,
					mode: "ignore",
					startScreenX: screen.screenX,
					startScreenY: screen.screenY,
					baseTranslateX: viewRef.current.translateX,
					baseTranslateY: viewRef.current.translateY,
					startCell,
					currentCell: startCell,
				};
				return;
			}

			dragStateRef.current = {
				...INITIAL_DRAG_STATE,
				mode: "boxSelectCells",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
			};
		},
		[
			getScreenXYFromClient,
			getCellFromScreen,
			viewRef,
			spaceRef,
			toolModeRef,
			editModeRef,
			dragStateRef,
			spacesRef,
			hoverSpaceIdRef,
			persistCallbacks,
			setError,
			hitTestInnermostSpaceIdByCell,
			scheduleDraw,
		]
	);

	const onPointerMove = useCallback(
		(e: React.PointerEvent) => {
			const state = dragStateRef.current;

			if (state.mode === "none") {
				const cell = getCellFromClient(e.clientX, e.clientY);
				const nextHoverId = cell ? hitTestInnermostSpaceIdByCell(cell) : null;
				if (hoverSpaceIdRef.current !== nextHoverId) {
					hoverSpaceIdRef.current = nextHoverId;
					scheduleDraw();
				}
				return;
			}

			const screen = getScreenXYFromClient(e.clientX, e.clientY);
			if (!screen) return;

			if (state.mode === "pan") {
				const deltaX = screen.screenX - state.startScreenX;
				const deltaY = screen.screenY - state.startScreenY;
				viewRef.current = {
					...viewRef.current,
					translateX: state.baseTranslateX + deltaX,
					translateY: state.baseTranslateY + deltaY,
				};
				scheduleDraw();
				return;
			}

			const deltaXPixels = screen.screenX - state.startScreenX;
			const deltaYPixels = screen.screenY - state.startScreenY;
			const distance = Math.hypot(deltaXPixels, deltaYPixels);
			if (!state.activated && distance >= DRAG_THRESHOLD_PX) state.activated = true;

			const currentCell = getCellFromScreen(screen.screenX, screen.screenY);
			state.currentCell = currentCell;

			if (
				state.mode === "moveShape" &&
				state.activated &&
				state.spaceId &&
				state.startCell &&
				state.baseSpaceCells &&
				editModeRef.current
			) {
				const deltaCellX = currentCell.x - state.startCell.x;
				const deltaCellY = currentCell.y - state.startCell.y;
				const movedCells = state.baseSpaceCells.map((cell) => ({
					x: cell.x + deltaCellX,
					y: cell.y + deltaCellY,
				}));
				updateSpaceById(state.spaceId, movedCells);
				hoverSpaceIdRef.current = state.spaceId;
				scheduleDraw();
				return;
			}

			if (state.mode === "boxSelectCells") {
				scheduleDraw();
			}
		},
		[
			getScreenXYFromClient,
			getCellFromScreen,
			getCellFromClient,
			viewRef,
			dragStateRef,
			hoverSpaceIdRef,
			editModeRef,
			scheduleDraw,
			hitTestInnermostSpaceIdByCell,
			updateSpaceById,
		]
	);

	const onPointerUp = useCallback(() => {
		const state = dragStateRef.current;
		if (state.mode === "none") return;
		if (state.mode === "ignore") {
			dragStateRef.current = { ...INITIAL_DRAG_STATE };
			return;
		}

		if (state.mode === "moveShape") {
			if (!state.activated && state.spaceId) {
				setSelectedSpaceId(state.spaceId);
				hoverSpaceIdRef.current = state.spaceId;
				persistCallbacks?.onSpaceSelect(state.spaceId);
			} else if (state.spaceId) {
				setSelectedSpaceId(state.spaceId);
			}
		} else if (state.mode === "boxSelectCells") {
			if (state.shiftAtStart && state.startCell) {
				if (!state.activated) {
					if (toolModeRef.current !== "select" && toolModeRef.current !== "deselect") {
						setSelectedSpaceId(null);
						toggleCell(state.startCell);
					}
				} else if (state.activated && state.currentCell) {
					const batch = buildCellsInRect(state.startCell, state.currentCell);
					if (state.boxSelectSubtract) {
						setSelected((prev) => subtractCells(prev, batch));
					} else {
						setSelected((prev) => unionCells(prev, batch));
					}
				}
			} else if (state.startCell) {
				if (!state.activated) {
					const hitId = hitTestInnermostSpaceIdByCell(state.startCell);
					if (hitId) {
						setSelectedSpaceId(hitId);
						hoverSpaceIdRef.current = hitId;
						persistCallbacks?.onSpaceSelect(hitId);
					} else {
						setSelectedSpaceId(null);
						hoverSpaceIdRef.current = null;
					}
				}
			}
		}

		dragStateRef.current = { ...INITIAL_DRAG_STATE };
		scheduleDraw();
	}, [
		dragStateRef,
		hoverSpaceIdRef,
		toolModeRef,
		persistCallbacks,
		setSelectedSpaceId,
		setSelected,
		toggleCell,
		hitTestInnermostSpaceIdByCell,
		scheduleDraw,
	]);

	const onPointerLeave = useCallback(() => {
		if (dragStateRef.current.mode === "none" && hoverSpaceIdRef.current !== null) {
			hoverSpaceIdRef.current = null;
			scheduleDraw();
		}
	}, [dragStateRef, hoverSpaceIdRef, scheduleDraw]);

	return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
}
