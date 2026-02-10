"use client";

import { useEffect, useRef, useState } from "react";
import type { DragState } from "../types";
import { INITIAL_DRAG_STATE } from "../types";

export type ToolMode = "select" | "deselect" | null;

/**
 * 工具模式（选择/取消）与拖拽/悬停状态 ref
 */
export function useFloorPlanToolDrag(editMode: boolean) {
	const [toolMode, setToolMode] = useState<ToolMode>(null);
	const toolModeRef = useRef<ToolMode>(null);
	toolModeRef.current = toolMode;

	const editModeRef = useRef(editMode);
	editModeRef.current = editMode;

	const dragStateRef = useRef<DragState>({ ...INITIAL_DRAG_STATE });
	const hoverSpaceIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!editMode) setToolMode(null);
	}, [editMode]);

	return {
		toolMode,
		setToolMode,
		toolModeRef,
		editModeRef,
		dragStateRef,
		hoverSpaceIdRef,
	};
}
