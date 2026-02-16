"use client";

import { Package, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionItem } from "./types";
import { getTypeLabel } from "./types";

type TypeBadgeProps = { item: DecisionItem; className?: string };

export function TypeBadge({ item, className }: TypeBadgeProps) {
	const label = getTypeLabel(item);
	const isTemporal = item.data.assetKind === "TEMPORAL";
	const Icon = isTemporal ? Clock : Package;
	const bgClass = isTemporal
		? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
		: "bg-primary/20 text-primary";

	return (
		<div
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-full",
				bgClass,
				className
			)}
			title={label}
		>
			<Icon className="size-4" />
		</div>
	);
}
