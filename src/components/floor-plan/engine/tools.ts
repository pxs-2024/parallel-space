import type { PointerEvt, ToolId } from "./types";
import type { Store } from "./store";
import type { History, Command } from "./history";
import type { FPState, View } from "./types";
import { screenToCell, screenToPoint } from "./camera";
import { HitTest } from "./hitTest";
import { BoxSelectState, CleanSegmentsState, PanState, DragState } from "./states";
import { SetHoverCmd } from "./commands";

export type ToolContext = {
  store: Store<FPState>;
  history: History<FPState>;
  hitTest: HitTest;
  screenToCell: (sx: number, sy: number, view: View) => any;
  screenToPoint: (sx: number, sy: number, view: View) => any;
  commit: (cmd: Command<FPState>) => void;       // 进 history
  ephemeral: (cmd: Command<FPState>) => void;    // 不进 history（overlay/hover）
};

export interface ToolStrategy {
  id: ToolId;
  onPointerDown(ctx: ToolContext, e: PointerEvt): DragState;
}

export class NoneState implements DragState {
  id = "none";
  onMove(ctx: ToolContext, e: PointerEvt) {
    // hover 仅在 idle 时更新
    const view = ctx.store.getState().view;
    const cell = ctx.screenToCell(e.screenX, e.screenY, view);
    const next = ctx.hitTest.innermostSpaceIdByCell(cell);
    if (next !== ctx.store.getState().hoverSpaceId) {
      ctx.ephemeral(new SetHoverCmd(next));
    }
    return this;
  }
  onUp() { return this; }
}

export const DefaultTool: ToolStrategy = {
  id: "default",
  onPointerDown(ctx, e) {
    const st = ctx.store.getState();
    if (e.isSpaceKey) {
      return new PanState(e.screenX, e.screenY, st.view.translateX, st.view.translateY);
    }
    // default 这里你可以扩展：点击空间 -> MoveSpaceState / 选中空间
    // 目前返回 none，保持 hover
    return new NoneState();
  },
};

export const SelectTool: ToolStrategy = {
  id: "select",
  onPointerDown(ctx, e) {
    const view = ctx.store.getState().view;
    const startCell = ctx.screenToCell(e.screenX, e.screenY, view);
    return new BoxSelectState(startCell, e.screenX, e.screenY, false, startCell);
  },
};

export const DeselectTool: ToolStrategy = {
  id: "deselect",
  onPointerDown(ctx, e) {
    const view = ctx.store.getState().view;
    const startCell = ctx.screenToCell(e.screenX, e.screenY, view);
    return new BoxSelectState(startCell, e.screenX, e.screenY, true, startCell);
  },
};

export const CleanSegmentsTool: ToolStrategy = {
  id: "cleanSegments",
  onPointerDown(ctx, e) {
    const view = ctx.store.getState().view;
    const p = ctx.screenToPoint(e.screenX, e.screenY, view);
    ctx.ephemeral({ name: "initOverlay", execute: s => {}, undo: s => {} } as any);
    return new CleanSegmentsState([p]);
  },
};

export function toolById(id: ToolId): ToolStrategy {
  switch (id) {
    case "select": return SelectTool;
    case "deselect": return DeselectTool;
    case "cleanSegments": return CleanSegmentsTool;
    default: return DefaultTool;
  }
}
