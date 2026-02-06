"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ChevronDown, ExternalLink, Move, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { spacePath } from "@/paths";
import { Button } from "@/components/ui/button";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { useListenSpace } from "@/components/space/hooks/use-listen-space";
import { AssetCard } from "@/components/assets/assets-card";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { getSpaceAssets } from "@/features/space/actions/get-space-assets";
import { updateAssetPositions } from "@/features/space/actions/update-asset-position";
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

type SpaceAssetsDrawerProps = {
	spaceId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function SpaceAssetsDrawer({
	spaceId,
	open,
	onOpenChange,
}: SpaceAssetsDrawerProps) {
	const router = useRouter();
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

	const goToSpace = useCallback(() => {
		if (spaceId) {
			onOpenChange(false);
			router.push(spacePath(spaceId));
		}
	}, [spaceId, onOpenChange, router]);

	// 与详情页一致：仅编辑模式下拖拽生效，只更新本地；保存由「保存」按钮统一写库
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
					"fixed inset-x-0 bottom-0 z-50 flex min-h-0 flex-col rounded-t-2xl border-t border-border bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
					"transition-transform duration-300 ease-out",
					open ? "translate-y-0" : "translate-y-full"
				)}
				style={{
					height: `min(${heightVh}vh, ${HEIGHT_MAX_VH}vh)`,
					maxHeight: `${HEIGHT_MAX_VH}vh`,
				}}
			>
				{/* 顶部：拖拽条 + 标题 + 进入空间 + 收起 */}
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
						<span className="truncate text-lg font-semibold">
							{data?.spaceName ?? (loading ? "加载中…" : "空间视图")}
						</span>
						<div className="flex items-center gap-2">
							{/* 与详情页一致：限制拖拽的按钮，默认不可拖拽，点「移动」后可拖拽，点「保存」写库并退出 */}
							{data && assets.length > 0 && (isEditMode ? (
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
							))}
							{spaceId && (
								<Button variant="outline" size="sm" onClick={goToSpace} className="gap-1">
									<ExternalLink className="size-4" />
									进入空间
								</Button>
							)}
							<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1">
								<ChevronDown className="size-4" />
								收起
							</Button>
						</div>
					</div>
				</div>
				{/* 空间视图：可拖拽画布，随抽屉高度填充 */}
				<div className="min-h-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
						<MainContainer
							className="h-full w-full"
							onDragEnd={onDragEnd}
							viewport={viewport}
							onViewportChange={setViewport}
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
