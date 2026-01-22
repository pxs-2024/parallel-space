"use client";
import { DraggableCard } from "@/components/space/draggable-card";
import { DragSpace } from "@/components/space/drag-space";
import { DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { Position } from "@/components/space/types";

const SpacePage = () => {

	const [positions, setPositions] = useState<Position[]>([
		{ x: 0, y: 0, id: "0" },
		{ x: 100, y: 100, id: "1" },
		{ x: 200, y: 200, id: "2" },
	]);
	const handleDragEnd = (e: DragEndEvent) => {
		const { active, delta } = e;
		console.log(active, delta, "✅>>>>delta");	
		setPositions((prev) => {
			const newPositions = prev.map((position) => {
				if (position.id === active.id) {
					return { ...position, x: position.x + delta.x, y: position.y + delta.y };
				}
				return position;
			});
			return newPositions;
		});
	};

	return (
		<DragSpace onDragEnd={handleDragEnd}>
			{positions.map((position) => (
				<DraggableCard key={position.id} position={position} viewPortScale={1} />
			))}
		</DragSpace>
	);
};

export default SpacePage;
