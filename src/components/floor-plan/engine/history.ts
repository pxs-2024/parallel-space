import { Store } from "./store";

export interface Command<S> {
  name: string;
  execute(store: Store<S>): void;
  undo(store: Store<S>): void;
  /** 会更新已有空间的 command 实现此方法，返回被修改的 spaceId 列表 */
  getUpdatedSpaceIds?: () => string[];
  /** 会新建空间的 command 实现此方法，返回本次创建的 spaceId 列表 */
  getCreatedSpaceIds?: () => string[];
}

export class History<S> {
  private undoStack: Command<S>[] = [];
  private redoStack: Command<S>[] = [];

  /** 当前 undo 栈快照（只读，用于 Engine 等收集信息） */
  getUndoStack(): readonly Command<S>[] {
    return this.undoStack;
  }

  commit(store: Store<S>, cmd: Command<S>) {
    cmd.execute(store);
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
  }

  undo(store: Store<S>) {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo(store);
    this.redoStack.push(cmd);
  }

  redo(store: Store<S>) {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute(store);
    this.undoStack.push(cmd);
  }
}
