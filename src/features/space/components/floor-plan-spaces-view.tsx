"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import {
	CanvasGridSelector,
	type CanvasGridSelectorHandle,
} from "@/components/floor-plan/canvas-grid-selector";
import type { Cell, Space } from "@/components/floor-plan/types";
import { cellsToBorderSegments } from "@/components/floor-plan/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createSpaceFromFloorPlan } from "../actions/create-space";
import { updateSpaceCells } from "../actions/update-space-cells";
import { updateSpaceInfoFromFloorPlan } from "../actions/update-space-info";
import { SpaceAssetsDrawer } from "./space-assets-drawer";
import { GlobalAssetSearchPanel } from "./global-asset-search-panel";
import type { AssetWithSpace } from "../queries/get-all-spaces-assets";

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
	allAssets: AssetWithSpace[];
};

export function FloorPlanSpacesView({ spaces: serverSpaces, allAssets }: FloorPlanSpacesViewProps) {
	const router = useRouter();
	const tFilters = useTranslations("filters");
	const canvasRef = useRef<CanvasGridSelectorHandle>(null);
	const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null);
	const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
	const [searchPanelOpen, setSearchPanelOpen] = useState(false);
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
		setFocusAssetId(null);
	}, []);

	const handleJumpToSpace = useCallback((spaceId: string, assetId: string) => {
		setDrawerSpaceId(spaceId);
		setFocusAssetId(assetId);
		setSearchPanelOpen(false);
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

	const spaceOptions = useMemo(
		() => serverSpaces.map((s) => ({ id: s.id, name: s.name })),
		[serverSpaces]
	);

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
					className={`absolute top-3 z-10 shadow-sm ${editMode ? "right-14" : "right-3"}`}
				>
					{editMode ? "完成" : "编辑"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className={cn(
						"absolute top-3 z-10 h-9 w-9 shadow-sm transition-all duration-200",
						editMode ? "right-24" : "right-12",
						searchPanelOpen && "pointer-events-none scale-90 opacity-0"
					)}
					onClick={() => setSearchPanelOpen(true)}
					aria-label={tFilters("search")}
				>
					<Search className="size-4" />
				</Button>
			</div>
			{/* 搜索面板与抽屉同级，fixed 定位 + z-[60]，避免被抽屉挡住 */}
			{searchPanelOpen && (
				<div className="fixed top-16 right-0 bottom-0 z-[60] flex flex-col">
					<GlobalAssetSearchPanel
						assets={allAssets}
						spaces={spaceOptions}
						onJumpToSpace={handleJumpToSpace}
						onClose={() => setSearchPanelOpen(false)}
					/>
				</div>
			)}
			<SpaceAssetsDrawer
				spaceId={drawerSpaceId}
				open={drawerSpaceId != null}
				onOpenChange={(open) => {
					if (!open) {
						setDrawerSpaceId(null);
						setFocusAssetId(null);
					}
				}}
				focusAssetId={focusAssetId}
				otherSpaces={otherSpaces}
			/>
		</>
	);
}
