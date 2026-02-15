"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Prisma } from "@/generated/prisma/client";
import { AssetCardDragContent } from "./asset-card-drag-content";

const DEFAULT_SIZE = 160;

type AssetCardProps = {
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
			consumeIntervalDays: true;
			dueAt: true;
			lastDoneAt: true;
			nextDueAt: true;
			refUrl: true;
			expiresAt: true;
			createdAt: true;
			width: true;
			height: true;
			cardColor: true;
			cardOpacity: true;
		};
	}>;
	/** 点击卡片时回调 */
	onCardClick?: (asset: AssetCardProps["asset"]) => void;
	/** 是否选中（高亮） */
	isSelected?: boolean;
};

function AssetCard({ asset, onCardClick, isSelected = false }: AssetCardProps) {
	const displayW = asset.width ?? DEFAULT_SIZE;
	const displayH = asset.height ?? DEFAULT_SIZE;

	const handleCardClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target instanceof Element && e.target.closest("[data-card-menu]")) return;
			onCardClick?.(asset);
		},
		[asset, onCardClick]
	);

	return (
		<Card
			onClick={onCardClick ? handleCardClick : undefined}
			className={cn(
				"relative rounded-xl border border-border bg-transparent p-0 transition-all duration-200 ease-out overflow-visible",
				"shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.25)]",
				"hover:border-primary/20 hover:shadow-md dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
				onCardClick && "cursor-pointer",
				isSelected && "ring-2 ring-primary border-primary/50 shadow-md dark:shadow-lg"
			)}
			style={{ width: displayW, height: displayH }}
		>
			<CardContent className="flex h-full flex-col items-center justify-center p-0">
				<AssetCardDragContent
					nameOnly
					cardWidth={displayW}
					asset={{
						name: asset.name,
						description: asset.description,
						kind: asset.kind,
						consumeIntervalDays: asset.consumeIntervalDays,
						lastDoneAt: asset.lastDoneAt,
						nextDueAt: asset.nextDueAt,
						createdAt: asset.createdAt,
						cardColor: asset.cardColor ?? undefined,
						cardOpacity: asset.cardOpacity ?? undefined,
						quantity: asset.quantity ?? undefined,
						reorderPoint: asset.reorderPoint ?? undefined,
						unit: asset.unit ?? undefined,
						state: asset.state ?? undefined,
					}}
				/>
			</CardContent>
		</Card>
	);
}

export { AssetCard };
