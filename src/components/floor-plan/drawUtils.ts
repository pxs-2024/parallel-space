import { Cell, DragMode, Point, Space } from "./types";
import { DragState } from "./canvas-grid-selector22";
import { MAX_CANVAS_SIZE, SIZE } from "./constants";
import { clampCell } from "./utils";

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

export const resetCanvas = (
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	viewPortInfo: ViewPortInfo,
	viewInfo: ViewInfo,
	screenToWorldPx: (screenX: number, screenY: number) => { worldX: number; worldY: number }
) => {
	const devicePixelRatio = window.devicePixelRatio || 1;
	const { width, height } = viewPortInfo;

	// 完全重置变换并清空画布
	ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 先绘制整个视口的黑色背景
	drawBackground(ctx, width, height);

	// 设置视口变换（平移和缩放）
	const { translateX, translateY, scale } = viewInfo;
	ctx.setTransform(
		devicePixelRatio * scale,
		0,
		0,
		devicePixelRatio * scale,
		devicePixelRatio * translateX,
		devicePixelRatio * translateY
	);
	drawGrid(ctx, viewPortInfo, screenToWorldPx, scale);
};

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, width, height);
};

const drawGrid = (
	ctx: CanvasRenderingContext2D,
	viewPortInfo: ViewPortInfo,
	screenToWorldPx: (screenX: number, screenY: number) => { worldX: number; worldY: number },
	scale: number
) => {
	const topLeft = screenToWorldPx(0, 0);
	const bottomRight = screenToWorldPx(viewPortInfo.width, viewPortInfo.height);
	const minWorldX = topLeft.worldX;
	const maxWorldX = bottomRight.worldX;
	const minWorldY = topLeft.worldY;
	const maxWorldY = bottomRight.worldY;

	// 绘制画布区域的白色背景（带圆角）
	const cornerRadius = 16 / scale; // 圆角半径，根据缩放调整
	ctx.fillStyle = "#ffffff";
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

	// 绘制网格线（只在画布范围内绘制）
	ctx.lineWidth = 1 / scale;
	ctx.strokeStyle = "#ff000012";
	ctx.beginPath();
	for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
		const x = gridX * SIZE;
		// 只在画布范围内绘制竖线
		if (x >= canvasMinX && x <= canvasMaxX) {
			ctx.moveTo(x, Math.max(minWorldY, canvasMinY));
			ctx.lineTo(x, Math.min(maxWorldY, canvasMaxY));
		}
	}
	for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
		const y = gridY * SIZE;
		// 只在画布范围内绘制横线
		if (y >= canvasMinY && y <= canvasMaxY) {
			ctx.moveTo(Math.max(minWorldX, canvasMinX), y);
			ctx.lineTo(Math.min(maxWorldX, canvasMaxX), y);
		}
	}
	ctx.stroke();
};
// 绘制空间
export const drawSpaces = (ctx: CanvasRenderingContext2D, spaceList: Space[], scale: number) => {
	if (spaceList.length) {
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = "#2563eb";
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
		// 房间名称：取格点中心为文字位置，字号随缩放调整
		const fontSize = Math.max(10, 14 / scale);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "rgba(0,0,0,0.7)";
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
export const drawSelectedCells = (ctx: CanvasRenderingContext2D, selectedCells: Cell[]) => {
	if (selectedCells.length) {
		ctx.fillStyle = "rgba(59,130,246,0.85)";
		for (const cell of selectedCells) {
			ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
		}
	}
};

// 绘制hover空间样式
export const drawHoverSpace = (ctx: CanvasRenderingContext2D, hoverSpace: Space, scale: number) => {
	if (hoverSpace.segs.length > 0) {
		ctx.fillStyle = "rgba(37,99,235,0.10)";
		for (const cell of hoverSpace.cells) {
			ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
		}
	}
	ctx.lineWidth = 4 / scale;
	ctx.strokeStyle = "#1d4ed8";
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
	scale: number
) => {
	if (selectedSpaceId) {
		const selectedSpace = spaceList.find((s) => s.id === selectedSpaceId);
		if (selectedSpace && selectedSpace.segs.length > 0) {
			ctx.lineWidth = 5 / scale;
			ctx.strokeStyle = "rgba(0,0,0,0.35)";
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
	scale: number
) => {
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

	// 只在画布范围内绘制框选覆盖层
	if (
		left >= canvasMinX &&
		left + rectWidth <= canvasMaxX &&
		top >= canvasMinY &&
		top + rectHeight <= canvasMaxY
	) {
		ctx.fillStyle = "rgba(37,99,235,0.10)";
		ctx.strokeStyle = "#2563eb";
		ctx.lineWidth = 1 / scale;
		ctx.fillRect(left, top, rectWidth, rectHeight);
		ctx.strokeRect(left, top, rectWidth, rectHeight);
	}
};

export const drawPoint = (ctx: CanvasRenderingContext2D, point: Point, scale: number) => {
	ctx.fillStyle = "rgba(37,99,235,0.10)";
	drawCircle(ctx, point.x * SIZE, point.y * SIZE, 4, { fill: "rgba(255,0,0,1) " });
};

function drawCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	options: { fill: string; stroke?: string; lineWidth?: number } = {
		fill: "rgba(37,99,235,0.10)",
		stroke: "#2563eb",
		lineWidth: 1,
	}
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
