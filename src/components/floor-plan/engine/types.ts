export type Cell = { x: number; y: number };
export type Point = { x: number; y: number };
export type Screen = { screenX: number; screenY: number };


export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type Space = { id: string; name: string; description?: string; cells: Cell[]; segs?: Segment[][] };

export type View = { translateX: number; translateY: number; scale: number };
export type Viewport = { width: number; height: number };

export type ToolId = "editDefault" | "select" | "deselect" | "selectDeselect" | "cleanSegments" | "none";

export type Overlay =
  | null
  | { type: "box"; a: Cell; b: Cell }
  | { type: "polyline"; points: Point[] };

export type GridMode = "full" | "none";

export type FPState = {
  spaces: Space[];
  selectedCells: Cell[];
  selectedSpaceId: string | null;
  hoverSpaceId: string | null;
  view: View;
  overlay: Overlay;
  /** 网格显示：full 显示，none 隐藏（仅编辑模式下生效） */
  gridMode: GridMode;
  /** 编辑模式：仅编辑模式下且 gridMode===full 时展示网格 */
  editMode: boolean;
  /** 正在“编辑空间”的空间 id：该空间不绘制轮廓，其格子以 selectedCells 显示并可修改，完成时用 selectedCells 更新 */
  editingSpaceId: string | null;
  /** 编辑过名称/描述的空间 id 列表，完成时提交服务端 */
  editedInfoSpaceIds: string[];
};

export type PointerEvt = {
  pointerId: number;
  screenX: number;
  screenY: number;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  isSpaceKey: boolean;
};
