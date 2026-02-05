"use client";

import { Box, Package, Clock, Link2, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KindBadge } from "./kind-badge";
import { Badge } from "./badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarGradient } from "@/features/space/utils/avatar-gradient";
import type { Prisma } from "@/generated/prisma/client";

type AssetForDetail = Prisma.AssetGetPayload<{
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
	};
}>;

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
	if (v == null) return "—";
	return f ? f(v as T) : String(v);
}

function getKindIcon(kind: string) {
	switch (kind) {
		case "CONSUMABLE": return Package;
		case "TEMPORAL": return Clock;
		case "VIRTUAL": return Link2;
		default: return Box;
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
		case "ACTIVE": return "blue";
		case "PENDING_RESTOCK":
		case "PENDING_DISCARD": return "amber";
		case "DISCARDED": return "red";
		default: return "muted";
	}
}

function formatDate(d: Date | null): string {
	if (!d) return "—";
	const x = new Date(d);
	return x.toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

type AssetDetailDrawerProps = {
	asset: AssetForDetail | null;
	onClose: () => void;
};

export function AssetDetailDrawer({ asset, onClose }: AssetDetailDrawerProps) {
	if (!asset) return null;

	const KindIcon = getKindIcon(asset.kind);
	const qtyText = [fmt(asset.quantity), fmt(asset.unit)].filter(Boolean).join(" ") || "—";

	return (
		<>
			<div
				className="fixed inset-0 z-40"
				aria-hidden
				onClick={onClose}
			/>
			<div
				className={cn(
					"fixed right-4 bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
					"overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
				)}
			>
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
					<span className="text-sm font-medium text-muted-foreground">物品信息</span>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
						<X className="size-4" />
					</Button>
				</div>
				<div className="p-4 space-y-4">
					<div className="flex items-center gap-3">
						<Avatar className="h-12 w-12 shrink-0 ring-2 ring-border/50">
							<AvatarFallback
								className="font-geely text-sm font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
								style={{ background: getAvatarGradient(asset.name) }}
							>
								{asset.name.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate font-semibold text-foreground">{asset.name}</p>
							<div className="flex flex-wrap items-center gap-1.5 mt-0.5">
								<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
									<KindIcon className="size-3.5" />
								</span>
								<KindBadge kind={asset.kind} />
								<Badge variant={getStateBadgeVariant(asset.state)}>
									{getStateLabel(asset.state)}
								</Badge>
							</div>
						</div>
					</div>
					{asset.description != null && asset.description !== "" && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">描述</p>
							<p className="text-sm text-foreground whitespace-pre-wrap">{asset.description}</p>
						</div>
					)}
					{(asset.quantity != null || asset.unit) && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">数量</p>
							<p className="text-sm">
								{qtyText}
								{asset.reorderPoint != null && (
									<span className="text-muted-foreground ml-2">补货线 {asset.reorderPoint}</span>
								)}
							</p>
						</div>
					)}
					{(asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt) && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">到期</p>
							<p className="text-sm">
								{formatDate(asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt ?? null)}
							</p>
						</div>
					)}
					{asset.refUrl && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">链接</p>
							<a
								href={asset.refUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
							>
								<ExternalLink className="size-3.5" />
								{asset.refUrl}
							</a>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
