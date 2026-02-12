"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	CanvasGridSelector,
} from "@/components/floor-plan/canvas-grid-selector";
import type { Cell, Space } from "@/components/floor-plan/types";
import { cellsToBorderSegments } from "@/components/floor-plan/utils";
import { Button } from "@/components/ui/button";
import { createSpaceFromFloorPlan } from "../actions/create-space";
import { updateSpaceCells } from "../actions/update-space-cells";
import { SpaceAssetsDrawer } from "./space-assets-drawer";

export type SpaceForFloorPlan = {
	id: string;
	name: string;
	description: string;
	order: number;
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
	const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null);
	const [editMode, setEditMode] = useState(false);

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

	const persistCallbacks = useMemo<FloorPlanPersistCallbacks>(
		() => ({ onCreate, onUpdate, onSpaceSelect }),
		[onCreate, onUpdate, onSpaceSelect]
	);

	return (
		<>
			<div className="relative flex flex-col flex-1 min-h-0">
				<CanvasGridSelector
					initialSpaces={initialSpaces}
					// persistCallbacks={persistCallbacks}
					noItems
					editMode={editMode}
				/>
				<Button
					type="button"
					variant={editMode ? "default" : "outline"}
					size="sm"
					onClick={() => setEditMode((v) => !v)}
					className={`absolute top-3 z-10 shadow-sm ${editMode ? "right-[12.75rem]" : "right-3"}`}
				>
					{editMode ? "完成" : "编辑"}
				</Button>
			</div>
			{/* <SpaceAssetsDrawer
				spaceId={drawerSpaceId}
				open={drawerSpaceId != null}
				onOpenChange={(open) => {
					if (!open) {
						setDrawerSpaceId(null);
					}
				}}
				otherSpaces={otherSpaces}
			/> */}
		</>
	);
}
