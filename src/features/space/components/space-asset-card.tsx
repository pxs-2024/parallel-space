"use client";

import * as React from "react";
import { Box, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysUntilDue(nextDueAt: Date | null, dueAt: Date | null): number | null {
	console.log("nextDueAt", nextDueAt);
	console.log("dueAt", dueAt);
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

const KIND_ICONS = {
	CONSUMABLE: Package,
	TEMPORAL: Clock,
	STATIC: Box,
} as const;

/** 抽屉/搜索列表共用的物品卡所需字段 */
export type SpaceAssetCardAsset = {
	id: string;
	name: string;
	kind: "STATIC" | "CONSUMABLE" | "TEMPORAL";
	state: string;
	quantity: number | null;
	unit: string | null;
	reorderPoint: number | null;
	dueAt: Date | null;
	nextDueAt: Date | null;
};

type SpaceAssetCardProps = {
	asset: SpaceAssetCardAsset;
	/** 是否选中（抽屉内高亮） */
	isSelected?: boolean;
	/** 点击整卡 */
	onClick?: () => void;
	/** 展示空间位置（搜索列表时传入，显示「空间 xxx」） */
	spaceName?: string | null;
	/** 搜索列表用：左右布局、占满整列 */
	layout?: "grid" | "horizontal";
	className?: string;
};

/**
 * 与下拉抽屉一致的物品卡，用于抽屉与搜索列表。
 * 固定高度 h-28，展示图标区、名称、数量/到期，可选展示空间位置。
 * 支持 ref，可被 ContextMenuTrigger asChild 包裹。
 */
/** 时间型 7 天内或已到期视为需警示 */
const TEMPORAL_WARN_DAYS = 7;

export const SpaceAssetCard = React.forwardRef<HTMLButtonElement, SpaceAssetCardProps>(function SpaceAssetCard(
	{
		asset,
		isSelected = false,
		onClick,
		spaceName,
		layout = "grid",
		className,
	},
	ref
) {
	const days = asset.kind === "TEMPORAL" ? daysUntilDue(asset.nextDueAt, asset.dueAt) : null;
	const progress = asset.kind === "CONSUMABLE" ? consumableProgress(asset.quantity, asset.reorderPoint) : 0;
	const isConsumableWarn = asset.kind === "CONSUMABLE" && asset.reorderPoint != null && asset.reorderPoint > 0 && (asset.quantity ?? 0) < asset.reorderPoint;
	const isTemporalWarn = asset.kind === "TEMPORAL" && (days == null || days <= TEMPORAL_WARN_DAYS);

	const iconArea = (
		<div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
			{asset.kind === "TEMPORAL" ? (
				<span className={cn("flex flex-col items-center justify-center px-1 py-0.5 text-center", isTemporalWarn && "text-destructive")}>
					<Clock className={cn("size-4", isTemporalWarn ? "text-destructive" : "text-muted-foreground")} />
					<span className="text-[10px] font-medium leading-tight">
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
							className={cn(
								"fill-none stroke-2 transition-all",
								isConsumableWarn ? "stroke-destructive" : "stroke-primary"
							)}
							strokeDasharray={88}
							strokeDashoffset={88 - 88 * progress}
						/>
					</svg>
					<span className={cn("absolute text-[10px] font-semibold", isConsumableWarn ? "text-destructive" : "text-foreground")}>
						{Math.round(progress * 100)}%
					</span>
				</div>
			) : (
				<Box className="size-5 text-muted-foreground" />
			)}
		</div>
	);

	const titleEl = (
		<div className="line-clamp-2 font-semibold text-foreground wrap-break-word">
			{asset.name}
		</div>
	);

	const secondaryEl = (
		<div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
			{spaceName != null && spaceName !== "" && (
				<div className="truncate" title={spaceName}>
					空间 {spaceName}
				</div>
			)}
			{asset.quantity != null && (
				<div className="truncate">
					数量 {asset.quantity}{asset.unit ? ` ${asset.unit}` : ""}
					{asset.reorderPoint != null && asset.kind === "CONSUMABLE" && (
						<span> · 补货线 {asset.reorderPoint}</span>
					)}
				</div>
			)}
			{(asset.nextDueAt || asset.dueAt) && asset.kind === "TEMPORAL" && (
				<div className={cn("truncate", isTemporalWarn && "text-destructive")}>
					到期 {new Date(asset.nextDueAt ?? asset.dueAt!).toLocaleDateString("zh-CN")}
				</div>
			)}
		</div>
	);

	const isHorizontal = layout === "horizontal";

	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30",
				isHorizontal ? "h-auto min-h-16 flex-row items-center gap-3" : "h-28 min-w-40 max-w-56 flex-col",
				isSelected && "border-primary/50 ring-1 ring-primary/30 bg-muted/50",
				className
			)}
		>
			{isHorizontal ? (
				<>
					{iconArea}
					<div className="min-w-0 flex-1 flex flex-col justify-center">
						{titleEl}
						{secondaryEl}
					</div>
				</>
			) : (
				<>
					<div className="flex items-start gap-2">
						{iconArea}
					<div className="min-w-0 flex-1" />
					</div>
					<div className="mt-1.5 min-h-0 flex-1">{titleEl}</div>
					{secondaryEl}
				</>
			)}
		</button>
	);
});
