"use client";

import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { SecondaryContainer } from "./secondary-container";

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

export function GridDraggableContainer({ container }: { container: ContainerData }) {
	const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
		id: container.id,
		data: { type: "container" as const, id: container.id, container },
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			data-context-menu-handled
			className={cn("w-full h-full min-w-0 min-h-0", isDragging && "opacity-40")}
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
}
