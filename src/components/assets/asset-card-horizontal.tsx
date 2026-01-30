"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { KindBadge } from "./kind-badge";
import { Prisma } from "@/generated/prisma/client";

type AssetCardHorizontalProps = {
	asset: Prisma.AssetGetPayload<{
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
			intervalDays: true;
			lastDoneAt: true;
			nextDueAt: true;
			refUrl: true;
			expiresAt: true;
		};
	}>;
	className?: string;
};

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
	if (v == null) return "—";
	return f ? f(v as T) : String(v);
}

const AssetCardHorizontal = ({ asset, className }: AssetCardHorizontalProps) => {
	return (
		<Card
			className={cn(
				"rounded-xl border bg-card shadow-sm transition-colors hover:bg-muted/50",
				className
			)}
		>
			<CardContent className="flex flex-row items-center gap-4 p-4">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<span className="truncate font-semibold">{asset.name}</span>
					<KindBadge kind={asset.kind} />
				</div>
				<div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
					{asset.description != null && asset.description !== "" && (
						<span className="max-w-48 truncate">{fmt(asset.description)}</span>
					)}
					<span>{fmt(asset.quantity)} {fmt(asset.unit)}</span>
				</div>
			</CardContent>
		</Card>
	);
};

export { AssetCardHorizontal };
