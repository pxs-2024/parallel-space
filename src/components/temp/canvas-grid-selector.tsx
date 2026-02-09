"use client";

import { useEffect, useRef, useState } from "react";
import {
	cellsToBorderSegments,
	clamp,
	coordinateToUniqueKey,
	isConnected,
	unionCells,
} from "./utils";
import { Cell, Shape } from "./types";
import { DRAG_THRESHOLD_PX, MAX_SCALE_VALUE, MIN_SCALE_VALUE, SIZE } from "./constants";

function keyOf(c: Cell) {
	return `${c.x},${c.y}`;
}

const CanvasGridSelector = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const [selected, setSelected] = useState<Cell[]>([]);
	const [shapes, setShapes] = useState<Shape[]>([]);
	const [error, setError] = useState("");

	const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

	// latest refs
	const selectedRef = useRef<Cell[]>([]);
	const shapesRef = useRef<Shape[]>([]);
	selectedRef.current = selected;
	shapesRef.current = shapes;

	const selectedShapeIdRef = useRef<string | null>(null);
	selectedShapeIdRef.current = selectedShapeId;

	// hover ref
	const hoverShapeIdRef = useRef<string | null>(null);

	// shape -> cellSet
	const shapeCellSetRef = useRef<Map<string, Set<string>>>(new Map());

	// viewport transform
	const viewRef = useRef({ tx: 0, ty: 0, scale: 1 });
	const viewportRef = useRef({ w: 800, h: 600 });

	// space key
	const spaceRef = useRef(false);

	// drag state
	type DragMode = "none" | "pan" | "moveShape" | "boxSelectCells";
	const dragStateRef = useRef<{
		mode: DragMode;
		startSx: number;
		startSy: number;

		baseTx: number;
		baseTy: number;

		startCell: Cell | null;
		curCell: Cell | null;

		shapeId: string | null;
		baseShapeCells: Cell[] | null;

		activated: boolean;

		// 本次 pointerdown 时是否按着 shift（锁定，避免中途按/松导致逻辑跳变）
		shiftAtStart: boolean;
	}>({
		mode: "none",
		startSx: 0,
		startSy: 0,
		baseTx: 0,
		baseTy: 0,
		startCell: null,
		curCell: null,
		shapeId: null,
		baseShapeCells: null,
		activated: false,
		shiftAtStart: false,
	});

	// raf redraw
	const rafRef = useRef<number | null>(null);
	const pendingRef = useRef(false);

	const scheduleDraw = () => {
		if (rafRef.current != null) {
			pendingRef.current = true;
			return;
		}
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			draw();
			if (pendingRef.current) {
				pendingRef.current = false;
				scheduleDraw();
			}
		});
	};

	const resizeCanvasToDPR = () => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const w = wrap.clientWidth;
		const h = wrap.clientHeight;
		viewportRef.current = { w, h };

		const dpr = window.devicePixelRatio || 1;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
	};

	// coords
	const getScreenXYFromClient = (clientX: number, clientY: number) => {
		const wrap = wrapRef.current;
		if (!wrap) return null;
		const r = wrap.getBoundingClientRect();
		const sx = clientX - r.left;
		const sy = clientY - r.top;
		const { w, h } = viewportRef.current;
		if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
		return { sx, sy };
	};

	const screenToWorldPx = (sx: number, sy: number) => {
		const { tx, ty, scale } = viewRef.current;
		return { wx: (sx - tx) / scale, wy: (sy - ty) / scale };
	};

	const getCellFromScreen = (sx: number, sy: number): Cell => {
		const { wx, wy } = screenToWorldPx(sx, sy);
		return { x: Math.floor(wx / SIZE), y: Math.floor(wy / SIZE) };
	};

	const getCellFromClient = (clientX: number, clientY: number): Cell | null => {
		const s = getScreenXYFromClient(clientX, clientY);
		if (!s) return null;
		return getCellFromScreen(s.sx, s.sy);
	};

	const buildCellsInRect = (a: Cell, b: Cell) => {
		const minX = Math.min(a.x, b.x);
		const maxX = Math.max(a.x, b.x);
		const minY = Math.min(a.y, b.y);
		const maxY = Math.max(a.y, b.y);
		const res: Cell[] = [];
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) res.push({ x, y });
		}
		return res;
	};

	const toggleCell = (c: Cell) => {
		setError("");
		setSelected((prev) => {
      const k = keyOf(c);
      const has = prev.some((p) => keyOf(p) === k);
      return has ? prev.filter((p) => keyOf(p) !== k) : [...prev, c];
    });
	};

	// innermost hit
	const hitTestInnermostShapeIdByCell = (cell: Cell): string | null => {
		const ss = shapesRef.current;
		if (!ss.length) return null;
		const map = shapeCellSetRef.current;
		const ck = `${cell.x},${cell.y}`;

		let bestId: string | null = null;
		let bestArea = Infinity;

		for (let i = ss.length - 1; i >= 0; i--) {
			const s = ss[i];
			const set = map.get(s.id);
			if (!set || !set.has(ck)) continue;
			const area = s.cells.length;
			if (area < bestArea) {
				bestArea = area;
				bestId = s.id;
			}
		}
		return bestId;
	};

	const updateShapeById = (id: string, nextCells: Cell[]) => {
		setShapes((prev) =>
			prev.map((s) =>
				s.id === id ? { ...s, cells: nextCells, segs: cellsToBorderSegments(nextCells) } : s
			)
		);
	};

	const confirm = () => {
		const curSel = selectedRef.current;
		if (!isConnected(curSel)) {
			setError("❌ 选中的方块不连续");
			return;
		}
		const segs = cellsToBorderSegments(curSel);
		const id = `${Date.now()}-${Math.random()}`;

		setShapes((prev) => [...prev, { id, cells: curSel.map((c) => ({ ...c })), segs }]);

		setSelected([]);
		setError("");
		setSelectedShapeId(id);
	};

	const clearSelected = () => {
		setSelected([]);
		setError("");
	};

	const clearShapes = () => {
		setShapes([]);
		setError("");
		hoverShapeIdRef.current = null;
		setSelectedShapeId(null);
		scheduleDraw();
	};

	// draw
	const draw = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const { w, h } = viewportRef.current;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		const { tx, ty, scale } = viewRef.current;
		ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * tx, dpr * ty);

		const tl = screenToWorldPx(0, 0);
		const br = screenToWorldPx(w, h);
		const minWx = Math.min(tl.wx, br.wx);
		const maxWx = Math.max(tl.wx, br.wx);
		const minWy = Math.min(tl.wy, br.wy);
		const maxWy = Math.max(tl.wy, br.wy);

		const minGX = Math.floor(minWx / SIZE) - 1;
		const maxGX = Math.floor(maxWx / SIZE) + 1;
		const minGY = Math.floor(minWy / SIZE) - 1;
		const maxGY = Math.floor(maxWy / SIZE) + 1;

		ctx.lineWidth = 1 / scale;
		ctx.strokeStyle = "#e5e7eb";
		ctx.beginPath();
		for (let gx = minGX; gx <= maxGX; gx++) {
			const x = gx * SIZE;
			ctx.moveTo(x, minWy - SIZE);
			ctx.lineTo(x, maxWy + SIZE);
		}
		for (let gy = minGY; gy <= maxGY; gy++) {
			const y = gy * SIZE;
			ctx.moveTo(minWx - SIZE, y);
			ctx.lineTo(maxWx + SIZE, y);
		}
		ctx.stroke();

		// selected cells
		const sel = selectedRef.current;
		if (sel.length) {
			ctx.fillStyle = "rgba(59,130,246,0.85)";
			for (const c of sel) ctx.fillRect(c.x * SIZE, c.y * SIZE, SIZE, SIZE);
		}

		// shapes outlines
		const ss = shapesRef.current;
		if (ss.length) {
			ctx.lineWidth = 2 / scale;
			ctx.strokeStyle = "#2563eb";
			for (const shape of ss) {
				ctx.beginPath();
				for (const s of shape.segs) {
					ctx.moveTo(s.x1 * SIZE, s.y1 * SIZE);
					ctx.lineTo(s.x2 * SIZE, s.y2 * SIZE);
				}
				ctx.stroke();
			}
		}

		// hover highlight
		const hoverId = hoverShapeIdRef.current;
		if (hoverId) {
			const hoverShape = ss.find((x) => x.id === hoverId);
			if (hoverShape) {
				ctx.fillStyle = "rgba(37,99,235,0.10)";
				for (const c of hoverShape.cells) ctx.fillRect(c.x * SIZE, c.y * SIZE, SIZE, SIZE);

				ctx.lineWidth = 4 / scale;
				ctx.strokeStyle = "#1d4ed8";
				ctx.beginPath();
				for (const s of hoverShape.segs) {
					ctx.moveTo(s.x1 * SIZE, s.y1 * SIZE);
					ctx.lineTo(s.x2 * SIZE, s.y2 * SIZE);
				}
				ctx.stroke();
			}
		}

		// selected shape outline (persistent)
		const selShapeId = selectedShapeIdRef.current;
		if (selShapeId) {
			const selShape = ss.find((x) => x.id === selShapeId);
			if (selShape) {
				ctx.lineWidth = 5 / scale;
				ctx.strokeStyle = "rgba(0,0,0,0.35)";
				ctx.beginPath();
				for (const s of selShape.segs) {
					ctx.moveTo(s.x1 * SIZE, s.y1 * SIZE);
					ctx.lineTo(s.x2 * SIZE, s.y2 * SIZE);
				}
				ctx.stroke();
			}
		}

		// box select cells overlay (activated)
		const st = dragStateRef.current;
		if (st.mode === "boxSelectCells" && st.activated && st.startCell && st.curCell) {
			const a = st.startCell;
			const b = st.curCell;
			const minX = Math.min(a.x, b.x);
			const maxX = Math.max(a.x, b.x);
			const minY = Math.min(a.y, b.y);
			const maxY = Math.max(a.y, b.y);

			const left = minX * SIZE;
			const top = minY * SIZE;
			const ww = (maxX - minX + 1) * SIZE;
			const hh = (maxY - minY + 1) * SIZE;

			ctx.fillStyle = "rgba(37,99,235,0.10)";
			ctx.strokeStyle = "#2563eb";
			ctx.lineWidth = 1 / scale;
			ctx.fillRect(left, top, ww, hh);
			ctx.strokeRect(left, top, ww, hh);
		}
	};

	// wheel: ctrl/cmd zoom, else pan
	const onWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const s = getScreenXYFromClient(e.clientX, e.clientY);
		if (!s) return;

		const { sx, sy } = s;

		if (e.ctrlKey || e.metaKey) {
			const { tx, ty, scale } = viewRef.current;
			const wx = (sx - tx) / scale;
			const wy = (sy - ty) / scale;

			const zoomFactor = Math.exp(-e.deltaY * 0.001);
			const nextScale = clamp(scale * zoomFactor, MIN_SCALE_VALUE, MAX_SCALE_VALUE);

			const nextTx = sx - wx * nextScale;
			const nextTy = sy - wy * nextScale;

			viewRef.current = { tx: nextTx, ty: nextTy, scale: nextScale };
			scheduleDraw();
			return;
		}

		viewRef.current = {
			...viewRef.current,
			tx: viewRef.current.tx - e.deltaX,
			ty: viewRef.current.ty - e.deltaY,
		};
		scheduleDraw();
	};

	// init & resize
	useEffect(() => {
		resizeCanvasToDPR();
		const { w, h } = viewportRef.current;
		viewRef.current = { tx: w / 2, ty: h / 2, scale: 1 };
		draw();

		const onResize = () => {
			resizeCanvasToDPR();
			draw();
		};
		window.addEventListener("resize", onResize);

		const ro =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(() => {
						resizeCanvasToDPR();
						draw();
				  })
				: null;
		if (ro && wrapRef.current) ro.observe(wrapRef.current);

		return () => {
			window.removeEventListener("resize", onResize);
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			if (ro) ro.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// rebuild cellSet on shapes change
	useEffect(() => {
		const m = new Map<string, Set<string>>();
		for (const s of shapes) {
			m.set(s.id, new Set(s.cells.map((c) => `${c.x},${c.y}`)));
		}
		shapeCellSetRef.current = m;

		if (hoverShapeIdRef.current) {
			const exists = shapes.some((s) => s.id === hoverShapeIdRef.current);
			if (!exists) hoverShapeIdRef.current = null;
		}
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shapes]);

	useEffect(() => {
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected, selectedShapeId]);

	// space key
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				spaceRef.current = true;
			}
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") spaceRef.current = false;
		};
		window.addEventListener("keydown", onKeyDown, { passive: false });
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown as any);
			window.removeEventListener("keyup", onKeyUp as any);
		};
	}, []);

	// pointer handlers
	const onPointerDown = (e: React.PointerEvent) => {
		setError("");
		if ((e as any).button !== 0) return;

		const s = getScreenXYFromClient(e.clientX, e.clientY);
		if (!s) return;

		(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

		// Space = pan
		if (spaceRef.current) {
			dragStateRef.current = {
				mode: "pan",
				startSx: s.sx,
				startSy: s.sy,
				baseTx: viewRef.current.tx,
				baseTy: viewRef.current.ty,
				startCell: null,
				curCell: null,
				shapeId: null,
				baseShapeCells: null,
				activated: true,
				shiftAtStart: false,
			};
			return;
		}

		const startCell = getCellFromScreen(s.sx, s.sy);
		const shift = e.shiftKey;

		// Shift：强制进入选方块模式（只选 cell，不选 shape，不移动 shape）
		if (shift) {
			dragStateRef.current = {
				mode: "boxSelectCells",
				startSx: s.sx,
				startSy: s.sy,
				baseTx: viewRef.current.tx,
				baseTy: viewRef.current.ty,
				startCell,
				curCell: startCell,
				shapeId: null,
				baseShapeCells: null,
				activated: false,
				shiftAtStart: true,
			};
			return;
		}

		// 非 Shift：如果命中 shape -> 候选 moveShape；否则候选 boxSelectCells
		const hitId = hitTestInnermostShapeIdByCell(startCell);
		if (hitId) {
			const shape = shapesRef.current.find((x) => x.id === hitId);
			dragStateRef.current = {
				mode: "moveShape",
				startSx: s.sx,
				startSy: s.sy,
				baseTx: viewRef.current.tx,
				baseTy: viewRef.current.ty,
				startCell,
				curCell: startCell,
				shapeId: hitId,
				baseShapeCells: shape ? shape.cells.map((c) => ({ ...c })) : null,
				activated: false,
				shiftAtStart: false,
			};
			hoverShapeIdRef.current = hitId;
			scheduleDraw();
			return;
		}

		dragStateRef.current = {
			mode: "boxSelectCells",
			startSx: s.sx,
			startSy: s.sy,
			baseTx: viewRef.current.tx,
			baseTy: viewRef.current.ty,
			startCell,
			curCell: startCell,
			shapeId: null,
			baseShapeCells: null,
			activated: false,
			shiftAtStart: false,
		};
	};

	const onPointerMove = (e: React.PointerEvent) => {
		const st = dragStateRef.current;

		// non-drag hover
		if (st.mode === "none") {
			const c = getCellFromClient(e.clientX, e.clientY);
			const nextHoverId = c ? hitTestInnermostShapeIdByCell(c) : null;
			if (hoverShapeIdRef.current !== nextHoverId) {
				hoverShapeIdRef.current = nextHoverId;
				scheduleDraw();
			}
			return;
		}

		const s = getScreenXYFromClient(e.clientX, e.clientY);
		if (!s) return;

		// pan
		if (st.mode === "pan") {
			const dx = s.sx - st.startSx;
			const dy = s.sy - st.startSy;
			viewRef.current = {
				...viewRef.current,
				tx: st.baseTx + dx,
				ty: st.baseTy + dy,
			};
			scheduleDraw();
			return;
		}

		const dxPx = s.sx - st.startSx;
		const dyPx = s.sy - st.startSy;
		const dist = Math.hypot(dxPx, dyPx);

		if (!st.activated && dist >= DRAG_THRESHOLD_PX) st.activated = true;

		const curCell = getCellFromScreen(s.sx, s.sy);
		st.curCell = curCell;

		// move shape（非 shift 才可能进入）
		if (
			st.mode === "moveShape" &&
			st.activated &&
			st.shapeId &&
			st.startCell &&
			st.baseShapeCells
		) {
			const dcx = curCell.x - st.startCell.x;
			const dcy = curCell.y - st.startCell.y;
			const movedCells = st.baseShapeCells.map((c) => ({
				x: c.x + dcx,
				y: c.y + dcy,
			}));
			updateShapeById(st.shapeId, movedCells);
			hoverShapeIdRef.current = st.shapeId;
			scheduleDraw();
			return;
		}

		// box select cells（shift 或空白拖动）
		if (st.mode === "boxSelectCells") {
			scheduleDraw();
		}
	};

	const onPointerUp = () => {
		const st = dragStateRef.current;
		if (st.mode === "none") return;

		// 未激活 => click
		if (st.mode === "moveShape") {
			if (!st.activated && st.shapeId) {
				setSelectedShapeId(st.shapeId);
				hoverShapeIdRef.current = st.shapeId;
			} else if (st.shapeId) {
				setSelectedShapeId(st.shapeId);
			}
		} else if (st.mode === "boxSelectCells") {
			// Shift 优先：click/drag 都是对 cell 操作
			if (st.shiftAtStart && st.startCell) {
				if (!st.activated) {
					// shift + click => toggle cell
					setSelectedShapeId(null);
					toggleCell(st.startCell);
				} else if (st.activated && st.curCell) {
					// shift + drag => batch add cells
					const batch = buildCellsInRect(st.startCell, st.curCell);
					setSelected((prev) => unionCells(prev, batch));
				}
			} else {
				// 非 shift：只处理图形选中；空白不再 toggle cell（必须 Shift 才能选 cell）
				if (st.startCell) {
					if (!st.activated) {
						const hitId = hitTestInnermostShapeIdByCell(st.startCell);
						if (hitId) {
							setSelectedShapeId(hitId);
							hoverShapeIdRef.current = hitId;
						} else {
							// 点击空白：仅取消图形选中
							setSelectedShapeId(null);
							hoverShapeIdRef.current = null;
						}
					} else {
						// 非 shift 拖动空白：不框选 cell（保持 Figma：空白拖动通常是框选对象，这里先不做）
						// 如果你想改成“空白拖动框选 cell 但不需要 shift”，再告诉我。
					}
				}
			}
		}

		dragStateRef.current = {
			mode: "none",
			startSx: 0,
			startSy: 0,
			baseTx: 0,
			baseTy: 0,
			startCell: null,
			curCell: null,
			shapeId: null,
			baseShapeCells: null,
			activated: false,
			shiftAtStart: false,
		};

		scheduleDraw();
	};

	const onPointerLeave = () => {
		if (dragStateRef.current.mode === "none" && hoverShapeIdRef.current !== null) {
			hoverShapeIdRef.current = null;
			scheduleDraw();
		}
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<button
					onClick={confirm}
					disabled={!selected.length}
					className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
				>
					圈出来
				</button>

				<button onClick={clearSelected} className="px-4 py-2 rounded border border-gray-300">
					清空选中
				</button>

				<button onClick={clearShapes} className="px-4 py-2 rounded border border-gray-300">
					清空图形
				</button>

				{error && <span className="text-red-500">{error}</span>}
			</div>

			<div
				ref={wrapRef}
				className="relative w-full h-[70vh] border border-gray-300 overflow-hidden"
			>
				<canvas
					ref={canvasRef}
					className="block touch-none"
					onContextMenu={(e) => e.preventDefault()}
					onWheel={onWheel}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerLeave={onPointerLeave}
				/>
			</div>

			<div className="text-sm text-gray-600">
				Space+拖动：平移画布；Ctrl/Cmd+滚轮：缩放；普通滚轮：平移；
				<span className="font-medium">Shift 按下：进入选方块模式（点击/拖动只选 cell）</span>； 未按
				Shift：拖动图形移动，点击图形选中。
			</div>
		</div>
	);
};
export { CanvasGridSelector };
