import { cn } from "@/lib/utils";
import { AssetsOrContainerCard } from "../assets/assets-or-container-card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContainerAsset } from "./types";

const SortableWrap = ({ 
	asset, 
	containerId,
}: { 
	asset: ContainerAsset;	 
	containerId: string;
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
			type: "asset-in-container",
			id: asset.id,
			containerId: containerId,
			asset: asset, // 传递给 DragOverlay 使用
		},
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
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

export { SortableWrap };