import type { FPState, Viewport } from "./types";
import {
  getCanvasTheme,
  resetCanvas,
  drawSelectedCells,
  drawSpaces,
  drawHoverSpace,
  drawPreviewSpaces,
  drawBoxSelectCells,
  drawActiveBoxSelectCells,
  drawPoint,
} from "../drawUtils";
import { screenToWorldPx } from "./camera";

export function renderFloorPlan(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  viewport: Viewport,
  state: FPState
) {
  const { view, spaces, selectedCells, hoverSpaceId, selectedSpaceId, overlay, gridMode, editMode, editingSpaceId, previewSpaces } = state;
  const theme = getCanvasTheme(canvas);
  const showGrid = editMode && gridMode === "full";

  resetCanvas(ctx, canvas, viewport, view, (sx, sy) => screenToWorldPx(sx, sy, view), theme, {
    showGrid,
  });

  drawSelectedCells(ctx, selectedCells, theme);

  // 悬浮模版时：隐藏原空间，只在视口中心绘制模版预览
  if (previewSpaces?.length) {
    drawPreviewSpaces(ctx, previewSpaces, view.scale);
  } else {
    const spacesToDraw = editingSpaceId ? spaces.filter((s) => s.id !== editingSpaceId) : spaces;
    drawSpaces(ctx, spacesToDraw, view.scale, theme);
    const hover = !editMode ? spaces.find((s) => s.id === hoverSpaceId) : null;
    if (hover) drawHoverSpace(ctx, hover, view.scale, theme);
    drawBoxSelectCells(ctx, spaces, selectedSpaceId, view.scale, theme);
  }

  if (overlay?.type === "box") {
    drawActiveBoxSelectCells(ctx, { startCell: overlay.a, currentCell: overlay.b }, view.scale, theme);
  }
  if (overlay?.type === "polyline") {
    overlay.points.forEach((point) => {
      drawPoint(ctx, point, view.scale, theme);
    });
  }
}
