export type Cell = { x: number; y: number };

export type Pt = { x: number; y: number };

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type Shape = { id: string; cells: Cell[]; segs: Segment[] };
