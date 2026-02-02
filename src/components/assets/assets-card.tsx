import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { useState } from "react";
import { Prisma } from "@/generated/prisma/client";
import { AssetCardDragContent } from "./asset-card-drag-content";

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
		};
	}>;
};

const AssetCard = ({ asset }: AssetCardProps) => {
	const [isGrabbing, setIsGrabbing] = useState(false);

	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};

	return (
		<Card
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			className={cn(
				"group w-40 h-40 aspect-square rounded-3xl border border-border bg-transparent p-0 transition-all duration-200 ease-out cursor-grab overflow-visible",
				"shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.25)]",
				"hover:border-primary/20 hover:shadow-md dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
				isGrabbing &&
					"cursor-grabbing scale-[1.05] border-primary/30 shadow-lg dark:shadow-[0_12px_28px_rgba(0,0,0,0.4)] ring-2 ring-primary/20"
			)}
		>
			<CardContent className="flex h-full flex-col items-center justify-center p-0">
				<AssetCardDragContent
					asset={{
						name: asset.name,
						description: asset.description,
						kind: asset.kind,
						consumeIntervalDays: asset.consumeIntervalDays,
						lastDoneAt: asset.lastDoneAt,
						nextDueAt: asset.nextDueAt,
						createdAt: asset.createdAt,
					}}
				/>
			</CardContent>
		</Card>
	);
};

export { AssetCard };
