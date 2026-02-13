import type { FPState, Viewport } from "./types";
import { resetCanvas, drawSelectedCells, drawSpaces, drawHoverSpace, drawBoxSelectCells, drawActiveBoxSelectCells, drawPoint } from "../drawUtils";
import { screenToWorldPx } from "./camera";

export function renderFloorPlan(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  viewport: Viewport,
  state: FPState
) {
  const { view, spaces, selectedCells, hoverSpaceId, selectedSpaceId, overlay } = state;

  resetCanvas(ctx, canvas, viewport, view, (sx, sy) => screenToWorldPx(sx, sy, view));

  drawSelectedCells(ctx, selectedCells);
  drawSpaces(ctx, spaces, view.scale); 

  const hover = spaces.find(s => s.id === hoverSpaceId);
  if (hover) drawHoverSpace(ctx, hover, view.scale);

  drawBoxSelectCells(ctx, spaces, selectedSpaceId, view.scale);

  // overlay 画法：如果你想沿用 drawActiveBoxSelectCells，需要你那边接收 overlay
  // 这里演示直接画 overlay（你可换成你的 util）
  if (overlay?.type === "box") {
    console.log(overlay,"overlay");
    drawActiveBoxSelectCells(ctx, { mode: "boxSelectCells", startCell: overlay.a, currentCell: overlay.b } as any, view.scale);
  }
  // polyline overlay 可自行画或复用 drawPoint/drawXXX
  if(overlay?.type==='polyline'){
    overlay.points.forEach(point => {
      drawPoint(ctx, point, view.scale);
    });
  }
}
