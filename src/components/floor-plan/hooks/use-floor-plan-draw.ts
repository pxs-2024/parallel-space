"use client";

import { useRef, useCallback } from "react";
import type { DragState } from "../types";
import { MAX_CANVAS_SIZE, SIZE } from "../constants";
import { clampCell, isValidCell } from "../utils";

type ViewRef = React.MutableRefObject<{ translateX: number; translateY: number; scale: number }>;
type ViewportRef = React.MutableRefObject<{ width: number; height: number }>;

type UseFloorPlanDrawParams = {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	viewRef: ViewRef;
	viewportRef: ViewportRef;
	selectedRef: React.MutableRefObject<{ x: number; y: number }[]>;
	spacesRef: React.MutableRefObject<{ id: string; name: string; cells: { x: number; y: number }[]; segs: { x1: number; y1: number; x2: number; y2: number }[][] }[]>;
	selectedSpaceIdRef: React.MutableRefObject<string | null>;
	hoverSpaceIdRef: React.MutableRefObject<string | null>;
	dragStateRef: React.MutableRefObject<DragState>;
	screenToWorldPx: (sx: number, sy: number) => { worldX: number; worldY: number };
};

/**
 * 封装 requestAnimationFrame 节流的重绘与整幅画布绘制逻辑
 */
export function useFloorPlanDraw(params: UseFloorPlanDrawParams) {
	const {
		canvasRef,
		viewRef,
		viewportRef,
		selectedRef,
		spacesRef,
		selectedSpaceIdRef,
		hoverSpaceIdRef,
		dragStateRef,
		screenToWorldPx,
	} = params;

	const rafRef = useRef<number | null>(null);
	const pendingRef = useRef(false);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const devicePixelRatio = window.devicePixelRatio || 1;
		const { width, height } = viewportRef.current;

		ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, width, height);

		const { translateX, translateY, scale } = viewRef.current;
		ctx.setTransform(
			devicePixelRatio * scale,
			0,
			0,
			devicePixelRatio * scale,
			devicePixelRatio * translateX,
			devicePixelRatio * translateY
		);

		const topLeft = screenToWorldPx(0, 0);
		const bottomRight = screenToWorldPx(width, height);
		const minWorldX = topLeft.worldX;
		const maxWorldX = bottomRight.worldX;
		const minWorldY = topLeft.worldY;
		const maxWorldY = bottomRight.worldY;

		const canvasMinX = 0;
		const canvasMaxX = MAX_CANVAS_SIZE;
		const canvasMinY = 0;
		const canvasMaxY = MAX_CANVAS_SIZE;

		const cornerRadius = 16 / scale;
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

		ctx.lineWidth = 1 / scale;
		ctx.strokeStyle = "#ff000012";
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

		const selectedCells = selectedRef.current;
		if (selectedCells.length) {
			ctx.fillStyle = "rgba(59,130,246,0.85)";
			for (const cell of selectedCells) {
				if (isValidCell(cell)) {
					ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
				}
			}
		}

		const spaceList = spacesRef.current;
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

		const hoverId = hoverSpaceIdRef.current;
		if (hoverId) {
			const hoverSpace = spaceList.find((s) => s.id === hoverId);
			if (hoverSpace && hoverSpace.segs.length > 0) {
				ctx.fillStyle = "rgba(37,99,235,0.10)";
				for (const cell of hoverSpace.cells) {
					if (isValidCell(cell)) {
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
			}
		}

		const selectedSpaceIdValue = selectedSpaceIdRef.current;
		if (selectedSpaceIdValue) {
			const selectedSpace = spaceList.find((s) => s.id === selectedSpaceIdValue);
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

		const state = dragStateRef.current;
		if (
			state.mode === "boxSelectCells" &&
			state.activated &&
			state.startCell &&
			state.currentCell
		) {
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
				ctx.fillStyle = "rgba(37,99,235,0.10)";
				ctx.strokeStyle = "#2563eb";
				ctx.lineWidth = 1 / scale;
				ctx.fillRect(left, top, rectWidth, rectHeight);
				ctx.strokeRect(left, top, rectWidth, rectHeight);
			}
		}
	}, [
		canvasRef,
		viewRef,
		viewportRef,
		selectedRef,
		spacesRef,
		selectedSpaceIdRef,
		hoverSpaceIdRef,
		dragStateRef,
		screenToWorldPx,
	]);

	const scheduleDraw = useCallback(() => {
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
	}, [draw]);

	return { scheduleDraw, draw, rafRef };
}
