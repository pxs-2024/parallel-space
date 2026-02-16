"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Package, Plus, Trash2, ChevronRight, Box, Clock, MoreVertical } from "lucide-react";
import { ArrowRightToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { getSpaceAssets } from "@/features/space/actions/get-space-assets";
import { moveAssetToSpace } from "@/features/space/actions/move-asset-to-space";
import { deleteAsset } from "@/features/space/actions/delete-asset";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { CreateAssetDialog } from "@/features/space/components/create-asset-drawer";
import type { Prisma } from "@/generated/prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysUntilDue(nextDueAt: Date | null, dueAt: Date | null): number | null {
	const due = nextDueAt ?? dueAt;
	if (!due) return null;
	const dueMs = new Date(due).getTime();
	const diff = dueMs - Date.now();
	if (diff <= 0) return null;
	return Math.ceil(diff / MS_PER_DAY);
}

function consumableProgress(quantity: number | null, reorderPoint: number | null): number {
	if (reorderPoint == null || reorderPoint <= 0) return 0;
	const q = quantity ?? 0;
	return Math.min(1, q / reorderPoint);
}

type AssetItem = Prisma.AssetGetPayload<{
	select: {
		id: true;
		name: true;
		description: true;
		kind: true;
		state: true;
		quantity: true;
		unit: true;
		reorderPoint: true;
		consumeIntervalDays: true;
		dueAt: true;
		lastDoneAt: true;
		nextDueAt: true;
		createdAt: true;
	};
}>;

type OtherSpace = { id: string; name: string };

type SpaceAssetsDrawerProps = {
	spaceId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** 打开时聚焦到此物品并打开详情 */
	focusAssetId?: string | null;
	otherSpaces?: OtherSpace[];
};

const KIND_ICONS = {
	CONSUMABLE: Package,
	TEMPORAL: Clock,
	STATIC: Box,
} as const;

const DRAWER_WIDTH = "min(28rem, 90vw)";

export function SpaceAssetsDrawer({
	spaceId,
	open,
	onOpenChange,
	focusAssetId,
	otherSpaces = [],
}: SpaceAssetsDrawerProps) {
	const [data, setData] = useState<{ spaceName: string; assets: AssetItem[] } | null>(null);
	const [assets, setAssets] = useState<AssetItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const drawerRef = useRef<HTMLDivElement>(null);
	const t = useTranslations("drawer");

	useEffect(() => {
		if (!open || !spaceId) {
			setData(null);
			setAssets([]);
			setSelectedAsset(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
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

	useEffect(() => {
		if (!focusAssetId || !data || assets.length === 0) return;
		const asset = assets.find((a) => a.id === focusAssetId);
		if (asset) setSelectedAsset(asset);
	}, [focusAssetId, data, assets]);

	const handleMoveAssetToSpace = useCallback(
		async (assetId: string, toSpaceId: string) => {
			if (!spaceId) return;
			const res = await moveAssetToSpace(assetId, spaceId, toSpaceId);
			if (res.status === "SUCCESS") {
				toast.success(res.message);
				setAssets((prev) => prev.filter((a) => a.id !== assetId));
				setSelectedAsset((prev) => (prev?.id === assetId ? null : prev));
			} else if (res.message) {
				toast.error(res.message);
			}
		},
		[spaceId]
	);

	const handleDeleteAsset = useCallback(
		async (assetId: string) => {
			if (!spaceId) return;
			const res = await deleteAsset(spaceId, assetId);
			if (res.status === "SUCCESS") {
				toast.success(res.message);
				setAssets((prev) => prev.filter((a) => a.id !== assetId));
				setSelectedAsset((prev) => (prev?.id === assetId ? null : prev));
			} else if (res.message) {
				toast.error(res.message);
			}
		},
		[spaceId]
	);

	const handleCreateAssetSuccess = useCallback(() => {
		if (!spaceId) return;
		getSpaceAssets(spaceId).then((res) => {
			if (res) {
				setData(res);
				setAssets(res.assets);
			}
		});
	}, [spaceId]);

	return (
		<>
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/20"
					aria-hidden
					onClick={() => onOpenChange(false)}
				/>
			)}
			<div
				ref={drawerRef}
				className={cn(
					"fixed right-0 top-16 bottom-0 z-50 flex min-h-0 flex-col rounded-l-2xl border-l border-t border-b border-border bg-background/95 backdrop-blur-sm shadow-[-8px_0_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out",
					open ? "translate-x-0" : "translate-x-full"
				)}
				style={{ width: DRAWER_WIDTH }}
			>
				{/* 标题区：空间名 + 新建、收起 */}
				<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
					<span className="truncate text-lg font-semibold">
						{data?.spaceName ?? (loading ? t("loading") : t("spaceView"))}
					</span>
					<div className="flex shrink-0 items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => setCreateDialogOpen(true)}
						>
							<Plus className="size-4" />
							{t("newAsset")}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="gap-1"
							aria-label={t("collapse")}
						>
							<ChevronRight className="size-4" />
							{t("collapse")}
						</Button>
					</div>
				</div>

				{/* 物品列表 */}
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{loading && !data && (
						<div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
							{t("loading")}
						</div>
					)}
					{!loading && data && assets.length === 0 && (
						<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground text-sm">
							{t("noAssets")}
							<Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
								<Plus className="size-4" />
								{t("newAsset")}
							</Button>
						</div>
					)}
					{!loading && data && assets.length > 0 && (
						<ul className="space-y-2" role="list">
							{assets.map((asset) => {
								const days = asset.kind === "TEMPORAL" ? daysUntilDue(asset.nextDueAt, asset.dueAt) : null;
								const progress = asset.kind === "CONSUMABLE" ? consumableProgress(asset.quantity, asset.reorderPoint) : 0;
								const isSelected = selectedAsset?.id === asset.id;
								const cardButton = (
												<button
													type="button"
													onClick={() => setSelectedAsset(asset)}
													className={cn(
														"flex w-full flex-col rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30",
														isSelected && "border-primary/50 ring-1 ring-primary/30 bg-muted/50"
													)}
												>
													{/* 顶部：图标区 + 更多 */}
													<div className="flex items-start gap-2">
														<div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
															{asset.kind === "TEMPORAL" ? (
																<span className="flex flex-col items-center justify-center px-1 py-0.5 text-center">
																	<Clock className="size-4 text-muted-foreground" />
																	<span className="text-[10px] font-medium leading-tight text-foreground">
																		{days != null ? `${days}天` : "已到期"}
																	</span>
																</span>
															) : asset.kind === "CONSUMABLE" ? (
																<div className="relative flex size-full items-center justify-center">
																	<svg className="size-8 -rotate-90" viewBox="0 0 32 32">
																		<circle cx="16" cy="16" r="14" className="fill-none stroke-muted-foreground/20 stroke-2" />
																		<circle
																			cx="16"
																			cy="16"
																			r="14"
																			className="fill-none stroke-primary stroke-2 transition-all"
																			strokeDasharray={88}
																			strokeDashoffset={88 - 88 * progress}
																		/>
																	</svg>
																	<span className="absolute text-[10px] font-semibold text-foreground">
																		{Math.round(progress * 100)}%
																	</span>
																</div>
															) : (
																<Box className="size-5 text-muted-foreground" />
															)}
														</div>
														<div className="min-w-0 flex-1" />
														<span className="shrink-0 text-muted-foreground" aria-hidden>
															<MoreVertical className="size-4" />
														</span>
													</div>
													{/* 主标题 */}
													<div className="mt-1.5 truncate font-semibold text-foreground">
														{asset.name}
													</div>
													{/* 次要信息：数量/补货线；时间型显示到期日 */}
													<div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
														{asset.quantity != null && (
															<div className="truncate">
																数量 {asset.quantity}{asset.unit ? ` ${asset.unit}` : ""}
																{asset.reorderPoint != null && asset.kind === "CONSUMABLE" && (
																	<span> · 补货线 {asset.reorderPoint}</span>
																)}
															</div>
														)}
														{(asset.nextDueAt || asset.dueAt) && asset.kind === "TEMPORAL" && (
															<div className="truncate">
																到期 {new Date(asset.nextDueAt ?? asset.dueAt!).toLocaleDateString("zh-CN")}
															</div>
														)}
													</div>
												</button>
								);
								return (
									<li key={asset.id}>
										<ContextMenu>
											<ContextMenuTrigger asChild>
												{cardButton}
											</ContextMenuTrigger>
											<ContextMenuContent>
												<ContextMenuSub>
													<ContextMenuSubTrigger>
														<ArrowRightToLine className="size-4" />
														{t("moveTo")}
													</ContextMenuSubTrigger>
													<ContextMenuSubContent>
														{otherSpaces.length === 0 ? (
															<ContextMenuItem disabled>{t("noOtherSpaces")}</ContextMenuItem>
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
													{t("delete")}
												</ContextMenuItem>
											</ContextMenuContent>
										</ContextMenu>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>

			{spaceId && (
				<CreateAssetDialog
					spaceId={spaceId}
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					onSuccess={handleCreateAssetSuccess}
				/>
			)}

			{spaceId && (
				<AssetDetailDrawer
					asset={selectedAsset}
					spaceId={spaceId}
					onClose={() => setSelectedAsset(null)}
					onUpdated={(patch) => {
						if (!selectedAsset) return;
						setAssets((prev) =>
							prev.map((a) => (a.id === selectedAsset.id ? { ...a, ...patch } : a))
						);
						setSelectedAsset((prev) => (prev ? { ...prev, ...patch } : null));
					}}
				/>
			)}
		</>
	);
}
