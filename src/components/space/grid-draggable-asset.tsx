"use client";

import { cn } from "@/lib/utils";
import { AssetsOrContainerCard } from "@/components/assets/assets-or-container-card";
import { useDraggable } from "@dnd-kit/core";

type Asset = {
	id: string;
	name: string;
	description: string;
	orderIndex: number;
};

export function GridDraggableAsset({ asset }: { asset: Asset }) {
	const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
		id: asset.id,
		data: { type: "asset" as const, id: asset.id, asset },
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			data-context-menu-handled
			className={cn("w-full h-full min-w-0 min-h-0", isDragging && "opacity-40")}
		>
			<AssetsOrContainerCard
				icon={<></>}
				name={asset.name}
				desc={asset.description}
			/>
		</div>
	);
}
