"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Move, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { useListenSpace } from "@/components/space/hooks/use-listen-space";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { AssetCard } from "@/components/assets/assets-card";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { ArrowRightToLine, Trash2 } from "lucide-react";
import { getSpaceAssets } from "@/features/space/actions/get-space-assets";
import { updateAssetPositions } from "@/features/space/actions/update-asset-position";
import { moveAssetToSpace } from "@/features/space/actions/move-asset-to-space";
import { deleteAsset } from "@/features/space/actions/delete-asset";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Viewport } from "@/components/space/types";
import type { Prisma } from "@/generated/prisma/client";

const HEIGHT_MIN_VH = 25;
const HEIGHT_MAX_VH = 85;
const HEIGHT_DEFAULT_VH = 45;

type AssetItem = Prisma.AssetGetPayload<{
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

type OtherSpace = { id: string; name: string };

type SpaceAssetsDrawerProps = {
	spaceId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** 打开时聚焦到此物品：居中显示并打开详情 */
	focusAssetId?: string | null;
	/** 其他空间列表，用于「移动至」子菜单（不包含当前空间） */
	otherSpaces?: OtherSpace[];
};

export function SpaceAssetsDrawer({
	spaceId,
	open,
	onOpenChange,
	focusAssetId,
	otherSpaces = [],
}: SpaceAssetsDrawerProps) {
	const [heightVh, setHeightVh] = useState(HEIGHT_DEFAULT_VH);
	const [isResizing, setIsResizing] = useState(false);
	const [data, setData] = useState<{ spaceName: string; assets: AssetItem[] } | null>(null);
	const [assets, setAssets] = useState<AssetItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [viewport, setViewport] = useState<Viewport>({ vx: 0, vy: 0, scale: 1 });
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
	const { spaceDown } = useListenSpace();
	const startYRef = useRef(0);
	const startHeightRef = useRef(0);
	const contentWrapperRef = useRef<HTMLDivElement>(null);

	// 打开抽屉且 spaceId 存在时拉取该空间物品（含 x,y 用于空间视图）；切换空间或关闭时重置编辑状态
	useEffect(() => {
		if (!open || !spaceId) {
			setData(null);
			setAssets([]);
			setIsEditMode(false);
			setSelectedAsset(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setIsEditMode(false);
		getSpaceAssets(spaceId)
			.then((res) => {
				if (!cancelled && res) {
					setData(res);
					setAssets(res.assets);
				} else if (!cancelled) {
					setData(null);
					setAssets([]);
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, spaceId]);

	// 有 focusAssetId 时：居中显示该物品并打开详情
	useEffect(() => {
		if (!focusAssetId || !data || assets.length === 0) return;
		const asset = assets.find((a) => a.id === focusAssetId);
		if (!asset) return;
		const el = contentWrapperRef.current;
		if (!el) return;
		const run = () => {
			const rect = el.getBoundingClientRect();
			const cardW = 160;
			const cardH = 160;
			const worldX = (asset.x ?? 0) + cardW / 2;
			const worldY = (asset.y ?? 0) + cardH / 2;
			const scale = 1;
			const targetScreenX = rect.width * 0.5;
			const targetScreenY = rect.height * 0.5;
			const vx = targetScreenX - worldX * scale;
			const vy = targetScreenY - worldY * scale;
			setViewport({ vx, vy, scale });
			setSelectedAsset(asset);
		};
		const t = setTimeout(run, 100);
		return () => clearTimeout(t);
	}, [focusAssetId, data, assets]);

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startYRef.current = e.clientY;
		startHeightRef.current = heightVh;
	}, [heightVh]);

	useEffect(() => {
		if (!isResizing) return;
		const onMove = (e: MouseEvent) => {
			const dy = startYRef.current - e.clientY;
			const vhPerPx = 100 / window.innerHeight;
			let next = startHeightRef.current + dy * vhPerPx;
			next = Math.max(HEIGHT_MIN_VH, Math.min(HEIGHT_MAX_VH, next));
			setHeightVh(next);
		};
		const onUp = () => setIsResizing(false);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isResizing]);

	// 抽屉内右键空白不出现「新建物品」等，仅阻止冒泡与默认菜单
	const handleDrawerRootContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleMoveAssetToSpace = useCallback(
		async (assetId: string, toSpaceId: string) => {
			if (!spaceId) return;
			const res = await moveAssetToSpace(assetId, spaceId, toSpaceId);
			if (res.status === "SUCCESS") {
				setAssets((prev) => prev.filter((a) => a.id !== assetId));
				setSelectedAsset((prev) => (prev?.id === assetId ? null : prev));
			}
		},
		[spaceId]
	);

	const handleDeleteAsset = useCallback(
		async (assetId: string) => {
			if (!spaceId) return;
			const res = await deleteAsset(spaceId, assetId);
			if (res.status === "SUCCESS") {
				setAssets((prev) => prev.filter((a) => a.id !== assetId));
				setSelectedAsset((prev) => (prev?.id === assetId ? null : prev));
			}
		},
		[spaceId]
	);

	// 与详情页一致：仅编辑模式下拖拽生效，只更新本地；保存由「保存布局」按钮统一写库
	const onDragEnd = useCallback(
		(e: DragEndEvent) => {
			if (!isEditMode) return;
			const { active, delta } = e;
			const activeId = active?.id as string;
			const activeAsset = assets.find((a) => a.id === activeId);
			if (!activeAsset) return;

			const newX = (activeAsset.x ?? 0) + delta.x / viewport.scale;
			const newY = (activeAsset.y ?? 0) + delta.y / viewport.scale;

			setAssets((prev) =>
				prev.map((a) => (a.id === activeId ? { ...a, x: newX, y: newY } : a))
			);
		},
		[assets, viewport.scale, isEditMode]
	);

	const handleSavePositions = useCallback(async () => {
		if (!spaceId) return;
		const updates = assets.map((a) => ({
			assetId: a.id,
			x: a.x ?? 0,
			y: a.y ?? 0,
			width: a.width ?? undefined,
			height: a.height ?? undefined,
		}));
		await updateAssetPositions(spaceId, updates);
		setIsEditMode(false);
	}, [assets, spaceId]);

	return (
		<>
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/20"
					aria-hidden
					onClick={() => onOpenChange(false)}
				/>
			)}
			{/* 抽屉有多大，拖拽出来的高度就渲染多大；内容区为可拖拽的空间视图；relative 供详情面板固定在抽屉右上角 */}
			<div
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 flex min-h-0 flex-col rounded-t-2xl border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
					"transition-transform duration-300 ease-out",
					open ? "translate-y-0" : "translate-y-full"
				)}
				style={{
					height: `min(${heightVh}vh, ${HEIGHT_MAX_VH}vh)`,
					maxHeight: `${HEIGHT_MAX_VH}vh`,
				}}
			>
				{/* 顶部：拖拽条 + 修改布局/保存布局 + 标题 + 收起(右) */}
				<div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 pb-2 pt-2">
					<button
						type="button"
						onMouseDown={handleResizeStart}
						className={cn(
							"touch-none self-center rounded-full py-2 transition-colors",
							"hover:bg-muted/80 active:bg-muted",
							isResizing && "bg-muted"
						)}
						aria-label="拖动调整高度"
					>
						<span className="block h-1.5 w-12 rounded-full bg-muted-foreground/30" />
					</button>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<span className="truncate text-lg font-semibold">
								{data?.spaceName ?? (loading ? "加载中…" : "空间视图")}
							</span>
							{/* 靠着名字右侧，留一点 margin */}
							{data && assets.length > 0 && (isEditMode ? (
								<Button
									variant="default"
									size="sm"
									onClick={handleSavePositions}
									className="gap-1.5 shrink-0 ml-1"
								>
									<Save className="size-4" />
									保存布局
								</Button>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsEditMode(true)}
									className="gap-1.5 shrink-0 ml-1"
								>
									<Move className="size-4" />
									修改布局
								</Button>
							))}
						</div>
						<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1 shrink-0">
							<ChevronDown className="size-4" />
							收起
						</Button>
					</div>
				</div>
				{/* 空间视图：可拖拽画布，随抽屉高度填充；留外边距不贴边 */}
				<div
					ref={contentWrapperRef}
					className="min-h-0 flex-1 overflow-hidden p-3"
					style={{ minHeight: 0 }}
				>
					{loading && !data && (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							加载中…
						</div>
					)}
					{!loading && data && assets.length === 0 && (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							该空间暂无物品
						</div>
					)}
					{!loading && data && assets.length > 0 && (
						<div className="drawer-canvas-3d h-full w-full rounded-xl overflow-hidden border border-border/90 bg-background/40">
							<MainContainer
								className="h-full w-full rounded-xl border-0"
							onDragEnd={onDragEnd}
							viewport={viewport}
							onViewportChange={setViewport}
							onContextMenu={handleDrawerRootContextMenu}
							spaceDown={spaceDown}
						>
							{assets.map((asset) => (
								<DraggableWrap
									key={asset.id}
									position={{
										id: asset.id,
										x: asset.x ?? 0,
										y: asset.y ?? 0,
									}}
									viewportScale={viewport.scale}
									onContextMenu={() => {}}
									disabled={!isEditMode || spaceDown}
								>
									{(dragHandleProps) => (
										<ContextMenu>
											<ContextMenuTrigger asChild>
												<div data-context-menu-handled>
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
														onCardClick={!isEditMode ? (a) => setSelectedAsset(a) : undefined}
														isSelected={selectedAsset?.id === asset.id}
													/>
												</div>
											</ContextMenuTrigger>
											<ContextMenuContent>
												<ContextMenuSub>
													<ContextMenuSubTrigger>
														<ArrowRightToLine className="size-4" />
														移动至
													</ContextMenuSubTrigger>
													<ContextMenuSubContent>
														{otherSpaces.length === 0 ? (
															<ContextMenuItem disabled>暂无其他空间</ContextMenuItem>
														) : (
															otherSpaces.map((s) => (
																<ContextMenuItem
																	key={s.id}
																	onClick={() => handleMoveAssetToSpace(asset.id, s.id)}
																>
																	{s.name}
																</ContextMenuItem>
															))
														)}
													</ContextMenuSubContent>
												</ContextMenuSub>
												<ContextMenuSeparator />
												<ContextMenuItem
													variant="destructive"
													onClick={() => handleDeleteAsset(asset.id)}
												>
													<Trash2 className="size-4" />
													删除
												</ContextMenuItem>
											</ContextMenuContent>
										</ContextMenu>
									)}
								</DraggableWrap>
							))}
							</MainContainer>
						</div>
					)}
</div>
			</div>
			{spaceId && (
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
			)}
		</>
	);
}
