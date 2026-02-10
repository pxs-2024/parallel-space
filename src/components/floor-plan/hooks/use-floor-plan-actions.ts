"use client";

import { useCallback } from "react";
import type { Cell, Item, Space, FloorPlanPersistCallbacks } from "../types";
import {
	cellsToBorderSegments,
	clampCell,
	isConnected,
	isValidCell,
	keyOf,
	unionCells,
	subtractCells,
	buildCellsInRect,
} from "../utils";

type UseFloorPlanActionsParams = {
	spacesRef: React.MutableRefObject<Space[]>;
	spaceCellSetRef: React.MutableRefObject<Map<string, Set<string>>>;
	selectedRef: React.MutableRefObject<Cell[]>;
	selectedSpaceIdRef: React.MutableRefObject<string | null>;
	setSpaces: React.Dispatch<React.SetStateAction<Space[]>>;
	setSelected: React.Dispatch<React.SetStateAction<Cell[]>>;
	setItems: React.Dispatch<React.SetStateAction<Item[]>>;
	setError: React.Dispatch<React.SetStateAction<string>>;
	setSelectedSpaceId: React.Dispatch<React.SetStateAction<string | null>>;
	persistCallbacks: FloorPlanPersistCallbacks | null;
	scheduleDraw: () => void;
	hoverSpaceIdRef: React.MutableRefObject<string | null>;
};

/**
 * 平面图业务动作：选区、空间更新、物品、命中测试等
 */
export function useFloorPlanActions(params: UseFloorPlanActionsParams) {
	const {
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
	} = params;

	const hitTestInnermostSpaceIdByCell = useCallback((cell: Cell): string | null => {
		const clampedCell = clampCell(cell);
		const spaceList = spacesRef.current;
		if (!spaceList.length) return null;
		const map = spaceCellSetRef.current;
		const cellKey = `${clampedCell.x},${clampedCell.y}`;
		let bestId: string | null = null;
		let bestArea = Infinity;
		for (let i = spaceList.length - 1; i >= 0; i--) {
			const space = spaceList[i];
			const set = map.get(space.id);
			if (!set || !set.has(cellKey)) continue;
			const area = space.cells.length;
			if (area < bestArea) {
				bestArea = area;
				bestId = space.id;
			}
		}
		return bestId;
	}, [spacesRef, spaceCellSetRef]);

	const toggleCell = useCallback(
		(cell: Cell) => {
			const clampedCell = clampCell(cell);
			setError("");
			setSelected((prev) => {
				const key = keyOf(clampedCell);
				const has = prev.some((prevCell) => keyOf(prevCell) === key);
				return has ? prev.filter((prevCell) => keyOf(prevCell) !== key) : [...prev, clampedCell];
			});
		},
		[setError, setSelected]
	);

	const updateSpaceById = useCallback(
		async (id: string, nextCells: Cell[]) => {
			const clampedCells = nextCells.map(clampCell);
			if (persistCallbacks) {
				await persistCallbacks.onUpdate(id, clampedCells);
				return;
			}
			setSpaces((prev) =>
				prev.map((s) =>
					s.id === id
						? { ...s, cells: clampedCells, segs: cellsToBorderSegments(clampedCells) }
						: s
				)
			);
		},
		[persistCallbacks, setSpaces]
	);

	const confirm = useCallback(async () => {
		const currentSelection = selectedRef.current;
		const invalidCells = currentSelection.filter((cell) => !isValidCell(cell));
		if (invalidCells.length > 0) {
			setError("❌ 选中的区域超出画布范围");
			return;
		}
		if (!isConnected(currentSelection)) {
			setError("❌ 选中的区域必须连续");
			return;
		}
		const cells = currentSelection.map((c) => ({ ...c }));
		if (persistCallbacks) {
			const name = `空间-${spacesRef.current.length + 1}`;
			await persistCallbacks.onCreate(name, cells);
			setSelected([]);
			setError("");
			return;
		}
		const segs = cellsToBorderSegments(currentSelection);
		const id = `space-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const name = `空间-${spacesRef.current.length + 1}`;
		setSpaces((prev) => [...prev, { id, name, cells, segs }]);
		setSelected([]);
		setError("");
		setSelectedSpaceId(id);
	}, [
		selectedRef,
		spacesRef,
		persistCallbacks,
		setSelected,
		setError,
		setSpaces,
		setSelectedSpaceId,
	]);

	const clearSelected = useCallback(() => {
		setSelected([]);
		setError("");
	}, [setSelected, setError]);

	const clearSpaces = useCallback(() => {
		setSpaces([]);
		setItems([]);
		setError("");
		hoverSpaceIdRef.current = null;
		setSelectedSpaceId(null);
		scheduleDraw();
	}, [
		setSpaces,
		setItems,
		setError,
		setSelectedSpaceId,
		hoverSpaceIdRef,
		scheduleDraw,
	]);

	const updateSpaceName = useCallback((id: string, name: string) => {
		setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
	}, [setSpaces]);

	const addItem = useCallback(() => {
		const sid = selectedSpaceIdRef.current;
		if (!sid) return;
		const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		setItems((prev) => [...prev, { id: itemId, spaceId: sid, name: "未命名物品", quantity: 1 }]);
	}, [selectedSpaceIdRef, setItems]);

	const updateItem = useCallback(
		(itemId: string, patch: Partial<Pick<Item, "name" | "quantity">>) => {
			setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
		},
		[setItems]
	);

	const removeItem = useCallback(
		(itemId: string) => {
			setItems((prev) => prev.filter((i) => i.id !== itemId));
		},
		[setItems]
	);

	return {
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
	};
}
