import { Cell, Segment, Pt } from "./types";

const dir = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

export function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

export function coordinateToUniqueKey(x: number, y: number) {
	return (BigInt(x) << 64n) | BigInt(y);
}

/**
 * dfs 判断连通性
 * @param cells
 * @returns
 */
export function isConnected(cells: Cell[]) {
  console.log('>>>>111')
	if (cells.length === 0) return false;

	const set = new Set(cells.map((c) => coordinateToUniqueKey(c.x, c.y)));
	const stack = [cells[0]];
	const visited = new Set<bigint>();

	while (stack.length) {
		const { x, y } = stack.pop()!;
		const key = coordinateToUniqueKey(x, y);
		if (visited.has(key)) continue;
		visited.add(key);

		for (const [offsetX, offsetY] of dir) {
			const nx = x + offsetX;
			const ny = y + offsetY;
			const nk = coordinateToUniqueKey(nx, ny);
			if (set.has(nk) && !visited.has(nk)) stack.push({ x: nx, y: ny });
		}
	}

	return visited.size === set.size;
}

const encodeUndirectedEdge = (a: Pt, b: Pt): [Pt, Pt, bigint] => {
  console.log('>>>>222')
	// 先确定边的“最小点”和“最大点”（按x优先，x相同按y）
	const [minPt, maxPt] = a.x < b.x || (a.x === b.x && a.y < b.y) ? [a, b] : [b, a];
	// 编码：高64位存minPt（x占32位，y占32位），低64位存maxPt（同理）
	// 注：如果x/y范围不大（比如<2^30），用Number也可以，这里用BigInt避免溢出
	const minCode = (BigInt(minPt.x) << 40n) | BigInt(minPt.y);
	const maxCode = (BigInt(maxPt.x) << 40n) | BigInt(maxPt.y);
	return [minPt, maxPt, (minCode << 80n) | maxCode];
};

/**
 * 外边界线段（格点坐标），内部共享边抵消，只保留轮廓边。
 */
export function cellsToBorderSegments(cells: Cell[]): Segment[] {
  console.log('>>>>333')
	const edgeMap = new Map<bigint, [Pt, Pt]>();

	// 优化3：复用toggle逻辑，但操作Map而非Set，且避免字符串
	const toggleEdge = (a: Pt, b: Pt) => {
		const [minPt, maxPt, key] = encodeUndirectedEdge(a, b);
		if (edgeMap.has(key)) {
			edgeMap.delete(key); // 抵消内部边
		} else {
			edgeMap.set(key, [minPt, maxPt]); // 存储边的原始坐标
		}
	};

	// 优化4：复用顶点对象（减少临时对象创建）
	const getVertex = (x: number, y: number) => ({ x, y });
	// 遍历单元格（核心逻辑不变，优化顶点创建）
	for (const { x, y } of cells) {
		const p00 = getVertex(x, y);
		const p10 = getVertex(x + 1, y);
		const p11 = getVertex(x + 1, y + 1);
		const p01 = getVertex(x, y + 1);

		toggleEdge(p00, p10);
		toggleEdge(p10, p11);
		toggleEdge(p11, p01);
		toggleEdge(p01, p00);
	}

	// 优化5：直接从Map取坐标，避免字符串解析
	const segs: Segment[] = [];
	for (const [a, b] of edgeMap.values()) {
		segs.push({
			x1: a.x,
			y1: a.y,
			x2: b.x,
			y2: b.y,
		});
	}

	return segs;
}

/**
 * 合并cell
 * @param prev
 * @param add
 * @returns
 */
export function unionCells(prev: Cell[], add: Cell[]) {
  console.log(prev,add,'>>>>prev,add')
	const set = new Set(prev.map((c) => coordinateToUniqueKey(c.x, c.y)));
	const res = [...prev];
	for (const c of add) {
    console.log(c,'>>>>c')
		const k = coordinateToUniqueKey(c.x, c.y);
    console.log(set,k,'>>>>set,k')
		if (!set.has(k)) {
      console.log('>>>>111')
			set.add(k);
			res.push(c);
		}
	}
  console.log(res,'>>>>res')
	return res;
}
