export type Cell = { x: number; y: number };

export function isConnected(cells: Cell[]) {
  if (cells.length === 0) return false;
	console.log('>>>>111')
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  const stack = [cells[0]];
  const visited = new Set<string>();

  while (stack.length) {
    const { x, y } = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const nbs: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of nbs) {
      const nk = `${nx},${ny}`;
      if (set.has(nk) && !visited.has(nk)) stack.push({ x: nx, y: ny });
    }
  }

  return visited.size === set.size;
}

type Pt = { x: number; y: number };

function ptKey(p: Pt) {
  return `${p.x},${p.y}`;
}
function undirectedEdgeKey(a: Pt, b: Pt) {
  const ka = ptKey(a);
  const kb = ptKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}
function parsePt(key: string): Pt {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/**
 * 外边界线段（格点坐标），内部共享边抵消，只保留轮廓边。
 */
export function cellsToBorderSegments(cells: Cell[]): Segment[] {
  const edges = new Set<string>();
  const toggleEdge = (a: Pt, b: Pt) => {
    const k = undirectedEdgeKey(a, b);
    if (edges.has(k)) edges.delete(k);
    else edges.add(k);
  };

  for (const { x, y } of cells) {
    const p00 = { x, y };
    const p10 = { x: x + 1, y };
    const p11 = { x: x + 1, y: y + 1 };
    const p01 = { x, y: y + 1 };

    toggleEdge(p00, p10);
    toggleEdge(p10, p11);
    toggleEdge(p11, p01);
    toggleEdge(p01, p00);
  }

  const segs: Segment[] = [];
  for (const ek of edges) {
    const [ka, kb] = ek.split("|");
    const a = parsePt(ka);
    const b = parsePt(kb);
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segs;
}

export function unionCells(prev: Cell[], add: Cell[]) {
  const set = new Set(prev.map((c) => `${c.x},${c.y}`));
  const res = [...prev];
  for (const c of add) {
    const k = `${c.x},${c.y}`;
    if (!set.has(k)) {
      set.add(k);
      res.push(c);
    }
  }
  return res;
}