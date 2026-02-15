"use client";

import { useState, useEffect } from "react";
import { Box, Package, Clock, Link2, MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTransparentCardGradient } from "@/features/space/utils/avatar-gradient";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number): string {
	const m = hex.replace(/^#/, "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	if (!m) return `rgba(0,0,0,${alpha})`;
	return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

type AssetKind = "STATIC" | "CONSUMABLE" | "TEMPORAL" | "VIRTUAL";
type AssetState = "ACTIVE" | "PENDING_RESTOCK" | "PENDING_DISCARD" | "ARCHIVED" | "DISCARDED";

export type AssetForDrag = {
	name: string;
	description: string | null;
	kind: AssetKind;
	consumeIntervalDays: number | null;
	lastDoneAt: Date | null;
	nextDueAt: Date | null;
	createdAt: Date;
	cardColor?: string | null;
	cardOpacity?: number | null;
	/** 用于完整卡片样式与消耗型进度 */
	quantity?: number | null;
	reorderPoint?: number | null;
	unit?: string | null;
	state?: AssetState | string | null;
};

const KIND_ICONS = {
	CONSUMABLE: Package,
	TEMPORAL: Clock,
	VIRTUAL: Link2,
	STATIC: Box,
} as const;

const KIND_LABEL_KEYS = {
	CONSUMABLE: "kindConsumable",
	TEMPORAL: "kindTemporal",
	VIRTUAL: "kindVirtual",
	STATIC: "kindStatic",
} as const;

const STATE_LABEL_KEYS: Record<string, string> = {
	ACTIVE: "stateActive",
	PENDING_RESTOCK: "statePendingRestock",
	PENDING_DISCARD: "statePendingDiscard",
	ARCHIVED: "stateArchived",
	DISCARDED: "stateDiscarded",
};

const STATE_DOT_CLASS = {
	ACTIVE: "bg-emerald-500",
	PENDING_RESTOCK: "bg-amber-500",
	PENDING_DISCARD: "bg-amber-500",
	ARCHIVED: "bg-muted-foreground/60",
	DISCARDED: "bg-destructive/80",
} as Record<string, string>;

const ICON_STYLE: Record<AssetKind, { iconBg: string; iconColor: string }> = {
	CONSUMABLE: { iconBg: "bg-amber-500/20", iconColor: "text-amber-700 dark:text-amber-400" },
	TEMPORAL: { iconBg: "bg-primary/20", iconColor: "text-primary" },
	VIRTUAL: { iconBg: "bg-violet-500/20", iconColor: "text-violet-700 dark:text-violet-400" },
	STATIC: { iconBg: "bg-muted", iconColor: "text-muted-foreground" },
};

const NARROW_CARD_WIDTH = 100;

type AssetCardDragContentProps = {
	asset: AssetForDrag;
	nameOnly?: boolean;
	cardWidth?: number;
};

export function AssetCardDragContent({ asset, nameOnly = false, cardWidth }: AssetCardDragContentProps) {
	const tAsset = useTranslations("asset");
	const tFilters = useTranslations("filters");

	const kindLabel = tFilters(KIND_LABEL_KEYS[asset.kind] ?? "kindStatic");
	const stateLabel = asset.state ? tAsset(STATE_LABEL_KEYS[asset.state] ?? asset.state) : null;
	const Icon = KIND_ICONS[asset.kind] ?? Box;
	const iconStyle = ICON_STYLE[asset.kind] ?? ICON_STYLE.STATIC;

	// 消耗型进度：当前数量 / 补货线，上限 1；用于底部填充高度
	const isConsumable = asset.kind === "CONSUMABLE";
	const reorder = asset.reorderPoint != null ? Number(asset.reorderPoint) : 1;
	const qty = asset.quantity != null ? Number(asset.quantity) : 0;
	const progress = isConsumable ? Math.min(1, qty / Math.max(1, reorder)) : 0;

	const hasExtendedInfo = nameOnly && (asset.state != null || asset.quantity != null || asset.reorderPoint != null || asset.unit != null);

	// nameOnly 且无扩展信息且无自定义色时，保留极简占位（仅名称 + 渐变），用于极小卡片
	if (nameOnly && !hasExtendedInfo && (asset.cardColor == null || asset.cardColor === "")) {
		const background = getTransparentCardGradient(asset.name);
		const isNarrow = cardWidth != null && cardWidth < NARROW_CARD_WIDTH;
		return (
			<div className="flex h-full w-full flex-col items-center justify-center rounded-xl p-3" style={{ background }}>
				{isNarrow ? (
					<span className="inline-flex items-center justify-center text-sm font-semibold text-foreground [writing-mode:vertical-rl] [text-orientation:upright]" style={{ letterSpacing: "0.1em" }}>
						{asset.name}
					</span>
				) : (
					<span className="truncate max-w-full text-center text-sm font-semibold text-foreground">{asset.name}</span>
				)}
			</div>
		);
	}

	// 完整参考图风格：白卡、左上图标+类型、标题、次要信息、右上三点；消耗型带底部进度背景
	const hasCustomColor = asset.cardColor != null && asset.cardColor !== "";
	const opacity = asset.cardOpacity != null ? Math.max(0, Math.min(1, Number(asset.cardOpacity))) : 0.2;
	const customBg = hasCustomColor
		? `linear-gradient(135deg, ${hexToRgba(asset.cardColor!, 0)} 0%, ${hexToRgba(asset.cardColor!, opacity)} 100%)`
		: undefined;

	const secondaryParts: string[] = [];
	if (stateLabel) secondaryParts.push(stateLabel);
	if (asset.quantity != null && asset.quantity !== undefined) {
		const u = asset.unit ? ` ${asset.unit}` : "";
		secondaryParts.push(`数量 ${asset.quantity}${u}`);
	}
	if (isConsumable && asset.reorderPoint != null) secondaryParts.push(`补货线 ${asset.reorderPoint}`);
	const secondaryLine = secondaryParts.length > 0 ? secondaryParts.join(" • ") : null;

	const stateDotClass = asset.state ? STATE_DOT_CLASS[asset.state] ?? "bg-muted-foreground/60" : null;
	const isNarrow = cardWidth != null && cardWidth < NARROW_CARD_WIDTH;

	return (
		<div
			className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
			style={customBg ? { background: customBg } : undefined}
		>
			{/* 消耗型：底部进度背景（自下而上填充） */}
			{isConsumable && (
				<div
					className="pointer-events-none absolute inset-x-0 bottom-0 bg-primary/15 dark:bg-primary/20 transition-all duration-300"
					style={{ height: `${progress * 100}%` }}
					aria-hidden
				/>
			)}

			<div className="relative z-10 flex h-full min-h-0 flex-col p-3">
				{/* 顶行：左侧图标+类型，右侧三点 */}
				<div className="flex shrink-0 items-start justify-between gap-2">
					<div className="flex flex-col gap-0.5 min-w-0">
						<div
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-lg",
								iconStyle.iconBg,
								iconStyle.iconColor
							)}
						>
							<Icon className="size-4" />
						</div>
						<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate max-w-[80px]">
							{kindLabel}
						</span>
					</div>
					<button
						type="button"
						data-card-menu
						className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation min-h-[28px] min-w-[28px] flex items-center justify-center"
						onClick={(e) => e.stopPropagation()}
						onPointerDown={(e) => e.stopPropagation()}
						aria-label="更多操作"
					>
						<MoreVertical className="size-4" />
					</button>
				</div>

				{/* 标题 */}
				<div className="mt-1.5 min-h-0 flex-1 flex flex-col justify-center">
					{isNarrow ? (
						<span
							className="inline-flex font-semibold text-foreground text-sm [writing-mode:vertical-rl] [text-orientation:upright] truncate max-h-full"
							style={{ letterSpacing: "0.05em" }}
						>
							{asset.name}
						</span>
					) : (
						<span className="truncate block font-semibold text-sm text-foreground">{asset.name}</span>
					)}
				</div>

				{/* 次要信息：状态点 + 状态·数量·补货线 */}
				{secondaryLine && !isNarrow && (
					<div className="mt-1.5 flex shrink-0 items-center gap-1.5 min-h-[20px]">
						{stateDotClass && (
							<span className={cn("size-1.5 shrink-0 rounded-full", stateDotClass)} aria-hidden />
						)}
						<span className="truncate text-[11px] text-muted-foreground">{secondaryLine}</span>
					</div>
				)}
			</div>
		</div>
	);
}
