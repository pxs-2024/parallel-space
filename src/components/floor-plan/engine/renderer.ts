import type { FPState, Space, Viewport } from "./types";
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

/** 将 engine 的 Space（segs 可选）转为 drawUtils 所需的 Space（segs 必填） */
function toDrawSpace(s: Space): { id: string; name: string; cells: import("../types").Cell[]; segs: import("../types").Segment[][] } {
  return { ...s, segs: s.segs ?? [] };
}

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
    drawPreviewSpaces(ctx, previewSpaces.map(toDrawSpace), view.scale);
  } else {
    const spacesToDraw = editingSpaceId ? spaces.filter((s) => s.id !== editingSpaceId) : spaces;
    drawSpaces(ctx, spacesToDraw.map(toDrawSpace), view.scale, theme);
    const hover = !editMode ? spaces.find((s) => s.id === hoverSpaceId) : null;
    if (hover) drawHoverSpace(ctx, toDrawSpace(hover), view.scale, theme);
    drawBoxSelectCells(ctx, spaces.map(toDrawSpace), selectedSpaceId, view.scale, theme);
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
