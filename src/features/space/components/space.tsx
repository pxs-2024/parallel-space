"use client";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { DragEndEvent } from "@dnd-kit/core";
import { useState, useCallback, useTransition, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Viewport } from "@/components/space/types";
import { AssetCard } from "@/components/assets/assets-card";
import { AssetCardHorizontal } from "@/components/assets/asset-card-horizontal";
import { Button } from "@/components/ui/button";
import { useListenSpace } from "@/components/space/hooks/use-listen-space";
import { Prisma } from "@/generated/prisma/client";
import { updateAssetPositions } from "@/features/space/actions/update-asset-position";
import { deleteAsset } from "@/features/space/actions/delete-asset";
import { SpaceContextMenu, type SpaceMenuContext } from "@/features/space/components/space-context-menu";
import { CreateAssetDialog } from "@/features/space/components/create-asset-drawer";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { ListFiltersBar } from "@/features/space/components/list-filters-bar";
import { LayoutGrid, List, Move, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryStates } from "nuqs";
import { listSearchParsers, listSearchOptions } from "@/features/space/search-params";

type QueryAsset = Prisma.AssetGetPayload<{
	select: {
		id: true;
		name: true;
		description: true;
		x: true;
		y: true;
		width: true;
		height: true;
		cardColor: true;
		cardOpacity: true;
		kind: true;
		state: true;
		quantity: true;
		unit: true;
		reorderPoint: true;
		consumeIntervalDays: true;
		dueAt: true;
		lastDoneAt: true;
		nextDueAt: true;
		refUrl: true;
		expiresAt: true;
		createdAt: true;
	};
}>;

type SpaceProps = {
	spaceId: string;
	initialAssets: QueryAsset[];
};

const Space = ({spaceId, initialAssets}: SpaceProps) => {
	const router = useRouter();
	const [, startTransition] = useTransition();
	const { spaceDown } = useListenSpace();
	const [viewport, setViewport] = useState<Viewport>({
		vx: 0,
		vy: 0,
		scale: 1,
	});
	const [assets, setAssets] = useState<QueryAsset[]>(initialAssets);
	const [viewMode, setViewMode] = useState<"space" | "list">("list");
	const [isEditMode, setIsEditMode] = useState(false);
	const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
	const [selectedAsset, setSelectedAsset] = useState<QueryAsset | null>(null);
	const contentWrapperRef = useRef<HTMLDivElement>(null);

	const [listQuery] = useQueryStates(listSearchParsers, listSearchOptions);

	const listItems = useMemo(() => {
		const q = listQuery.q.trim().toLowerCase();
		let result = assets;
		if (q) {
			result = result.filter(
				(a) =>
					a.name.toLowerCase().includes(q) ||
					(a.description != null && String(a.description).toLowerCase().includes(q))
			);
		}
		if (listQuery.kind) {
			result = result.filter((a) => a.kind === listQuery.kind);
		}
		if (listQuery.state) {
			result = result.filter((a) => a.state === listQuery.state);
		}
		const { sort: sortField, order } = listQuery;
		result = [...result].sort((a, b) => {
			if (sortField === "createdAt") {
				const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return order === "asc" ? aT - bT : bT - aT;
			}
			let aVal: string | number | null = (a as unknown as Record<string, string | number | null>)[sortField] ?? null;
			let bVal: string | number | null = (b as unknown as Record<string, string | number | null>)[sortField] ?? null;
			if (aVal == null) aVal = "";
			if (bVal == null) bVal = "";
			if (typeof aVal === "number" && typeof bVal === "number") {
				return order === "asc" ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal);
			const bStr = String(bVal);
			const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
			return order === "asc" ? cmp : -cmp;
		});
		return result;
	}, [assets, listQuery]);

	useEffect(() => {
		setAssets(initialAssets);
	}, [initialAssets]);

	// 从列表「跳转到物品」后切换到空间模式并让该物品卡片居中靠左上
	useEffect(() => {
		if (viewMode !== "space" || !focusAssetId) return;
		const asset = assets.find((a) => a.id === focusAssetId);
		if (!asset) {
			setFocusAssetId(null);
			return;
		}
		const el = contentWrapperRef.current;
		if (!el) {
			setFocusAssetId(null);
			return;
		}
		const run = () => {
			const rect = el.getBoundingClientRect();
			const cardW = 160;
			const cardH = 160;
			const worldX = (asset.x ?? 0) + cardW / 2;
			const worldY = (asset.y ?? 0) + cardH / 2;
			const scale = 1;
			// 物品卡片中心对准视口中心偏左上（约 45% 40%）
			const targetScreenX = rect.width * 0.45;
			const targetScreenY = rect.height * 0.4;
			const vx = targetScreenX - worldX * scale;
			const vy = targetScreenY - worldY * scale;
			setViewport({ vx, vy, scale });
			setFocusAssetId(null);
		};
		const t = setTimeout(run, 50);
		return () => clearTimeout(t);
	}, [viewMode, focusAssetId, assets]);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null);
	const [menu, setMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
		context: SpaceMenuContext | null;
	}>({ open: false, x: 0, y: 0, context: null });

	const onDragEnd = useCallback(
		(e: DragEndEvent) => {
			const { active, delta } = e;
			const activeId = active?.id as string;
			const activeAsset = assets.find((a) => a.id === activeId);
			if (!activeAsset) return;

			const newX = (activeAsset.x ?? 0) + delta.x / viewport.scale;
			const newY = (activeAsset.y ?? 0) + delta.y / viewport.scale;

			setAssets((prev) =>
				prev.map((asset) =>
					asset.id === activeId ? { ...asset, x: newX, y: newY } : asset
				)
			);

			// 仅在编辑模式下允许拖拽，且只更新本地；保存由「保存」按钮统一写库
			if (!isEditMode) return;
		},
		[assets, viewport.scale, isEditMode]
	);

	const handleSavePositions = useCallback(async () => {
		const updates = assets.map((asset) => ({
			assetId: asset.id,
			x: asset.x ?? 0,
			y: asset.y ?? 0,
			width: asset.width ?? undefined,
			height: asset.height ?? undefined,
		}));
		await updateAssetPositions(spaceId, updates);
		setIsEditMode(false);
		router.refresh();
	}, [assets, spaceId, router]);

	const handleContextMenu = useCallback(
		(ctx: SpaceMenuContext, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setMenu({ open: true, x: e.clientX, y: e.clientY, context: ctx });
		},
		[]
	);

	const handleMenuClose = useCallback(() => {
		setMenu((m) => ({ ...m, open: false, context: null }));
	}, []);

	const handleGoToAssetInSpace = useCallback((assetId: string) => {
		setFocusAssetId(assetId);
		setViewMode("space");
		handleMenuClose();
	}, [handleMenuClose]);

	const handleCreateAsset = () => {
		setDrawerOpen(true);
	};

	const handleAssetCreated = () => {
		setCreatePosition(null); // 清除位置
		// 使用 startTransition 来刷新页面数据
		startTransition(() => {
			router.refresh();
		});
	};

	const handleDeleteAsset = async (assetId: string) => {
		const result = await deleteAsset(spaceId, assetId);
		if (result.status === "SUCCESS") {
			// 从本地 state 中移除
			setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
			// 刷新页面数据
			startTransition(() => {
				router.refresh();
			});
		}
	};

	const handleAssetContextMenu = useCallback(
		(assetId: string, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setMenu({ open: true, x: e.clientX, y: e.clientY, context: { type: "asset", assetId } });
		},
		[]
	);

	const handleRootContextMenu = useCallback(
		(e: React.MouseEvent) => {
			// 如果点击的是按钮、输入框等交互元素，不触发右键菜单
			const target = e.target as HTMLElement;
			if (
				target.tagName === "BUTTON" ||
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.closest("button") ||
				target.closest("input") ||
				target.closest("textarea")
			) {
				return;
			}
			// 如果点击的是已经有右键菜单处理的元素（物品等），不在这里处理
			if (target.closest('[data-context-menu-handled]')) {
				return;
			}
			
			// 将点击位置转换为画布坐标（世界坐标）
			// 需要找到 MainContainer 元素来获取其边界
			const container = target.closest('[data-main-container]') as HTMLElement;
			if (container) {
				const rect = container.getBoundingClientRect();
				const mx = e.clientX - rect.left; // 鼠标在容器内的X坐标
				const my = e.clientY - rect.top; // 鼠标在容器内的Y坐标
				
				// 转换为世界坐标
				const worldX = (mx - viewport.vx) / viewport.scale;
				const worldY = (my - viewport.vy) / viewport.scale;
				setCreatePosition({ x: worldX, y: worldY });
			}
			
			// 其他情况（空白区域）触发根级右键菜单
			handleContextMenu({ type: "root" }, e);
		},
		[handleContextMenu, viewport]
	);

	return (
		<>
			<div className="flex h-full flex-col">
				<div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-3 py-2">
					<div className="flex items-center gap-1">
						<Button
							variant={viewMode === "space" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("space")}
							className="gap-1.5"
						>
							<LayoutGrid className="size-4" />
							空间
						</Button>
						<Button
							variant={viewMode === "list" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("list")}
							className="gap-1.5"
						>
							<List className="size-4" />
							列表
						</Button>
					</div>
					{viewMode === "space" && (
						isEditMode ? (
							<Button
								variant="default"
								size="sm"
								onClick={handleSavePositions}
								className="gap-1.5"
							>
								<Save className="size-4" />
								保存
							</Button>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsEditMode(true)}
								className="gap-1.5"
							>
								<Move className="size-4" />
								移动
							</Button>
						)
					)}
				</div>
				<div ref={contentWrapperRef} className="min-h-0 flex-1 overflow-hidden">
					{viewMode === "space" ? (
						<MainContainer
							className={cn(
								"h-full transition-opacity duration-200",
								focusAssetId && "pointer-events-none opacity-0"
							)}
							onDragEnd={onDragEnd}
							viewport={viewport}
							onViewportChange={setViewport}
							onContextMenu={handleRootContextMenu}
							spaceDown={spaceDown}
						>
							{assets.map((asset) => (
								<DraggableWrap
									key={asset.id}
									position={{ id: asset.id, x: asset.x ?? 0, y: asset.y ?? 0 }}
									viewportScale={viewport.scale}
									onContextMenu={(e) => handleAssetContextMenu(asset.id, e)}
									disabled={!isEditMode || spaceDown}
								>
									{(dragHandleProps) => (
										<AssetCard
											asset={asset}
											canResize={isEditMode}
											dragHandleProps={dragHandleProps}
											onResizeEnd={(w, h) => {
												setAssets((prev) =>
													prev.map((a) =>
														a.id === asset.id ? { ...a, width: w, height: h } : a
													)
												);
											}}
											onCardClick={(a) => setSelectedAsset(a)}
										/>
									)}
								</DraggableWrap>
							))}
						</MainContainer>
					) : (
						<div className="flex h-full flex-col">
							<ListFiltersBar
								countSlot={
									<span className="text-muted-foreground text-sm">
										{listItems.length} / {assets.length}
									</span>
								}
							/>
							<div
								className="scrollbar-hide min-h-0 flex-1 overflow-auto p-4"
								onContextMenu={handleRootContextMenu}
							>
								<ul className="flex flex-col gap-2">
									{listItems.map((asset) => (
										<li key={asset.id}>
											<div
												data-context-menu-handled
												onContextMenu={(e) => handleAssetContextMenu(asset.id, e)}
											>
												<AssetCardHorizontal
												asset={asset}
												nameOnly
												onCardClick={(a) => setSelectedAsset(a)}
											/>
											</div>
										</li>
									))}
								</ul>
							</div>
						</div>
					)}
				</div>
			</div>
			<SpaceContextMenu
				open={menu.open}
				x={menu.x}
				y={menu.y}
				context={menu.context}
				onClose={handleMenuClose}
				onCreateAsset={handleCreateAsset}
				onDeleteAsset={handleDeleteAsset}
				onGoToAssetInSpace={handleGoToAssetInSpace}
			/>
			<CreateAssetDialog
				spaceId={spaceId}
				open={drawerOpen}
				onOpenChange={(open) => {
					setDrawerOpen(open);
					if (!open) {
						setCreatePosition(null); // 关闭时清除位置
					}
				}}
				onSuccess={handleAssetCreated}
				initialPosition={createPosition}
			/>
			<AssetDetailDrawer
				asset={selectedAsset}
				spaceId={spaceId}
				onClose={() => setSelectedAsset(null)}
				onUpdated={(patch) => {
					if (!selectedAsset) return;
					setAssets((prev) =>
						prev.map((a) =>
							a.id === selectedAsset.id ? { ...a, ...patch } : a
						)
					);
					setSelectedAsset((prev) => (prev ? { ...prev, ...patch } : null));
				}}
			/>
		</>
	)

}

export {Space}
