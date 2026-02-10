"use client";

import { useEffect, useRef } from "react";
import type { Space } from "../types";
import { getCanvasPixelSize } from "../utils";

type ViewRef = React.MutableRefObject<{ translateX: number; translateY: number; scale: number }>;
type ViewportRef = React.MutableRefObject<{ width: number; height: number }>;

type UseFloorPlanCanvasLifecycleParams = {
	wrapRef: React.RefObject<HTMLDivElement | null>;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	resizeCanvasToDPR: () => void;
	draw: () => void;
	viewRef: ViewRef;
	viewportRef: ViewportRef;
	rafRef: React.MutableRefObject<number | null>;
	spaces: Space[];
	hoverSpaceIdRef: React.MutableRefObject<string | null>;
	scheduleDraw: () => void;
	selected: { x: number; y: number }[];
	selectedSpaceId: string | null;
};

/**
 * Canvas 挂载/卸载、resize、空格键、以及 spaces/selected 变化触发的重绘
 */
export function useFloorPlanCanvasLifecycle(params: UseFloorPlanCanvasLifecycleParams) {
	const {
		wrapRef,
		canvasRef,
		resizeCanvasToDPR,
		draw,
		viewRef,
		viewportRef,
		rafRef,
		spaces,
		hoverSpaceIdRef,
		scheduleDraw,
		selected,
		selectedSpaceId,
	} = params;

	const spaceRef = useRef(false);

	// 初始化 + resize + ResizeObserver
	useEffect(() => {
		resizeCanvasToDPR();
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
		draw();

		const onResize = () => {
			resizeCanvasToDPR();
			draw();
		};
		window.addEventListener("resize", onResize);

		const resizeObserver =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(() => {
						resizeCanvasToDPR();
						draw();
				  })
				: null;
		if (resizeObserver && wrapRef.current) resizeObserver.observe(wrapRef.current);

		return () => {
			window.removeEventListener("resize", onResize);
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			if (resizeObserver) resizeObserver.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// spaces 变化：清除无效 hover、触发重绘
	useEffect(() => {
		if (hoverSpaceIdRef.current) {
			const exists = spaces.some((s) => s.id === hoverSpaceIdRef.current);
			if (!exists) hoverSpaceIdRef.current = null;
		}
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [spaces]);

	// 选区或选中空间变化时重绘
	useEffect(() => {
		scheduleDraw();
	}, [selected, selectedSpaceId, scheduleDraw]);

	// 空格键：平移模式
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
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	return { spaceRef };
}
