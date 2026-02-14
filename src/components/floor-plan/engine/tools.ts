import type { Cell, PointerEvt, ToolId } from "./types";
import type { Store } from "./store";
import type { History, Command } from "./history";
import type { FPState, View } from "./types";
import { screenToCell, screenToPoint } from "./camera";
import { HitTest } from "./hitTest";
import { BoxSelectState, CleanSegmentsState, PanState, DragState, MoveSpaceState } from "./states";
import { SetHoverCmd } from "./commands";
import { NoneState } from "./states";

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

export const NoneTool:ToolStrategy = {
  id:"none",
  onPointerDown(ctx, e: PointerEvt){
    const st = ctx.store.getState();
    if (e.isSpaceKey) {
      return new PanState(e.screenX, e.screenY, st.view.translateX, st.view.translateY);
    }
    return new NoneState();
  }
}


export const DefaultTool: ToolStrategy = {
  id: "editDefault",
  onPointerDown(ctx, e) {
    const st = ctx.store.getState();
    if (e.isSpaceKey) {
      return new PanState(e.screenX, e.screenY, st.view.translateX, st.view.translateY);
    }else{
      const  startCell = ctx.screenToCell(e.screenX, e.screenY, st.view);
      const spaceId = ctx.hitTest.innermostSpaceIdByCell(startCell);
      if (spaceId) {
        return new MoveSpaceState(startCell, spaceId);
      }
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
    case "editDefault": return DefaultTool;
    default: return NoneTool;
  }
}
