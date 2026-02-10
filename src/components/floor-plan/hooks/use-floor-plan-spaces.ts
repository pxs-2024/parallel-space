"use client";

import { useEffect, useRef, useState } from "react";
import type { Cell, Item, Space } from "../types";

/**
 * 管理平面图空间、选区、物品、错误与选中空间 ID 的状态与 ref 同步
 */
export function useFloorPlanSpaces(initialSpaces: Space[] | null) {
	const [spaces, setSpaces] = useState<Space[]>(initialSpaces ?? []);
	const [selected, setSelected] = useState<Cell[]>([]);
	const [items, setItems] = useState<Item[]>([]);
	const [error, setError] = useState("");
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

	const selectedRef = useRef<Cell[]>([]);
	const spacesRef = useRef<Space[]>([]);
	const selectedSpaceIdRef = useRef<string | null>(null);
	const spaceCellSetRef = useRef<Map<string, Set<string>>>(new Map());

	selectedRef.current = selected;
	spacesRef.current = spaces;
	selectedSpaceIdRef.current = selectedSpaceId;

	// 持久化模式：仅当 initialSpaces 内容变化时同步
	useEffect(() => {
		if (initialSpaces == null) return;
		if (initialSpaces.length === 0) {
			setSpaces([]);
			return;
		}
		setSpaces((prev) => {
			if (prev.length !== initialSpaces.length) return initialSpaces;
			const prevKey = prev.map((s) => s.id).join(",");
			const nextKey = initialSpaces.map((s) => s.id).join(",");
			return prevKey === nextKey ? prev : initialSpaces;
		});
	}, [initialSpaces]);

	// 空间 cells 变更时更新 cellSet，供命中测试使用
	useEffect(() => {
		const map = new Map<string, Set<string>>();
		for (const space of spaces) {
			map.set(space.id, new Set(space.cells.map((cell) => `${cell.x},${cell.y}`)));
		}
		spaceCellSetRef.current = map;
	}, [spaces]);

	return {
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
	};
}
