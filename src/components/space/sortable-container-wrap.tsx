"use client";

import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SecondaryContainer } from "./secondary-container";
import type { SpaceMenuContext } from "@/features/space/components/space-context-menu";

type ContainerData = {
	id: string;
	name: string;
	description: string | null;
	orderIndex: number;
	assets: Array<{
		id: string;
		name: string;
		description: string;
		orderIndex: number;
	}>;
};

const SortableContainerWrap = ({
	container,
	onContextMenu,
}: {
	container: ContainerData;
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
		id: container.id,
		data: {
			type: "container",
			id: container.id,
			container,
		},
	});

	const handleContextMenu = (e: React.MouseEvent) => {
		if (!onContextMenu) return;
		e.preventDefault();
		e.stopPropagation();
		onContextMenu({ type: "container", containerId: container.id }, e);
	};

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			onContextMenu={handleContextMenu}
			data-context-menu-handled
			className={cn("relative", isDragging && "opacity-40")}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
		>
			<SecondaryContainer
				id={container.id}
				name={container.name}
				description={container.description}
				icon={<></>}
				assets={container.assets}
			/>
		</div>
	);
};

export { SortableContainerWrap };
