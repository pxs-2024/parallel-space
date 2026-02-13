/** 订阅者回调类型：无参无返回值 */
type Listener = () => void;

/**
 * 状态 Store：通用的响应式状态管理容器
 * 支持订阅、批量更新（事务），避免多次 mutate 触发重复通知
 */
export class Store<S> {
  /** 当前状态 */
  private state: S;
  /** 订阅者集合 */
  private listeners = new Set<Listener>();
  /** 事务嵌套层级，> 0 表示处于 transaction 中 */
  private batching = 0;
  /** 是否有未 flush 的变更 */
  private dirty = false;

  constructor(initial: S) {
    this.state = initial;
  }

  /** 获取当前状态 */
  getState() {
    return this.state;
  }

  /**
   * 订阅状态变更
   * @returns 取消订阅的函数
   */
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * 通过 mutator 更新状态，会触发订阅者通知（除非在 transaction 中）
   */
  mutate(mutator: (prev: S) => S) {
    this.state = mutator(this.state);
    this.markDirty();
  }

  /**
   * 事务：批量执行多次 mutate，只在整个 fn 执行完后通知一次订阅者
   */
  transaction(fn: () => void) {
    this.batching++;
    try {
      fn();
    } finally {
      this.batching--;
      if (this.batching === 0 && this.dirty) this.flush();
    }
  }

  /** 标记有变更，在非事务中立即 flush，否则延迟到 transaction 结束时 */
  private markDirty() {
    this.dirty = true;
    if (this.batching === 0) this.flush();
  }

  /** 清除 dirty 并通知所有订阅者 */
  private flush() {
    this.dirty = false;
    for (const l of this.listeners) l();
  }
}
