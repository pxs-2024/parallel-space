export type Cell = { x: number; y: number };

export type Pt = { x: number; y: number };

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/** 平面图上的空间（房间/区域），由网格单元格围成 */
export type Space = {
	id: string;
	name: string;
	cells: Cell[];
	segs: Segment[][];
};

/** 空间内的物品 */
export type Item = {
	id: string;
	spaceId: string;
	name: string;
	quantity?: number;
};

export type DragMode = "none" | "pan" | "moveShape" | "boxSelectCells" | "ignore";
