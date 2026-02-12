export type Cell = { x: number; y: number };
export type Point = { x: number; y: number };
export type Screen = { screenX: number; screenY: number };

export type Space = { id: string; name: string; cells: Cell[]; segs?: any };

export type View = { translateX: number; translateY: number; scale: number };
export type Viewport = { width: number; height: number };

export type ToolId = "default" | "select" | "deselect" | "cleanSegments";

export type Overlay =
  | null
  | { type: "box"; a: Cell; b: Cell }
  | { type: "polyline"; points: Point[] };

export type FPState = {
  spaces: Space[];
  selectedCells: Cell[];
  selectedSpaceId: string | null;
  hoverSpaceId: string | null;
  view: View;
  overlay: Overlay;
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
