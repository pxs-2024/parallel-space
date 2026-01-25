"use client";

import { cn } from "@/lib/utils";
import { AssetsOrContainerCard } from "../assets/assets-or-container-card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SpaceMenuContext } from "@/features/space/components/space-context-menu";

type RootAsset = {
	id: string;
	name: string;
	description: string;
	orderIndex: number;
};

const SortableRootAsset = ({
	asset,
	onContextMenu,
}: {
	asset: RootAsset;
	onContextMenu?: (context: SpaceMenuContext, e: React.MouseEvent) => void;
}) => {
	const {
		setNodeRef,
		listeners,
		attributes,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: asset.id,
		data: {
			type: "asset",
			id: asset.id,
			asset,
		},
	});

	const handleContextMenu = (e: React.MouseEvent) => {
		if (!onContextMenu) return;
		e.preventDefault();
		e.stopPropagation();
		onContextMenu({ type: "root" }, e);
	};

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			onContextMenu={handleContextMenu}
			data-context-menu-handled
			className={cn(isDragging && "opacity-40")}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
		>
			<AssetsOrContainerCard
				icon={<></>}
				name={asset.name}
				desc={asset.description}
			/>
		</div>
	);
};

export { SortableRootAsset };
