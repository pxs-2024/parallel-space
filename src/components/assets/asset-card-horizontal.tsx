"use client";

import { Box, Package, Clock, Link2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { KindBadge } from "./kind-badge";
import { Badge } from "./badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { getAvatarGradient } from "@/features/space/utils/avatar-gradient";
import { Prisma } from "@/generated/prisma/client";

type AssetCardHorizontalAsset = Prisma.AssetGetPayload<{
	select: {
		id: true;
		name: true;
		description: true;
		kind: true;
		state: true;
		quantity: true;
		unit: true;
		reorderPoint: true;
		dueAt: true;
		lastDoneAt: true;
		nextDueAt: true;
		refUrl: true;
		expiresAt: true;
		cardColor: true;
		cardOpacity: true;
	};
}>;

type AssetCardHorizontalProps = {
	asset: AssetCardHorizontalAsset;
	className?: string;
	/** 仅展示名字，详情在点击后于右上角抽屉显示 */
	nameOnly?: boolean;
	/** 可选：展示所属空间名称 */
	spaceName?: string;
	onCardClick?: (asset: AssetCardHorizontalAsset) => void;
};

type AssetKind = "STATIC" | "CONSUMABLE" | "TEMPORAL" | "VIRTUAL";

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
	if (v == null) return "—";
	return f ? f(v as T) : String(v);
}

function getKindIcon(kind: AssetKind) {
	switch (kind) {
		case "CONSUMABLE":
			return Package;
		case "TEMPORAL":
			return Clock;
		case "VIRTUAL":
			return Link2;
		default:
			return Box;
	}
}

function getStateLabel(state: string): string {
	const map: Record<string, string> = {
		ACTIVE: "在用",
		PENDING_RESTOCK: "待补充",
		PENDING_DISCARD: "待废弃",
		ARCHIVED: "已归档",
		DISCARDED: "已废弃",
	};
	return map[state] ?? state;
}

function getStateBadgeVariant(state: string): "muted" | "blue" | "amber" | "red" {
	switch (state) {
		case "ACTIVE":
			return "blue";
		case "PENDING_RESTOCK":
		case "PENDING_DISCARD":
			return "amber";
		case "DISCARDED":
			return "red";
		default:
			return "muted";
	}
}

function formatDue(date: Date | null): string {
	if (!date) return "";
	const d = new Date(date);
	return d.toLocaleDateString("zh-CN", {
		month: "numeric",
		day: "numeric",
		year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
	});
}

function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace(/^#/, "");
	const m = h.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	if (!m) return `rgba(0,0,0,${alpha})`;
	return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

const AssetCardHorizontal = ({ asset, className, nameOnly = false, spaceName, onCardClick }: AssetCardHorizontalProps) => {
	const hasDescription = asset.description != null && asset.description !== "";
	const qtyText = [fmt(asset.quantity), fmt(asset.unit)].filter(Boolean).join(" ") || "—";
	const KindIcon = getKindIcon(asset.kind as AssetKind);
	const hasDue = asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt;
	const dueText = formatDue(asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt ?? null);
	const hasReorder = asset.reorderPoint != null;

	// 有卡片背景色时头像使用同色，否则用名称生成的渐变
	const avatarBackground =
		asset.cardColor != null && asset.cardColor !== ""
			? `linear-gradient(135deg, ${hexToRgba(asset.cardColor, 0)} 0%, ${hexToRgba(asset.cardColor, asset.cardOpacity != null ? Math.max(0, Math.min(1, Number(asset.cardOpacity))) : 0.25)} 100%)`
			: getAvatarGradient(asset.name);

	if (nameOnly) {
		return (
			<Card
				role={onCardClick ? "button" : undefined}
				onClick={onCardClick ? () => onCardClick(asset) : undefined}
				className={cn(
					"rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200",
					"hover:border-border hover:shadow-md hover:bg-card/98",
					onCardClick && "cursor-pointer",
					className
				)}
			>
				<CardContent className="flex flex-row items-center gap-3 py-1.5 px-3">
					<Avatar className="h-12 w-12 shrink-0 rounded-xl ring-2 ring-border/40">
						<AvatarFallback
							className="rounded-xl font-medium text-white p-1.5 text-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]"
							style={{ background: avatarBackground }}
						>
							{asset.name.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="truncate text-sm font-semibold text-foreground">
							{asset.name}
						</span>
						{spaceName && (
							<span className="truncate text-xs text-muted-foreground">{spaceName}</span>
						)}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200",
				"hover:border-border hover:shadow-md hover:bg-card/98",
				className
			)}
		>
			<CardContent className="flex flex-row items-stretch gap-3 p-3">
				{/* 左侧头像 */}
				<Avatar className="h-14 w-14 shrink-0 rounded-xl ring-2 ring-border/40">
					<AvatarFallback
						className="rounded-xl font-medium text-white p-1.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]"
						style={{ background: avatarBackground }}
					>
						{asset.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>

				<div className="flex min-w-0 flex-1 flex-col gap-2">
					{/* 第一行：名称 + 种类图标 + 种类标签 + 状态 */}
					<div className="flex flex-wrap items-center gap-2">
						<span className="truncate text-base font-semibold text-foreground">
							{asset.name}
						</span>
						<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
							<KindIcon className="size-3.5" />
						</span>
						<KindBadge kind={asset.kind} />
						<Badge variant={getStateBadgeVariant(asset.state)}>
							{getStateLabel(asset.state)}
						</Badge>
					</div>

					{/* 第二行：描述 + 数量/单位 */}
					{(hasDescription || qtyText !== "—") && (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
							{hasDescription && (
								<span className="max-w-md truncate">{asset.description}</span>
							)}
							<span className="shrink-0 font-medium text-foreground/80">{qtyText}</span>
						</div>
					)}

					{/* 第三行：到期、补货线、外链 */}
					{(hasDue || hasReorder || asset.refUrl) && (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							{hasDue && dueText && (
								<span className="flex items-center gap-1">
									<Clock className="size-3.5 shrink-0" />
									到期 {dueText}
								</span>
							)}
							{hasReorder && (
								<span>补货线 {fmt(asset.reorderPoint)}</span>
							)}
							{asset.refUrl && (
								<a
									href={asset.refUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary hover:underline"
									onClick={(e) => e.stopPropagation()}
								>
									<ExternalLink className="size-3.5" />
									链接
								</a>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export { AssetCardHorizontal };
