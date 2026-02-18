"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useQueryStates } from "nuqs";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { GlobalSearchFiltersBar } from "./global-search-filters-bar";
import { SpaceAssetCard } from "./space-asset-card";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	listSearchParsers,
	listSearchOptions,
	type ListSearchParams,
} from "../search-params";
import type { AssetWithSpace } from "../queries/get-all-spaces-assets";

const EMPTY_FILTERS: ListSearchParams = {
	q: "",
	kind: "",
	state: "",
	spaceId: "",
	page: 1,
	pageSize: 10,
	sort: "createdAt",
	order: "desc",
};

type SpaceItem = { id: string; name: string };

type GlobalAssetSearchPanelProps = {
	assets: AssetWithSpace[];
	spaces: SpaceItem[];
	onJumpToSpace?: (spaceId: string, assetId: string) => void;
	/** 提供时在面板右上角显示关闭按钮，用于收起搜索 */
	onClose?: () => void;
};

export function GlobalAssetSearchPanel({
	assets,
	spaces,
	onJumpToSpace,
	onClose,
}: GlobalAssetSearchPanelProps) {
	const t = useTranslations("search");
	const [appliedFilters, setQuery] = useQueryStates(
		listSearchParsers,
		listSearchOptions
	);
	const [draft, setDraft] = useState<ListSearchParams>(() => appliedFilters);
	const [selectedAsset, setSelectedAsset] = useState<AssetWithSpace | null>(
		null
	);

	// 初始加载或 URL 变化时同步 draft（如浏览器后退）
	useEffect(() => {
		setDraft(appliedFilters);
	}, [appliedFilters.q, appliedFilters.kind, appliedFilters.state, appliedFilters.spaceId, appliedFilters.sort, appliedFilters.order]);

	const handleSearch = useCallback(() => {
		setQuery({ ...draft, page: 1 });
	}, [draft, setQuery]);

	const handleReset = useCallback(() => {
		setDraft(EMPTY_FILTERS);
		setQuery(EMPTY_FILTERS);
	}, [setQuery]);

	const handleDraftChange = useCallback((patch: Partial<ListSearchParams>) => {
		setDraft((prev) => ({ ...prev, ...patch }));
	}, []);

	const listItems = useMemo(() => {
		const q = appliedFilters.q.trim().toLowerCase();
		let result = assets;
		if (q) {
			result = result.filter(
				(a) =>
					a.name.toLowerCase().includes(q) ||
					(a.description != null &&
						String(a.description).toLowerCase().includes(q)) ||
					a.spaceName.toLowerCase().includes(q)
			);
		}
		if (appliedFilters.spaceId) {
			result = result.filter((a) => a.spaceId === appliedFilters.spaceId);
		}
		if (appliedFilters.kind) {
			result = result.filter((a) => a.kind === appliedFilters.kind);
		}
		if (appliedFilters.state) {
			result = result.filter((a) => a.state === appliedFilters.state);
		}
		const { sort: sortField, order } = appliedFilters;
		result = [...result].sort((a, b) => {
			if (sortField === "createdAt") {
				const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return order === "asc" ? aT - bT : bT - aT;
			}
			let aVal: string | number | null =
				(a as unknown as Record<string, string | number | null>)[sortField] ??
				null;
			let bVal: string | number | null =
				(b as unknown as Record<string, string | number | null>)[sortField] ??
				null;
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
	}, [assets, appliedFilters]);

	const pageSize = Math.max(1, appliedFilters.pageSize ?? 10);
	const totalPages = Math.max(1, Math.ceil(listItems.length / pageSize));
	const page = Math.min(Math.max(1, appliedFilters.page ?? 1), totalPages);
	const startIdx = (page - 1) * pageSize;
	const paginatedItems = listItems.slice(startIdx, startIdx + pageSize);

	// 页码超出时重置
	useEffect(() => {
		if (totalPages >= 1 && page > totalPages) {
			setQuery({ page: 1 });
		}
	}, [totalPages, page, setQuery]);

	const handleCardClick = useCallback(
		(asset: { id: string }) => {
			const full = assets.find((a) => a.id === asset.id);
			if (full) setSelectedAsset(full);
		},
		[assets]
	);

	const handleJumpToSpace = useCallback(
		(asset: AssetWithSpace) => {
			onJumpToSpace?.(asset.spaceId, asset.id);
		},
		[onJumpToSpace]
	);

	const handleUpdated = useCallback(
		(patch: Partial<AssetWithSpace>) => {
			if (!selectedAsset) return;
			setSelectedAsset((prev) => (prev ? { ...prev, ...patch } : null));
		},
		[selectedAsset]
	);

	const goToPage = useCallback(
		(p: number) => {
			const next = Math.max(1, Math.min(p, totalPages));
			setQuery({ page: next });
		},
		[totalPages, setQuery]
	);

	return (
		<div className="flex min-h-0 w-80 shrink-0 max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-border bg-card/50 self-start shadow-sm" data-context-menu-handled>
			<GlobalSearchFiltersBar
				draft={draft}
				onDraftChange={handleDraftChange}
				onSearch={handleSearch}
				onReset={handleReset}
				spaces={spaces}
				rightSlot={onClose ? (
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 shrink-0"
						onClick={onClose}
						aria-label={t("close")}
					>
						<X className="size-4" />
					</Button>
				) : undefined}
			/>
			<div className="scrollbar-hide min-h-0 flex-1 overflow-auto p-4">
				<ul className="flex flex-col gap-2" role="list">
					{paginatedItems.map((asset) => (
						<li key={asset.id} className="w-full">
							<ContextMenu>
								<ContextMenuTrigger asChild>
									<SpaceAssetCard
										asset={asset}
										layout="horizontal"
										spaceName={asset.spaceName}
										showMoreIcon={false}
										onClick={() => handleCardClick(asset)}
										className="w-full"
									/>
								</ContextMenuTrigger>
								<ContextMenuContent className="min-w-40">
									<ContextMenuItem onClick={() => handleJumpToSpace(asset)}>
										<ExternalLink className="size-4 shrink-0" />
										{t("jumpToSpace")}
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						</li>
					))}
				</ul>
				{listItems.length === 0 && (
					<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
						{assets.length === 0 ? t("noAssets") : t("noMatch")}
					</div>
				)}
			</div>
			{/* 分页 + 页数显示：底部 */}
			<div className="flex shrink-0 flex-col items-center gap-2 border-t border-border bg-muted/20 px-4 py-3">
				<span className="text-muted-foreground text-xs">
					{listItems.length === 0
						? t("pageTotal", { total: 0 })
						: totalPages > 1
							? t("pageRange", {
									start: startIdx + 1,
									end: Math.min(startIdx + pageSize, listItems.length),
									total: listItems.length,
								})
							: t("pageTotal", { total: listItems.length })}
				</span>
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(page - 1)}
							disabled={page <= 1}
							className="h-8 w-8 p-0"
							aria-label={t("prevPage")}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<span className="min-w-24 text-center text-sm text-muted-foreground">
							{page} / {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(page + 1)}
							disabled={page >= totalPages}
							className="h-8 w-8 p-0"
							aria-label={t("nextPage")}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				)}
			</div>
			{selectedAsset && (
				<AssetDetailDrawer
					asset={selectedAsset}
					spaceId={selectedAsset.spaceId}
					onClose={() => setSelectedAsset(null)}
					onUpdated={handleUpdated}
				/>
			)}
		</div>
	);
}
