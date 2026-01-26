"use client";

import { useDraggable } from "@dnd-kit/core";
import { Position } from "./types";

type DraggableCardProps = {
	position: Position;
	viewportScale: number;
	children?: React.ReactNode;
	onContextMenu?: (e: React.MouseEvent) => void;
};

const DraggableWrap = ({ position, viewportScale, children, onContextMenu }: DraggableCardProps) => {
	const { setNodeRef, listeners, attributes, transform } = useDraggable({
		id: position.id,
		data: {
			type: "asset",
			id: position.id,
		},
	});
	const tx = transform ? transform.x / viewportScale : 0;
	const ty = transform ? transform.y / viewportScale : 0;

	// 拖拽时设置高 z-index
	const isDragging = !!transform;

	return (
		<div
			className={"absolute will-change-transform"}
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			data-context-menu-handled
			onContextMenu={onContextMenu}
			style={{
				left: position.x,
				top: position.y,
				transform: transform ? `translate3d(${tx}px, ${ty}px, 0)` : undefined,
				zIndex: isDragging ? 9999 : 1,
			}}
		>
			{children}
		</div>
	);
};

export { DraggableWrap };
