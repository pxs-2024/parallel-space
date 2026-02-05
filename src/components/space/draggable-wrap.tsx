"use client";

import { useDraggable } from "@dnd-kit/core";
import { Position } from "./types";

export type DragHandleProps = {
	listeners: Record<string, unknown>;
	attributes: Record<string, unknown>;
};

type DraggableCardProps = {
	position: Position;
	viewportScale: number;
	/** 仅通过把手拖拽位置：传入 (listeners, attributes) 渲染子节点，把手区域需自行绑定 listeners/attributes */
	children: (dragHandleProps: DragHandleProps) => React.ReactNode;
	onContextMenu?: (e: React.MouseEvent) => void;
	/** 为 true 时不可拖拽（与平移背景互斥，或未进入移动模式） */
	disabled?: boolean;
};

const DraggableWrap = ({ position, viewportScale, children, onContextMenu, disabled = false }: DraggableCardProps) => {
	const { setNodeRef, listeners, attributes, transform } = useDraggable({
		id: position.id,
		data: {
			type: "asset",
			id: position.id,
		},
		disabled,
	});

	const tx = transform ? transform.x / viewportScale : 0;
	const ty = transform ? transform.y / viewportScale : 0;
	const isDragging = !!transform;

	return (
		<div
			className="absolute will-change-transform"
			ref={setNodeRef}
			data-context-menu-handled
			onContextMenu={onContextMenu}
			style={{
				left: position.x,
				top: position.y,
				transform: transform ? `translate3d(${tx}px, ${ty}px, 0)` : undefined,
				zIndex: isDragging ? 9999 : 1,
			}}
		>
			{children(disabled ? { listeners: {}, attributes: {} } : { listeners, attributes })}
		</div>
	);
};

export { DraggableWrap };
