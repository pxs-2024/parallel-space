"use client";

import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { Card } from "../ui/card";
import { Position } from "./types";
import { AssetsOrContainerCard } from "../assets/assets-or-container-card";

type DraggableCardProps = {
	position: Position;
	viewportScale: number;
	children?: React.ReactNode;
};

const DraggableCard = ({ position, viewportScale, children }: DraggableCardProps) => {
	const { setNodeRef, listeners, attributes, transform } = useDraggable({
		id: position.id,
	});
	const tx = transform ? transform.x / viewportScale : 0;
	const ty = transform ? transform.y / viewportScale : 0;

	return (
		<div
			className={cn(
				"absolute",
				"bg-white/90",
				"will-change-transform",
			)}
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			style={{
				left: position.x,
				top: position.y,
				transform: transform ? `translate3d(${tx}px, ${ty}px, 0)` : undefined,
			}}
		>
			<AssetsOrContainerCard icon={<></>} name={"物体名称"}>
				{children}
			</AssetsOrContainerCard>
		</div>
	);
};

export { DraggableCard };
