type Listener = () => void;

export class Store<S> {
  private state: S;
  private listeners = new Set<Listener>();
  private batching = 0;
  private dirty = false;

  constructor(initial: S) {
    this.state = initial;
  }

  getState() {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  mutate(mutator: (prev: S) => S) {
    this.state = mutator(this.state);
    this.markDirty();
  }

  transaction(fn: () => void) {
    this.batching++;
    try {
      fn();
    } finally {
      this.batching--;
      if (this.batching === 0 && this.dirty) this.flush();
    }
  }

  private markDirty() {
    this.dirty = true;
    if (this.batching === 0) this.flush();
  }

  private flush() {
    this.dirty = false;
    for (const l of this.listeners) l();
  }
}
