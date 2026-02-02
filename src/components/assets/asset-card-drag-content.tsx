"use client";

import { useState, useEffect } from "react";
import { Box, Package, Clock, Link2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CardDescription } from "@/components/ui/card";
import { getAvatarGradient } from "@/features/space/utils/avatar-gradient";
import { cn } from "@/lib/utils";
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type AssetKind = "STATIC" | "CONSUMABLE" | "TEMPORAL" | "VIRTUAL";

type AssetForDrag = {
	name: string;
	description: string | null;
	kind: AssetKind;
	consumeIntervalDays: number | null;
	lastDoneAt: Date | null;
	nextDueAt: Date | null;
	createdAt: Date;
};

function formatCountdown(ms: number): { text: string; isExpired: boolean } {
	if (ms <= 0) return { text: "已到期", isExpired: true };
	const days = Math.floor(ms / MS_PER_DAY);
	const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
	if (days > 0 && hours > 0) return { text: `${days}天${hours}小时后`, isExpired: false };
	if (days > 0) return { text: `${days}天后`, isExpired: false };
	if (hours > 0) return { text: `${hours}小时后`, isExpired: false };
	const minutes = Math.floor((ms % MS_PER_HOUR) / 60000);
	return { text: `${minutes}分钟后`, isExpired: false };
}

function getKindConfig(kind: AssetKind) {
	switch (kind) {
		case "CONSUMABLE":
			return {
				Icon: Package,
				bg: "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30",
				iconBg: "bg-amber-500/25",
				iconColor: "text-amber-700 dark:text-amber-300",
			};
		case "TEMPORAL":
			return {
				Icon: Clock,
				bg: "bg-blue-500/15 dark:bg-blue-500/20 border-blue-500/30",
				iconBg: "bg-blue-500/25",
				iconColor: "text-blue-700 dark:text-blue-300",
			};
		case "VIRTUAL":
			return {
				Icon: Link2,
				bg: "bg-violet-500/15 dark:bg-violet-500/20 border-violet-500/30",
				iconBg: "bg-violet-500/25",
				iconColor: "text-violet-700 dark:text-violet-300",
			};
		default:
			return {
				Icon: Box,
				bg: "bg-muted/50 border-border",
				iconBg: "bg-muted",
				iconColor: "text-muted-foreground",
			};
	}
}

type AssetCardDragContentProps = {
	asset: AssetForDrag;
};

export function AssetCardDragContent({ asset }: AssetCardDragContentProps) {
	const [now, setNow] = useState(0);
	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(id);
	}, []);

	const config = getKindConfig(asset.kind);
	const Icon = config.Icon;

	// 消耗型 / 时间型：倒计时文案（已到期时不再拼接「到下次消耗」/「到期」，避免「已到到期」）
	let countdownLine: { suffix: string; text: string } | null = null;
	if (asset.kind === "CONSUMABLE" && asset.consumeIntervalDays != null && now > 0) {
		const base = asset.lastDoneAt ?? asset.createdAt;
		const baseMs = base instanceof Date ? base.getTime() : new Date(base).getTime();
		const nextConsumeMs = baseMs + asset.consumeIntervalDays * MS_PER_DAY;
		const ms = nextConsumeMs - now;
		const { text, isExpired } = formatCountdown(ms);
		countdownLine = { suffix: "到下次消耗", text: isExpired ? "已到下次消耗" : `${text}到下次消耗` };
	}
	if (asset.kind === "TEMPORAL" && asset.nextDueAt && now > 0) {
		const targetMs = asset.nextDueAt instanceof Date ? asset.nextDueAt.getTime() : new Date(asset.nextDueAt).getTime();
		const ms = targetMs - now;
		const { text, isExpired } = formatCountdown(ms);
		countdownLine = { suffix: "到期", text: isExpired ? "已到期" : `${text}到期` };
	}

	return (
		<div className="group/card relative flex h-full w-full flex-col items-center justify-center overflow-visible">
			<div
				className={cn(
					"flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm transition-all duration-200",
					config.bg
				)}
			>
				<Avatar className="h-14 w-14 shrink-0 ring-2 ring-background/60 transition-transform duration-200 group-hover/card:scale-105">
					<AvatarFallback
						className="font-geely text-base font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
						style={{ background: getAvatarGradient(asset.name) }}
					>
						{asset.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
				<span className="truncate max-w-full text-center text-sm font-semibold text-foreground">
					{asset.name}
				</span>
				<div className="flex min-h-6 items-center justify-center gap-1.5">
					<div
						className={cn(
							"flex size-6 shrink-0 items-center justify-center rounded-full",
							config.iconBg,
							config.iconColor
						)}
						title={asset.kind}
					>
						<Icon className="size-3" />
					</div>
					{countdownLine ? (
						<span className={cn("text-xs", config.iconColor)}>{countdownLine.text}</span>
					) : null}
				</div>
			</div>
			{asset.description ? (
				<div
					className={cn(
						"absolute left-0 right-0 top-full z-20 pt-1",
						"pointer-events-none opacity-0 transition-all duration-200 delay-75",
						"group-hover/card:pointer-events-auto group-hover/card:opacity-100"
					)}
				>
					<CardDescription
						className={cn(
							"line-clamp-2 rounded-lg border bg-card px-3 py-2 text-center text-xs shadow-md",
							"translate-y-1 group-hover/card:translate-y-0 transition-transform duration-200 delay-75"
						)}
					>
						{asset.description}
					</CardDescription>
				</div>
			) : null}
		</div>
	);
}
