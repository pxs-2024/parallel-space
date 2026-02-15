"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Package, Plus, Trash2, ChevronDown } from "lucide-react";
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
import { Box, Clock, Link2 } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

type AssetItem = Prisma.AssetGetPayload<{
	select: {
		id: true;
		name: true;
		description: true;
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
	/** 打开时聚焦到此物品并打开详情 */
	focusAssetId?: string | null;
	otherSpaces?: OtherSpace[];
};

const KIND_ICONS = {
	CONSUMABLE: Package,
	TEMPORAL: Clock,
	VIRTUAL: Link2,
	STATIC: Box,
} as const;

const HEIGHT_MIN_VH = 25;
const HEIGHT_MAX_VH = 85;
const HEIGHT_DEFAULT_VH = 45;

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
	const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const drawerRef = useRef<HTMLDivElement>(null);
	const startYRef = useRef(0);
	const startHeightRef = useRef(0);
	const lastHeightVhRef = useRef(0);
	const t = useTranslations("drawer");

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startYRef.current = e.clientY;
		startHeightRef.current = heightVh;
		lastHeightVhRef.current = heightVh;
	}, [heightVh]);

	useEffect(() => {
		if (!isResizing) return;
		const onMove = (e: MouseEvent) => {
			const dy = startYRef.current - e.clientY;
			const vhPerPx = 100 / window.innerHeight;
			const next = Math.max(HEIGHT_MIN_VH, Math.min(HEIGHT_MAX_VH, startHeightRef.current + dy * vhPerPx));
			lastHeightVhRef.current = next;
			if (drawerRef.current) {
				drawerRef.current.style.height = `${next}vh`;
			}
		};
		const onUp = () => {
			setHeightVh(lastHeightVhRef.current);
			setIsResizing(false);
		};
		document.addEventListener("mousemove", onMove, { passive: true });
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isResizing]);

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
					"fixed inset-x-0 bottom-0 z-50 flex min-h-0 flex-col rounded-t-2xl border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out",
					open ? "translate-y-0" : "translate-y-full"
				)}
				style={{ height: `${heightVh}vh`, maxHeight: `${HEIGHT_MAX_VH}vh` }}
			>
				{/* 顶部：拖拽条 + 标题、新建、收起 */}
				<div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 pt-0 pb-2">
					<button
						type="button"
						onMouseDown={handleResizeStart}
						className={cn(
							"touch-none self-center rounded-full py-2 transition-colors hover:bg-muted/80 active:bg-muted",
							isResizing && "bg-muted"
						)}
						aria-label={t("resizeHandle")}
					>
						<span className="block h-1.5 w-12 rounded-full bg-muted-foreground/30" />
					</button>
					<div className="flex flex-wrap items-center justify-between gap-2">
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
								<ChevronDown className="size-4" />
								{t("collapse")}
							</Button>
						</div>
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
						<ul className="space-y-1" role="list">
							{assets.map((asset) => {
								const Icon = KIND_ICONS[asset.kind as keyof typeof KIND_ICONS] ?? Box;
								const secondary =
									asset.quantity != null
										? `${asset.quantity}${asset.unit ? ` ${asset.unit}` : ""}`
										: asset.state ?? "";
								return (
									<li key={asset.id}>
										<ContextMenu>
											<ContextMenuTrigger asChild>
												<button
													type="button"
													onClick={() => setSelectedAsset(asset)}
													className={cn(
														"flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/50",
														selectedAsset?.id === asset.id && "border-border bg-muted/50 ring-1 ring-primary/30"
													)}
												>
													<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
														<Icon className="size-4 text-muted-foreground" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="truncate font-medium text-foreground">{asset.name}</div>
														{secondary && (
															<div className="truncate text-xs text-muted-foreground">{secondary}</div>
														)}
													</div>
												</button>
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
