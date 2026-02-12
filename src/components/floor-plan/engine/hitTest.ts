import type { Cell, Space } from "./types";
import { clampCell } from "../utils";

export class HitTest {
  private map = new Map<string, Set<string>>(); // spaceId -> cellKey set
  private spaces: Space[] = [];

  sync(spaces: Space[]) {
    this.spaces = spaces;
    const m = new Map<string, Set<string>>();
    for (const s of spaces) m.set(s.id, new Set(s.cells.map(c => `${c.x},${c.y}`)));
    this.map = m;
  }

  // 最内层：面积最小优先（与你现有逻辑一致）
  innermostSpaceIdByCell(cell: Cell): string | null {
    const c = clampCell(cell);
    const key = `${c.x},${c.y}`;
    let bestId: string | null = null;
    let bestArea = Infinity;

    for (let i = this.spaces.length - 1; i >= 0; i--) {
      const s = this.spaces[i];
      const set = this.map.get(s.id);
      if (!set || !set.has(key)) continue;
      const area = s.cells.length;
      if (area < bestArea) {
        bestArea = area;
        bestId = s.id;
      }
    }
    return bestId;
  }
}
