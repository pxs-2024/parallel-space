import { useEffect, useRef } from "react";
import { getCanvasPixelSize } from "../utils";

const useInitAndResizeCanvas = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	wrapRef: React.RefObject<HTMLDivElement | null>,
	viewRef: React.RefObject<{
		translateX: number;
		translateY: number;
		scale: number;
	}>,
	scheduleDraw: () => void
) => {
	const viewportRef = useRef({ width: 0, height: 0 });
	/**
	 * 根据设备像素比调整Canvas尺寸
	 * 确保在高DPI设备上显示清晰的图形
	 */
	const resizeCanvasToDPR = () => {
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
	};
	// 初始化和尺寸调整
	useEffect(() => {
		// 初始化Canvas和视口
		resizeCanvasToDPR();
		const { width, height } = viewportRef.current;

		// 画布像素计算说明：
		// - 画布尺寸：4000 × 4000 像素
		// - 每个格子：10 × 10 像素
		// - 总格子数：400 × 400 个
		// - 画布世界坐标范围：(0, 0) 到 (4000, 4000)

		// 设置初始视口为中心，缩放级别适合显示4000*4000像素的画布
		const canvasSize = getCanvasPixelSize();
		const initialScale = Math.min(width / canvasSize.width, height / canvasSize.height);

		// 计算画布中心的世界坐标
		const canvasCenterX = canvasSize.width / 2; // 2000
		const canvasCenterY = canvasSize.height / 2; // 2000

		// 设置视口变换，使画布中心对齐到屏幕中心
		// screenX = worldX * scale + translateX
		// 要使画布中心(2000, 2000)显示在屏幕中心(width/2, height/2)
		// translateX = screenX - worldX * scale = width/2 - 2000 * scale
		// translateY = screenY - worldY * scale = height/2 - 2000 * scale

		// 修复：使用合理的初始缩放级别，避免格子过小
		const reasonableScale = Math.max(0.5, initialScale); // 最小缩放0.5，确保格子不会太小

		viewRef.current = {
			translateX: width / 2 - canvasCenterX * reasonableScale,
			translateY: height / 2 - canvasCenterY * reasonableScale,
			scale: reasonableScale,
		};
		scheduleDraw();

		// 窗口尺寸变化处理
		const onResize = () => {
			resizeCanvasToDPR();
			scheduleDraw();
		};
		window.addEventListener("resize", onResize);

		// 使用ResizeObserver监听容器尺寸变化
		const resizeObserver =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(() => {
						resizeCanvasToDPR();
						scheduleDraw();
				  })
				: null;
		if (resizeObserver && wrapRef.current) resizeObserver.observe(wrapRef.current);

		// 清理函数
		return () => {
			window.removeEventListener("resize", onResize);
			if (resizeObserver) resizeObserver.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return viewportRef;
};

export { useInitAndResizeCanvas };