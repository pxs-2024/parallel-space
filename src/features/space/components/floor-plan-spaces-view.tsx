"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { deleteSpace } from "../actions/delete-space";
import { SpaceAssetsDrawer } from "./space-assets-drawer";
import { GlobalAssetSearchPanel } from "./global-asset-search-panel";
import type { AssetWithSpace } from "../queries/get-all-spaces-assets";
import { getAvatarGradient } from "../utils/avatar-gradient";

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
	const [spaceHover, setSpaceHover] = useState<{
		spaceId: string;
		x: number;
		y: number;
	} | null>(null);
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

	const spaceHoverAssets = useMemo(() => {
		if (!spaceHover) return [];
		return allAssets.filter((a) => a.spaceId === spaceHover.spaceId);
	}, [spaceHover, allAssets]);

	const spaceHoverSpace = useMemo(() => {
		if (!spaceHover) return null;
		return serverSpaces.find((s) => s.id === spaceHover.spaceId) ?? null;
	}, [spaceHover, serverSpaces]);

	const handleSpaceHover = useCallback(
		(spaceId: string | null, clientX: number, clientY: number) => {
			if (!spaceId) {
				setSpaceHover(null);
				return;
			}
			setSpaceHover({ spaceId, x: clientX, y: clientY + 12 });
		},
		[]
	);

	const onCreate = useCallback(async (name: string, cells: Cell[]) => {
		const res = await createSpaceFromFloorPlan(name, cells);
		if (res.ok) {
			router.refresh();
			setDrawerSpaceId(res.spaceId);
		} else if (res.error) toast.error(res.error);
	}, [router]);

	const onUpdate = useCallback(async (spaceId: string, cells: Cell[]) => {
		const res = await updateSpaceCells(spaceId, cells);
		if (res.ok) router.refresh();
		else if (res.error) toast.error(res.error);
	}, [router]);

	const onSpaceSelect = useCallback((spaceId: string) => {
		setDrawerSpaceId(spaceId);
		setFocusAssetId(null);
	}, []);

	const onApplyTemplate = useCallback(
		async (spaces: { name: string; description: string; cells: Cell[] }[]) => {
			for (const s of spaces) {
				const res = await createSpaceFromFloorPlan(s.name, s.cells, s.description);
				if (!res.ok) {
					toast.error(res.error ?? "创建失败");
					return;
				}
			}
			router.refresh();
		},
		[router]
	);

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
		canvasRef.current?.clearSelectedCells?.();
		router.refresh();
		setEditMode(false);
	}, [existingSpaceIds, onCreate, onUpdate, router]);

	const handleDeleteSpace = useCallback(
		async (spaceId: string) => {
			const res = await deleteSpace(spaceId);
			if (!res.ok) {
				if (res.error) toast.error(res.error);
				return;
			}
			toast.success("空间已删除");
			if (canvasRef.current?.clearSelectedCells) {
				canvasRef.current.clearSelectedCells();
			}
			router.refresh();
		},
		[router]
	);

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
					onSpaceHover={handleSpaceHover}
					onApplyTemplate={onApplyTemplate}
					onDeleteSpace={handleDeleteSpace}
				/>
				<Button
					type="button"
					variant={editMode ? "default" : "outline"}
					size="sm"
					onClick={() => (editMode ? onFinishEdit() : setEditMode(true))}
					className="absolute top-3 right-14 z-10 min-w-18 shadow-sm"
				>
					{editMode ? "完成" : "编辑"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className={cn(
						"absolute top-3 right-36 z-10 h-9 w-9 shadow-sm transition-opacity duration-200",
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
			{/* 平面图上空间 hover 时：鼠标下方悬浮框显示空间名称/描述、物品数量与简写头像（编辑状态下不展示） */}
			{spaceHover != null && !editMode && (
				<div
					className="pointer-events-none fixed z-50 max-w-72 rounded-lg border bg-popover px-4 py-3 text-popover-foreground shadow-md"
					style={{
						left: spaceHover.x,
						top: spaceHover.y,
						transform: "translateX(-50%)",
					}}
				>
					{spaceHoverSpace && (
						<>
							<p className="text-base font-medium text-foreground">
								{spaceHoverSpace.name}
							</p>
							{spaceHoverSpace.description ? (
								<p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
									{spaceHoverSpace.description}
								</p>
							) : null}
							<hr className="my-2 border-border" />
						</>
					)}
					<div className="text-sm font-medium text-muted-foreground">
						{spaceHoverAssets.length === 0
							? "暂无物品"
							: `共 ${spaceHoverAssets.length} 件物品`}
					</div>
					{spaceHoverAssets.length > 0 && (
						<div className="mt-2 flex flex-wrap items-center gap-1.5">
							{spaceHoverAssets.map((asset) => (
								<div
									key={asset.id}
									className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white shadow-sm"
									style={{ background: getAvatarGradient(asset.name) }}
									title={asset.name}
								>
									{asset.name.slice(0, 2) || "?"}
								</div>
							))}
						</div>
					)}
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
