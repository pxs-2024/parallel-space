import type { Cell, Pt, Segment } from "./types";
import { MAX_CANVAS_SIZE, SIZE } from "./constants";


// 优化：使用数字键代替字符串键，提升性能
// 画布限制：最多4000*4000，使用位运算优化
function cellKey(x: number, y: number): number {
  return (x << 16) | (y & 0xFFFF);
}

export function isConnected(cells: Cell[]) {
  if (cells.length === 0) return false;

  const set = new Set(cells.map((c) => cellKey(c.x, c.y)));
  const stack = [cells[0]];
  const visited = new Set<number>();

  while (stack.length) {
    const { x, y } = stack.pop()!;
    const key = cellKey(x, y);
    if (visited.has(key)) continue;
    visited.add(key);

    const nbs: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of nbs) {
      const nk = cellKey(nx, ny);
      if (set.has(nk) && !visited.has(nk)) stack.push({ x: nx, y: ny });
    }
  }

  return visited.size === set.size;
}

// 优化：使用数字键代替字符串键
function ptKey(p: Pt): number {
  return cellKey(p.x, p.y);
}

// 优化：边的键使用有序的数字组合，避免字符串比较
// 画布限制：最多4000*4000
function undirectedEdgeKey(a: Pt, b: Pt): number {
  const ka = ptKey(a);
  const kb = ptKey(b);
  // 确保较小的键在前，保证无向边的唯一性
  return ka < kb ? (ka * 1000000 + kb) : (kb * 1000000 + ka);
}

/**
 * 外边界线段（格点坐标），内部共享边抵消，只保留轮廓边。
 * 返回多个闭合路径，每个路径为首尾相连的 Segment 数组。
 */
export function cellsToBorderSegments(cells: Cell[]): Segment[][] {
  const edgeMap = new Map<number, { a: Pt; b: Pt }>();
  
  const toggleEdge = (a: Pt, b: Pt) => {
    const k = undirectedEdgeKey(a, b);
    if (edgeMap.has(k)) {
      edgeMap.delete(k);
    } else {
      edgeMap.set(k, { a, b });
    }
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
  for (const { a, b } of edgeMap.values()) {
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  
  return sortSegmentsIntoPath(segs);
}

export function unionCells(prev: Cell[], add: Cell[]) {
  const set = new Set(prev.map((c) => cellKey(c.x, c.y)));
  const res = [...prev];
  for (const c of add) {
    const k = cellKey(c.x, c.y);
    if (!set.has(k)) {
      set.add(k);
      res.push(c);
    }
  }
  return res;
}

/** 从 prev 中移除 toRemove 中的单元格 */
export function subtractCells(prev: Cell[], toRemove: Cell[]): Cell[] {
  const removeSet = new Set(toRemove.map((c) => cellKey(c.x, c.y)));
  return prev.filter((c) => !removeSet.has(cellKey(c.x, c.y)));
}

/**
 * 将单元格坐标转换为唯一键值
 */
export function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

/**
 * 将数值限制在指定范围内
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * 验证单元格坐标是否在画布限制范围内
 */
export function isValidCell(cell: Cell): boolean {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < MAX_CANVAS_SIZE &&
    cell.y < MAX_CANVAS_SIZE
  );
}

/**
 * 限制单元格坐标在画布范围内
 */
export function clampCell(cell: Cell): Cell {
  return {
    x: clamp(cell.x, 0, MAX_CANVAS_SIZE - 1),
    y: clamp(cell.y, 0, MAX_CANVAS_SIZE - 1),
  };
}

/**
 * 获取画布的实际像素尺寸
 */
export function getCanvasPixelSize(): { width: number; height: number } {
  return { width: MAX_CANVAS_SIZE, height: MAX_CANVAS_SIZE };
}

/**
 * 获取画布的格子数量
 */
export function getCanvasGridCount(): { width: number; height: number } {
  return {
    width: MAX_CANVAS_SIZE / SIZE,
    height: MAX_CANVAS_SIZE / SIZE,
  };
}

/**
 * 构建矩形区域内的所有单元格
 */
export function buildCellsInRect(cellA: Cell, cellB: Cell): Cell[] {
  const minX = Math.min(cellA.x, cellB.x);
  const maxX = Math.max(cellA.x, cellB.x);
  const minY = Math.min(cellA.y, cellB.y);
  const maxY = Math.max(cellA.y, cellB.y);
  const clampedMinX = Math.max(0, minX);
  const clampedMaxX = Math.min(MAX_CANVAS_SIZE - 1, maxX);
  const clampedMinY = Math.max(0, minY);
  const clampedMaxY = Math.min(MAX_CANVAS_SIZE - 1, maxY);
  const result: Cell[] = [];
  for (let y = clampedMinY; y <= clampedMaxY; y++) {
    for (let x = clampedMinX; x <= clampedMaxX; x++) {
      result.push({ x, y });
    }
  }
  return result;
}

function segmentEndKey(seg: Segment, useStart: boolean): string {
  const x = useStart ? seg.x1 : seg.x2;
  const y = useStart ? seg.y1 : seg.y2;
  return `${x},${y}`;
}

/**
 * 将线段按连通分量分组（共享顶点的线段属于同一轮廓）
 */
function findSegmentComponents(segments: Segment[], pointToSegs: Map<string, Segment[]>): Segment[][] {
  const used = new Set<Segment>();
  const components: Segment[][] = [];

  for (const seed of segments) {
    if (used.has(seed)) continue;
    const comp: Segment[] = [];
    const queue: Segment[] = [seed];
    used.add(seed);

    while (queue.length > 0) {
      const seg = queue.shift()!;
      comp.push(seg);
      const k1 = segmentEndKey(seg, true);
      const k2 = segmentEndKey(seg, false);
      for (const key of [k1, k2]) {
        const neighbors = pointToSegs.get(key) || [];
        for (const n of neighbors) {
          if (!used.has(n)) {
            used.add(n);
            queue.push(n);
          }
        }
      }
    }
    components.push(comp);
  }
  return components;
}

/**
 * 将单个连通分量的线段排成首尾相连的闭合路径
 */
function orderSegmentChain(component: Segment[], pointToSegs: Map<string, Segment[]>): Segment[] {
  if (component.length === 0) return [];
  if (component.length === 1) return [component[0]];

  const compSet = new Set(component);
  const used = new Set<Segment>();
  const result: Segment[] = [];
  const current = component[0];
  let currentEnd = segmentEndKey(current, false);
  result.push(current);
  used.add(current);

  while (result.length < component.length) {
    const neighbors = pointToSegs.get(currentEnd) || [];
    let found = false;
    for (const seg of neighbors) {
      if (!compSet.has(seg) || used.has(seg)) continue;
      const startKey = segmentEndKey(seg, true);
      const endKey = segmentEndKey(seg, false);
      const next = startKey === currentEnd ? seg : { x1: seg.x2, y1: seg.y2, x2: seg.x1, y2: seg.y1 };
      const nextEnd = startKey === currentEnd ? endKey : startKey;
      result.push(next);
      used.add(seg);
      currentEnd = nextEnd;
      found = true;
      break;
    }
    if (!found) break;
  }
  return result;
}

/**
 * 将无序的线段排序成首尾相连的路径；支持多个封闭图形，每个图形内部有序且彼此独立。
 * @param segments 无序的线段数组
 * @returns 多个闭合路径，每个路径为首尾相连的 Segment 数组
 */
export function sortSegmentsIntoPath(segments: Segment[]): Segment[][] {
  if (segments.length === 0) return [];

  const pointToSegs = new Map<string, Segment[]>();
  for (const seg of segments) {
    const k1 = segmentEndKey(seg, true);
    const k2 = segmentEndKey(seg, false);
    if (!pointToSegs.has(k1)) pointToSegs.set(k1, []);
    if (!pointToSegs.has(k2)) pointToSegs.set(k2, []);
    pointToSegs.get(k1)!.push(seg);
    pointToSegs.get(k2)!.push(seg);
  }

  const components = findSegmentComponents(segments, pointToSegs);
  return components.map((comp) => orderSegmentChain(comp, pointToSegs));
}
