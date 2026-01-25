"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import type { RootSpaceItem } from "@/features/space/queries/get-assets-or-container";
import type { SpaceMenuContext } from "@/features/space/components/space-context-menu";
import { GridDraggableAsset } from "./grid-draggable-asset";
import { GridDraggableContainer } from "./grid-draggable-container";

const CELL_ID = (r: number, c: number) => `grid-${r}-${c}`;

type GridCellProps = {
	row: number;
	col: number;
	item: RootSpaceItem | null;
	onContextMenu?: (context: SpaceMenuContext, e: React.MouseEvent) => void;
};

export function GridCell({ row, col, item, onContextMenu }: GridCellProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: CELL_ID(row, col),
		data: { row, col, type: "grid-cell" as const },
	});

	const handleContextMenu = (e: React.MouseEvent) => {
		if (!onContextMenu) return;
		e.preventDefault();
		e.stopPropagation();
		let context: SpaceMenuContext;
		if (!item) {
			context = { type: "grid", row, col };
		} else if (item.type === "container") {
			context = { type: "container", containerId: item.id };
		} else {
			context = { type: "root" };
		}
		onContextMenu(context, e);
	};

	return (
		<div
			ref={setNodeRef}
			onContextMenu={handleContextMenu}
			data-context-menu-handled
			className={cn(
				"w-40 h-40 flex items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
				item ? "border-transparent p-0" : "border-slate-200 bg-slate-50/50",
				isOver && "border-blue-400 bg-blue-50/80"
			)}
		>
			{item ? (
				item.type === "asset" ? (
					<GridDraggableAsset asset={item} />
				) : (
					<GridDraggableContainer
						container={{
							id: item.id,
							name: item.name,
							description: item.description,
							orderIndex: item.orderIndex,
							assets: item.assets,
						}}
					/>
				)
			) : (
				<span className="text-xs text-slate-400">({row},{col})</span>
			)}
		</div>
	);
}

export { CELL_ID };
