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

/** 拖拽状态（用于指针事件） */
export type DragState = {
	mode: DragMode;
	startScreenX: number;
	startScreenY: number;
	baseTranslateX: number;
	baseTranslateY: number;
	startCell: Cell | null;
	currentCell: Cell | null;
	spaceId: string | null;
	baseSpaceCells: Cell[] | null;
	activated: boolean;
	shiftAtStart: boolean;
	boxSelectSubtract: boolean;
};

/** 持久化回调：与后端同步空间数据 */
export type FloorPlanPersistCallbacks = {
	onCreate: (name: string, cells: Cell[]) => void | Promise<void>;
	onUpdate: (spaceId: string, cells: Cell[]) => void | Promise<void>;
	onSpaceSelect: (spaceId: string) => void;
};

export const INITIAL_DRAG_STATE: DragState = {
	mode: "none",
	startScreenX: 0,
	startScreenY: 0,
	baseTranslateX: 0,
	baseTranslateY: 0,
	startCell: null,
	currentCell: null,
	spaceId: null,
	baseSpaceCells: null,
	activated: false,
	shiftAtStart: false,
	boxSelectSubtract: false,
};
