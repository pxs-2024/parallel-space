import { Store } from "./store";

export interface Command<S> {
  name: string;
  execute(store: Store<S>): void;
  undo(store: Store<S>): void;
}

export class History<S> {
  private undoStack: Command<S>[] = [];
  private redoStack: Command<S>[] = [];

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
