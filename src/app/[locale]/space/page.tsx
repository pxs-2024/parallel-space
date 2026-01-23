"use client";
import { DraggableCard } from "@/components/space/draggable-card";
import { DragSpace } from "@/components/space/drag-space";
import { DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { Position, Viewport } from "@/components/space/types";

const SpacePage = () => {
	const [positions, setPositions] = useState<Position[]>([
		{ x: 0, y: 0, id: "0" },
		{ x: 100, y: 100, id: "1" },
		{ x: 200, y: 200, id: "2" },
		{ x: 300, y: 300, id: "3" },
		{ x: 400, y: 400, id: "4" },
		{ x: 500, y: 500, id: "5" },
		{ x: 600, y: 600, id: "6" },
		{ x: 700, y: 700, id: "7" },
		{ x: 800, y: 800, id: "8" },
		{ x: 900, y: 900, id: "9" },
		{ x: 1000, y: 1000, id: "10" },
	]);

	const [viewport, setViewport] = useState<Viewport>({ vx: 0, vy: 0, scale: 1 });
	const handleDragEnd = (e: DragEndEvent) => {
		const { active, delta } = e;
		setPositions((prev) => {
			const newPositions = prev.map((position) => {
				if (position.id === active.id) {
					return {
						...position,
						x: position.x + delta.x / viewport.scale,
						y: position.y + delta.y / viewport.scale,
					};
				}
				return position;
			});
			return newPositions;
		});
	};

	return (
		<DragSpace viewport={viewport} onViewportChange={setViewport} onDragEnd={handleDragEnd}>
			{positions.map((position) => (
				<DraggableCard key={position.id} position={position} viewportScale={viewport.scale} />
			))}
		</DragSpace>
	);
};

export default SpacePage;
