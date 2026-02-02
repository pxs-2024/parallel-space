"use client";

import { Package, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionItem } from "./types";
import { getTypeLabel } from "./types";

type TypeBadgeProps = { item: DecisionItem; className?: string };

export function TypeBadge({ item, className }: TypeBadgeProps) {
	const label = getTypeLabel(item);
	const isDiscard = item.data.type === "DISCARD";
	const isDue = item.data.type === "REMIND";
	const Icon = isDiscard ? Trash2 : isDue ? Clock : Package;
	const bgClass = isDiscard
		? "bg-destructive/20 text-destructive"
		: isDue
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
