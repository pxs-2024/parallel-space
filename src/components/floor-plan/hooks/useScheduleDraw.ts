import { useRef } from "react";

const useScheduleDraw = (draw: () => void) => {
	const rafRef = useRef<number | null>(null);
	const pendingRef = useRef(false);
	const scheduleDraw = () => {
		// 如果已经有待执行的动画帧，标记为 pending 并返回
		if (rafRef.current !== null) {
			console.log("pendingRef.current", rafRef.current);
			pendingRef.current = true;
			return;
		}

		// 请求新的动画帧
		rafRef.current = requestAnimationFrame(() => {
			console.log("requestAnimationFrame");
			rafRef.current = null;

			draw(); // 执行绘制

			// 如果绘制期间有新的绘制请求，递归调度
			if (pendingRef.current) {
				pendingRef.current = false;
				scheduleDraw();
			}
		});
	};
	return scheduleDraw;
};

export { useScheduleDraw };
