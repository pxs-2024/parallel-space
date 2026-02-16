"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	CanvasGridSelector,
	type CanvasGridSelectorHandle,
} from "@/components/floor-plan/canvas-grid-selector";
import type { Cell, Space } from "@/components/floor-plan/types";
import { cellsToBorderSegments } from "@/components/floor-plan/utils";
import { Button } from "@/components/ui/button";
import { createSpaceFromFloorPlan } from "../actions/create-space";
import { updateSpaceCells } from "../actions/update-space-cells";
import { updateSpaceInfoFromFloorPlan } from "../actions/update-space-info";
import { SpaceAssetsDrawer } from "./space-assets-drawer";
export type SpaceForFloorPlan = {
	id: string;
	name: string;
	description: string;
	cells: unknown;
};

function toFloorPlanSpaces(rows: SpaceForFloorPlan[]): Space[] {
	return rows.map((s) => {
		const cells: Cell[] = Array.isArray(s.cells)
			? (s.cells as { x: number; y: number }[]).filter(
					(c): c is Cell => typeof c?.x === "number" && typeof c?.y === "number"
				)
			: [];
		const segs = cells.length ? cellsToBorderSegments(cells) : [];
		return { id: s.id, name: s.name, cells, segs };
	});
}

type FloorPlanSpacesViewProps = {
	spaces: SpaceForFloorPlan[];
};

export function FloorPlanSpacesView({ spaces: serverSpaces }: FloorPlanSpacesViewProps) {
	const router = useRouter();
	const canvasRef = useRef<CanvasGridSelectorHandle>(null);
	const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null);
	const [editMode, setEditMode] = useState(false);
	const existingSpaceIds = useMemo(
		() => new Set(serverSpaces.map((s) => s.id)),
		[serverSpaces]
	);

	const initialSpaces = useMemo(
		() => toFloorPlanSpaces(serverSpaces),
		[serverSpaces]
	);

	const otherSpaces = useMemo(
		() =>
			serverSpaces
				.filter((s) => s.id !== drawerSpaceId)
				.map((s) => ({ id: s.id, name: s.name })),
		[serverSpaces, drawerSpaceId]
	);

	const onCreate = useCallback(async (name: string, cells: Cell[]) => {
		const res = await createSpaceFromFloorPlan(name, cells);
		if (res.ok) {
			router.refresh();
			setDrawerSpaceId(res.spaceId);
		}
	}, [router]);

	const onUpdate = useCallback(async (spaceId: string, cells: Cell[]) => {
		const res = await updateSpaceCells(spaceId, cells);
		if (res.ok) router.refresh();
	}, [router]);

	const onSpaceSelect = useCallback((spaceId: string) => {
		setDrawerSpaceId(spaceId);
	}, []);

	const onFinishEdit = useCallback(async () => {
		const updatedIds = canvasRef.current?.getUpdatedSpaceIds() ?? [];
		const createdIds = canvasRef.current?.getCreatedSpaceIds() ?? [];
		const editedInfoIds = canvasRef.current?.getEditedInfoSpaceIds() ?? [];
		const spaces = canvasRef.current?.getSpaces() ?? [];
		const spaceMap = new Map(spaces.map((s) => [s.id, s]));
		await Promise.all([
			...updatedIds
				.filter((id) => spaceMap.has(id) && existingSpaceIds.has(id))
				.map((id) => onUpdate(id, spaceMap.get(id)!.cells)),
			...createdIds
				.filter((id) => spaceMap.has(id) && !existingSpaceIds.has(id))
				.map((id) => {
					const space = spaceMap.get(id)!;
					return onCreate(space.name, space.cells);
				}),
			...editedInfoIds
				.filter((id) => spaceMap.has(id) && existingSpaceIds.has(id))
				.map((id) => {
					const space = spaceMap.get(id)!;
					return updateSpaceInfoFromFloorPlan(id, space.name, space.description ?? "");
				}),
		]);
		router.refresh();
		setEditMode(false);
	}, [existingSpaceIds, onCreate, onUpdate, router]);

	return (
		<>
			<div className="relative flex flex-col flex-1 min-h-0">
				<CanvasGridSelector
					ref={canvasRef}
					initialSpaces={initialSpaces}
					editMode={editMode}
					onSpaceSelect={onSpaceSelect}
				/>
				<Button
					type="button"
					variant={editMode ? "default" : "outline"}
					size="sm"
					onClick={() => (editMode ? onFinishEdit() : setEditMode(true))}
					className={`absolute top-3 z-10 shadow-sm ${editMode ? "right-[12.75rem]" : "right-3"}`}
				>
					{editMode ? "完成" : "编辑"}
				</Button>
			</div>
			<SpaceAssetsDrawer
				spaceId={drawerSpaceId}
				open={drawerSpaceId != null}
				onOpenChange={(open) => {
					if (!open) {
						setDrawerSpaceId(null);
					}
				}}
				otherSpaces={otherSpaces}
			/>
		</>
	);
}
