"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ArrowRightToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { SpaceAssetCard } from "@/features/space/components/space-asset-card";
import type { Prisma } from "@/generated/prisma/client";

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
		consumeAmountPerTime: true;
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

const DRAWER_MAX_HEIGHT = "min(80vh, 28rem)";

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
	const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(null);
	const drawerRef = useRef<HTMLDivElement>(null);
	const t = useTranslations("drawer");
	const tAsset = useTranslations("asset");

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
					"fixed left-0 right-0 bottom-0 z-50 flex min-h-0 flex-col rounded-t-2xl border-t border-x border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out",
					open ? "translate-y-0" : "translate-y-full"
				)}
				style={{ maxHeight: DRAWER_MAX_HEIGHT }}
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
							<ChevronUp className="size-4" />
							{t("collapse")}
						</Button>
					</div>
				</div>

				{/* 物品列表：flex-wrap 流式布局 */}
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
						<ul className="flex flex-wrap gap-2" role="list">
							{assets.map((asset) => {
								const isSelected = selectedAsset?.id === asset.id;
								return (
									<li key={asset.id} className="relative">
										<ContextMenu>
											<ContextMenuTrigger asChild>
												{/* 用 div 包裹卡片，确保右键 contextmenu 能正确触发（部分环境下 button 会拦截） */}
												<div className="inline-block w-full max-w-[14rem] rounded-xl">
													<SpaceAssetCard
														asset={asset}
														isSelected={isSelected}
														onClick={() => setSelectedAsset(asset)}
													/>
												</div>
											</ContextMenuTrigger>
											<ContextMenuContent>
												<ContextMenuSub>
													<ContextMenuSubTrigger>
														<ArrowRightToLine className="size-4" />
														{tAsset("moveToOtherSpace")}
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
													onClick={() => setPendingDeleteAssetId(asset.id)}
												>
													<Trash2 className="size-4" />
													{tAsset("deleteItem")}
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

			{spaceId && selectedAsset && (
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

			<Dialog open={pendingDeleteAssetId != null} onOpenChange={(open) => !open && setPendingDeleteAssetId(null)}>
				<DialogContent className="sm:max-w-md" showCloseButton>
					<DialogHeader>
						<DialogTitle>{t("confirmDeleteAssetTitle")}</DialogTitle>
						<DialogDescription>{t("confirmDeleteAssetDescription")}</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setPendingDeleteAssetId(null)}>
							{tAsset("cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (!pendingDeleteAssetId) return;
								await handleDeleteAsset(pendingDeleteAssetId);
								setPendingDeleteAssetId(null);
							}}
						>
							{tAsset("deleteItem")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
