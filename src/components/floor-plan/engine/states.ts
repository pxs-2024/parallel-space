import type { Cell, PointerEvt, Point } from "./types";
import { DRAG_THRESHOLD_PX } from "../constants";
import { buildCellsInRect } from "../utils";
import { ApplySelectionCmd, ToggleCellCmd, SetOverlayCmd, CleanSegmentsCmd, SetViewCmd } from "./commands";
import type { ToolContext } from "./tools";
import { NoneState } from "./tools";

export interface DragState {
  id: string;
  onMove(ctx: ToolContext, e: PointerEvt): DragState;
  onUp(ctx: ToolContext, e: PointerEvt): DragState;
}

export class PanState implements DragState {
  id = "pan";
  constructor(
    private startX: number,
    private startY: number,
    private baseTranslateX: number,
    private baseTranslateY: number
  ) {}

  onMove(ctx: ToolContext, e: PointerEvt) {
    const dx = e.screenX - this.startX;
    const dy = e.screenY - this.startY;
    const v = ctx.store.getState().view;
    const next = { ...v, translateX: this.baseTranslateX + dx, translateY: this.baseTranslateY + dy };
    // 视口通常不进 history；如果你要可撤销就 commit SetViewCmd
    ctx.store.mutate(s => ({ ...s, view: next }));
    return this;
  }

  onUp() {
    return new NoneState();
  }
}

export class BoxSelectState implements DragState {
  id = "boxSelect";
  private activated = false;

  constructor(
    private startCell: Cell,
    private startScreenX: number,
    private startScreenY: number,
    private subtract: boolean,
    private currentCell: Cell
  ) {}

  onMove(ctx: ToolContext, e: PointerEvt) {
    const dx = e.screenX - this.startScreenX;
    const dy = e.screenY - this.startScreenY;
    const dist = Math.hypot(dx, dy);
    if (!this.activated && dist >= DRAG_THRESHOLD_PX) this.activated = true;

    const view = ctx.store.getState().view;
    const cell = ctx.screenToCell(e.screenX, e.screenY, view);
    this.currentCell = cell;

    ctx.ephemeral(new SetOverlayCmd({ type: "box", a: this.startCell, b: cell }));
    return this;
  }

  onUp(ctx: ToolContext) {
    ctx.ephemeral(new SetOverlayCmd(null));

    if (!this.activated) {
      ctx.commit(new ToggleCellCmd(this.startCell));
      return new NoneState();
    }

    const batch = buildCellsInRect(this.startCell, this.currentCell);
    ctx.commit(new ApplySelectionCmd(this.subtract ? "subtract" : "union", batch));
    return new NoneState();
  }
}

export class CleanSegmentsState implements DragState {
  id = "cleanSegments";
  constructor(private points: Point[]) {}

  onMove(ctx: ToolContext, e: PointerEvt) {
    const view = ctx.store.getState().view;
    const p = ctx.screenToPoint(e.screenX, e.screenY, view);
    const next = [...this.points, p];
    this.points = next;
    ctx.ephemeral(new SetOverlayCmd({ type: "polyline", points: next }));
    return this;
  }

  onUp(ctx: ToolContext) {
    ctx.ephemeral(new SetOverlayCmd(null));
    ctx.commit(new CleanSegmentsCmd(this.points));
    return new NoneState();
  }
}
