import type { Cell, Point, View } from "./types";
import { SIZE } from "../constants"; // 你现有的 SIZE


/**
 * worldPx canvas用的坐标系，cell和point是canvas用的坐标系
 * 
 */
export function screenToWorldPx(screenX: number, screenY: number, view: View) {
  return {
    worldX: (screenX - view.translateX) / view.scale,
    worldY: (screenY - view.translateY) / view.scale,
  };
}

export function screenToCell(screenX: number, screenY: number, view: View): Cell {
  const { worldX, worldY } = screenToWorldPx(screenX, screenY, view);
  return { x: Math.floor(worldX / SIZE), y: Math.floor(worldY / SIZE) };
}

export function screenToPoint(screenX: number, screenY: number, view: View): Point {
  const { worldX, worldY } = screenToWorldPx(screenX, screenY, view);
  return { x: Math.round(worldX / SIZE), y: Math.round(worldY / SIZE) };
}
