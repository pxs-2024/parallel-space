import { Cell, DragMode, Point, Space } from "./types";
import { DragState } from "./canvas-grid-selector22";
import { MAX_CANVAS_SIZE, SIZE } from "./constants";
import { clampCell } from "./utils";

export type CanvasTheme = {
	viewportBg: string;
	paperBg: string;
	gridLine: string;
	spaceStroke: string;
	spaceLabel: string;
	selectedFill: string;
	hoverFill: string;
	hoverStroke: string;
	selectedSpaceRing: string;
	boxFill: string;
	boxStroke: string;
	pointFill: string;
};

const DEFAULT_CANVAS_THEME: CanvasTheme = {
	viewportBg: "oklch(0.141 0.005 285.823)",
	paperBg: "oklch(0.21 0.006 285.885)",
	gridLine: "oklch(1 0 0 / 0.08)",
	spaceStroke: "oklch(0.606 0.25 292.717)",
	spaceLabel: "oklch(0.985 0 0 / 0.8)",
	selectedFill: "oklch(0.606 0.25 292.717 / 0.85)",
	hoverFill: "oklch(0.606 0.25 292.717 / 0.15)",
	hoverStroke: "oklch(0.606 0.25 292.717)",
	selectedSpaceRing: "oklch(0.985 0 0 / 0.3)",
	boxFill: "oklch(0.606 0.25 292.717 / 0.15)",
	boxStroke: "oklch(0.606 0.25 292.717)",
	pointFill: "oklch(0.704 0.191 22.216)",
};

/** 从元素或文档根读取画布主题（传入 canvas 时可读父级 .canvas-transparent 的透明背景） */
export function getCanvasTheme(canvas?: HTMLCanvasElement | null): CanvasTheme {
	if (typeof document === "undefined") return DEFAULT_CANVAS_THEME;
	const el = canvas?.parentElement ?? document.documentElement;
	const s = getComputedStyle(el);
	const get = (v: string) => s.getPropertyValue(v).trim();
	return {
		viewportBg: get("--canvas-viewport-bg") || DEFAULT_CANVAS_THEME.viewportBg,
		paperBg: get("--canvas-paper-bg") || DEFAULT_CANVAS_THEME.paperBg,
		gridLine: get("--canvas-grid-line") || DEFAULT_CANVAS_THEME.gridLine,
		spaceStroke: get("--canvas-space-stroke") || DEFAULT_CANVAS_THEME.spaceStroke,
		spaceLabel: get("--canvas-space-label") || DEFAULT_CANVAS_THEME.spaceLabel,
		selectedFill: get("--canvas-selected-fill") || DEFAULT_CANVAS_THEME.selectedFill,
		hoverFill: get("--canvas-hover-fill") || DEFAULT_CANVAS_THEME.hoverFill,
		hoverStroke: get("--canvas-hover-stroke") || DEFAULT_CANVAS_THEME.hoverStroke,
		selectedSpaceRing: get("--canvas-selected-space-ring") || DEFAULT_CANVAS_THEME.selectedSpaceRing,
		boxFill: get("--canvas-box-fill") || DEFAULT_CANVAS_THEME.boxFill,
		boxStroke: get("--canvas-box-stroke") || DEFAULT_CANVAS_THEME.boxStroke,
		pointFill: get("--canvas-point-fill") || DEFAULT_CANVAS_THEME.pointFill,
	};
}

type ViewPortInfo = {
	width: number;
	height: number;
};
type ViewInfo = {
	translateX: number;
	translateY: number;
	scale: number;
};

const canvasMinX = 0;
const canvasMinY = 0;
const canvasMaxX = MAX_CANVAS_SIZE;
const canvasMaxY = MAX_CANVAS_SIZE;

export type ResetCanvasOptions = {
	/** 是否绘制网格（编辑模式且网格为“显示”时为 true） */
	showGrid?: boolean;
};

export const resetCanvas = (
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	viewPortInfo: ViewPortInfo,
	viewInfo: ViewInfo,
	screenToWorldPx: (screenX: number, screenY: number) => { worldX: number; worldY: number },
	theme?: CanvasTheme,
	options?: ResetCanvasOptions
) => {
	const t = theme ?? getCanvasTheme();
	const devicePixelRatio = window.devicePixelRatio || 1;
	const { width, height } = viewPortInfo;
	const showGrid = options?.showGrid ?? true;

	ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	drawBackground(ctx, width, height, t);

	const { translateX, translateY, scale } = viewInfo;
	ctx.setTransform(
		devicePixelRatio * scale,
		0,
		0,
		devicePixelRatio * scale,
		devicePixelRatio * translateX,
		devicePixelRatio * translateY
	);
	if (showGrid) {
		drawGrid(ctx, viewPortInfo, screenToWorldPx, scale, t);
	}
};

const drawBackground = (
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	theme: CanvasTheme
) => {
	ctx.fillStyle = theme.viewportBg;
	ctx.fillRect(0, 0, width, height);
};

const drawGrid = (
	ctx: CanvasRenderingContext2D,
	viewPortInfo: ViewPortInfo,
	screenToWorldPx: (screenX: number, screenY: number) => { worldX: number; worldY: number },
	scale: number,
	theme: CanvasTheme
) => {
	const topLeft = screenToWorldPx(0, 0);
	const bottomRight = screenToWorldPx(viewPortInfo.width, viewPortInfo.height);
	const minWorldX = topLeft.worldX;
	const maxWorldX = bottomRight.worldX;
	const minWorldY = topLeft.worldY;
	const maxWorldY = bottomRight.worldY;

	// 绘制画布区域背景（带圆角，跟随主题）
	const cornerRadius = 16 / scale;
	ctx.fillStyle = theme.paperBg;
	ctx.beginPath();
	ctx.roundRect(
		canvasMinX,
		canvasMinY,
		canvasMaxX - canvasMinX,
		canvasMaxY - canvasMinY,
		cornerRadius
	);
	ctx.fill();
	const minGridX = Math.floor(Math.max(minWorldX, canvasMinX) / SIZE) - 1;
	const maxGridX = Math.floor(Math.min(maxWorldX, canvasMaxX) / SIZE) + 1;
	const minGridY = Math.floor(Math.max(minWorldY, canvasMinY) / SIZE) - 1;
	const maxGridY = Math.floor(Math.min(maxWorldY, canvasMaxY) / SIZE) + 1;

	ctx.lineWidth = 1 / scale;
	ctx.strokeStyle = theme.gridLine;
	ctx.beginPath();
	for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
		const x = gridX * SIZE;
		if (x >= canvasMinX && x <= canvasMaxX) {
			ctx.moveTo(x, Math.max(minWorldY, canvasMinY));
			ctx.lineTo(x, Math.min(maxWorldY, canvasMaxY));
		}
	}
	for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
		const y = gridY * SIZE;
		if (y >= canvasMinY && y <= canvasMaxY) {
			ctx.moveTo(Math.max(minWorldX, canvasMinX), y);
			ctx.lineTo(Math.min(maxWorldX, canvasMaxX), y);
		}
	}
	ctx.stroke();
};

// 绘制空间
export const drawSpaces = (
	ctx: CanvasRenderingContext2D,
	spaceList: Space[],
	scale: number,
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	if (spaceList.length) {
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = t.spaceStroke;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		for (const space of spaceList) {
			if (space.segs.length === 0) continue;
			for (const path of space.segs) {
				if (path.length === 0) continue;
				ctx.beginPath();
				const first = path[0];
				ctx.moveTo(first.x1 * SIZE, first.y1 * SIZE);
				ctx.lineTo(first.x2 * SIZE, first.y2 * SIZE);
				for (let i = 1; i < path.length; i++) {
					ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
				}
				ctx.closePath();
				ctx.stroke();
			}
		}
		const fontSize = Math.max(10, 14 / scale);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = t.spaceLabel;
		for (const space of spaceList) {
			if (space.cells.length === 0) continue;
			let sumX = 0;
			let sumY = 0;
			for (const c of space.cells) {
				sumX += c.x + 0.5;
				sumY += c.y + 0.5;
			}
			const centerX = (sumX / space.cells.length) * SIZE;
			const centerY = (sumY / space.cells.length) * SIZE;
			ctx.fillText(space.name, centerX, centerY);
		}
	}
};

// 绘制选中单元格
export const drawSelectedCells = (
	ctx: CanvasRenderingContext2D,
	selectedCells: Cell[],
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	if (selectedCells.length) {
		ctx.fillStyle = t.selectedFill;
		for (const cell of selectedCells) {
			ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
		}
	}
};

// 绘制hover空间样式
export const drawHoverSpace = (
	ctx: CanvasRenderingContext2D,
	hoverSpace: Space,
	scale: number,
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	if (hoverSpace.segs.length > 0) {
		ctx.fillStyle = t.hoverFill;
		for (const cell of hoverSpace.cells) {
			ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
		}
	}
	ctx.lineWidth = 4 / scale;
	ctx.strokeStyle = t.hoverStroke;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const path of hoverSpace.segs) {
		if (path.length === 0) continue;
		ctx.beginPath();
		ctx.moveTo(path[0].x1 * SIZE, path[0].y1 * SIZE);
		ctx.lineTo(path[0].x2 * SIZE, path[0].y2 * SIZE);
		for (let i = 1; i < path.length; i++) {
			ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
		}
		ctx.closePath();
		ctx.stroke();
	}
};

// 绘制选中空间样式
export const drawBoxSelectCells = (
	ctx: CanvasRenderingContext2D,
	spaceList: Space[],
	selectedSpaceId: string | null,
	scale: number,
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	if (selectedSpaceId) {
		const selectedSpace = spaceList.find((s) => s.id === selectedSpaceId);
		if (selectedSpace && selectedSpace.segs.length > 0) {
			ctx.lineWidth = 5 / scale;
			ctx.strokeStyle = t.selectedSpaceRing;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			for (const path of selectedSpace.segs) {
				if (path.length === 0) continue;
				ctx.beginPath();
				ctx.moveTo(path[0].x1 * SIZE, path[0].y1 * SIZE);
				ctx.lineTo(path[0].x2 * SIZE, path[0].y2 * SIZE);
				for (let i = 1; i < path.length; i++) {
					ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
				}
				ctx.closePath();
				ctx.stroke();
			}
		}
	}
};

// 绘制框选单元格的覆盖层（激活状态）
export const drawActiveBoxSelectCells = (
	ctx: CanvasRenderingContext2D,
	state: DragState,
	scale: number,
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	const startCell = clampCell(state.startCell);
	const endCell = clampCell(state.currentCell);
	const minX = Math.min(startCell.x, endCell.x);
	const maxX = Math.max(startCell.x, endCell.x);
	const minY = Math.min(startCell.y, endCell.y);
	const maxY = Math.max(startCell.y, endCell.y);

	const left = minX * SIZE;
	const top = minY * SIZE;
	const rectWidth = (maxX - minX + 1) * SIZE;
	const rectHeight = (maxY - minY + 1) * SIZE;

	if (
		left >= canvasMinX &&
		left + rectWidth <= canvasMaxX &&
		top >= canvasMinY &&
		top + rectHeight <= canvasMaxY
	) {
		ctx.fillStyle = t.boxFill;
		ctx.strokeStyle = t.boxStroke;
		ctx.lineWidth = 1 / scale;
		ctx.fillRect(left, top, rectWidth, rectHeight);
		ctx.strokeRect(left, top, rectWidth, rectHeight);
	}
};

export const drawPoint = (
	ctx: CanvasRenderingContext2D,
	point: Point,
	scale: number,
	theme?: CanvasTheme
) => {
	const t = theme ?? getCanvasTheme();
	drawCircle(ctx, point.x * SIZE, point.y * SIZE, 4, { fill: t.pointFill });
};

function drawCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	options: { fill: string; stroke?: string; lineWidth?: number }
) {
	const { fill, stroke, lineWidth = 1 } = options;

	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.closePath();
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fill();
	}

	if (stroke) {
		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = stroke;
		ctx.stroke();
	}
}
