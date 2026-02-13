import { useEffect, useRef } from "react";
import { FloorPlanEngine } from "../engine/engine";

const useInitAndResizeCanvas = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  wrapRef: React.RefObject<HTMLDivElement>,
  engine: FloorPlanEngine
) => {
  const viewportRef = useRef({ width: 0, height: 0 });

  const resizeCanvasToDPR = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const width = wrap.clientWidth;
    const height = wrap.clientHeight;

    viewportRef.current = { width, height };

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    engine.setViewport({ width, height });
  };

  useEffect(() => {
    resizeCanvasToDPR();

    const onResize = () => resizeCanvasToDPR();
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(resizeCanvasToDPR);
    if (wrapRef.current) ro.observe(wrapRef.current);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  return viewportRef;
};
export { useInitAndResizeCanvas };
