"use client";

import { useRef, useCallback } from "react";
import type { Cell } from "../types";
import { clampCell } from "../utils";
import { SIZE } from "../constants";
import { getCanvasPixelSize } from "../utils";

type ViewRef = { translateX: number; translateY: number; scale: number };
type ViewportRef = { width: number; height: number };

/**
 * 视口变换、坐标转换与 resize/重置视角
 */
export function useFloorPlanViewport(
	wrapRef: React.RefObject<HTMLDivElement | null>,
	canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
	const viewRef = useRef<ViewRef>({ translateX: 0, translateY: 0, scale: 1 });
	const viewportRef = useRef<ViewportRef>({ width: 800, height: 600 });

	const screenToWorldPx = useCallback((screenX: number, screenY: number) => {
		const { translateX, translateY, scale } = viewRef.current;
		return {
			worldX: (screenX - translateX) / scale,
			worldY: (screenY - translateY) / scale,
		};
	}, []);

	const getScreenXYFromClient = useCallback(
		(clientX: number, clientY: number): { screenX: number; screenY: number } | null => {
			const wrap = wrapRef.current;
			if (!wrap) return null;
			const rect = wrap.getBoundingClientRect();
			const screenX = clientX - rect.left;
			const screenY = clientY - rect.top;
			const { width, height } = viewportRef.current;
			if (screenX < 0 || screenY < 0 || screenX >= width || screenY >= height) return null;
			return { screenX, screenY };
		},
		[]
	);

	const getCellFromScreen = useCallback(
		(screenX: number, screenY: number): Cell => {
			const { worldX, worldY } = screenToWorldPx(screenX, screenY);
			const cell = { x: Math.floor(worldX / SIZE), y: Math.floor(worldY / SIZE) };
			return clampCell(cell);
		},
		[screenToWorldPx]
	);

	const getCellFromClient = useCallback(
		(clientX: number, clientY: number): Cell | null => {
			const screen = getScreenXYFromClient(clientX, clientY);
			if (!screen) return null;
			return getCellFromScreen(screen.screenX, screen.screenY);
		},
		[getScreenXYFromClient, getCellFromScreen]
	);

	const resizeCanvasToDPR = useCallback(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const width = wrap.clientWidth;
		const height = wrap.clientHeight;
		viewportRef.current = { width, height };

		const devicePixelRatio = window.devicePixelRatio || 1;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		canvas.width = Math.floor(width * devicePixelRatio);
		canvas.height = Math.floor(height * devicePixelRatio);
	}, []);

	const resetViewToCenter = useCallback(() => {
		const { width, height } = viewportRef.current;
		const canvasSize = getCanvasPixelSize();
		const initialScale = Math.min(width / canvasSize.width, height / canvasSize.height);
		const canvasCenterX = canvasSize.width / 2;
		const canvasCenterY = canvasSize.height / 2;
		const reasonableScale = Math.max(0.5, initialScale);
		viewRef.current = {
			translateX: width / 2 - canvasCenterX * reasonableScale,
			translateY: height / 2 - canvasCenterY * reasonableScale,
			scale: reasonableScale,
		};
	}, []);

	return {
		viewRef,
		viewportRef,
		screenToWorldPx,
		getScreenXYFromClient,
		getCellFromScreen,
		getCellFromClient,
		resizeCanvasToDPR,
		resetViewToCenter,
	};
}
