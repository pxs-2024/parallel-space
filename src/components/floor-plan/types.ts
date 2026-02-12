export type Cell = { x: number; y: number };

export type Pt = { x: number; y: number };

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type Screen = {
	screenX: number;
	screenY: number;
};

export type Point = {
	x: number;
	y: number;
};
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

export type DragMode = "none" | "pan" | "moveShape" | "boxSelectCells" | "ignore" | "cleanSegments";

export type DragState = {
	mode: DragMode; // 当前拖拽模式
	startScreenX: number; // 开始拖拽时的屏幕X坐标
	startScreenY: number; // 开始拖拽时的屏幕Y坐标

	baseTranslateX: number; // 基准平移X值
	baseTranslateY: number; // 基准平移Y值

	startCell: Cell | null; // 开始拖拽时的单元格
	currentCell: Cell | null; // 当前鼠标位置对应的单元格

	spaceId: string | null; // 拖拽的空间ID
	baseSpaceCells: Cell[] | null; // 拖拽开始时空间的原始单元格

	activated: boolean; // 是否已激活拖拽（超过阈值）

	// 本次 pointerdown 时是否按着 shift（锁定，避免中途按/松导致逻辑跳变）
	shiftAtStart: boolean;
	// 框选时为 true 表示从选区中减去，否则为加选
	boxSelectSubtract: boolean;

	startPoint: Point | null;
};
