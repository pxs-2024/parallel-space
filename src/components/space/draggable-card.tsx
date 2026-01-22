"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState } from "react";
import { Position } from "./types";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type DraggableCardProps = {
	position: Position;
	viewPortScale: number;
	children?: React.ReactNode;
};

const DraggableCard = ({ position, viewPortScale, children }: DraggableCardProps) => {
	const { setNodeRef, listeners, attributes, transform } = useDraggable({
		id: position.id,
	});
	const offsetX = transform ? transform.x / viewPortScale : 0;
	const offsetY = transform ? transform.y / viewPortScale : 0;

	const [isGrabbing, setIsGrabbing] = useState(false);

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};
	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	return (
		<div
			className={cn(
				"absolute",
				"rounded-[14px]",
				"bg-white/90",
				"will-change-transform",
				"transition-[box-shadow,transform] duration-[250ms] ease-in-out",
				isGrabbing ? "cursor-grabbing z-[1000] scale-[1.06] transition-none" : "cursor-grab z-0"
			)}
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			style={{
				left: position.x,
				top: position.y,
				boxShadow: isGrabbing
					? "-1px 0 15px 0 rgba(34, 33, 81, 0.01),0px 15px 15px 0 rgba(34, 33, 81, 0.25)"
					: "none",
				transform:
					isGrabbing && transform ? `translate3d(${offsetX}px, ${offsetY}px, 0)` : undefined,
			}}
		>
			<Card className="w-[150px] p-[12px]">
				{children}
				{"物体名称"}
			</Card>
		</div>
	);
};

export { DraggableCard };
