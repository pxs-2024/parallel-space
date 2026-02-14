import type { FPState, Viewport } from "./types";
import {
  getCanvasTheme,
  resetCanvas,
  drawSelectedCells,
  drawSpaces,
  drawHoverSpace,
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
  const { view, spaces, selectedCells, hoverSpaceId, selectedSpaceId, overlay, gridMode, editMode, editingSpaceId } = state;
  const theme = getCanvasTheme(canvas);
  const showGrid = editMode && gridMode === "full";

  resetCanvas(ctx, canvas, viewport, view, (sx, sy) => screenToWorldPx(sx, sy, view), theme, {
    showGrid,
  });

  drawSelectedCells(ctx, selectedCells, theme);
  const spacesToDraw = editingSpaceId ? spaces.filter((s) => s.id !== editingSpaceId) : spaces;
  drawSpaces(ctx, spacesToDraw, view.scale, theme);

  const hover = spaces.find((s) => s.id === hoverSpaceId);
  if (hover) drawHoverSpace(ctx, hover, view.scale, theme);

  drawBoxSelectCells(ctx, spaces, selectedSpaceId, view.scale, theme);

  if (overlay?.type === "box") {
    drawActiveBoxSelectCells(
      ctx,
      { mode: "boxSelectCells", startCell: overlay.a, currentCell: overlay.b } as any,
      view.scale,
      theme
    );
  }
  if (overlay?.type === "polyline") {
    overlay.points.forEach((point) => {
      drawPoint(ctx, point, view.scale, theme);
    });
  }
}
