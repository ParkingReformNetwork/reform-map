const SLOW_CALLBACK_THRESHOLD_MS = 2;

export interface Subscriber<T> {
  callback: (value: T) => void;
  id: string;
}

/**
 * A class to manage state of type T.
 *
 * UI elements that depend on the state can use `subscribe()` so that whenever the state changes,
 * the UI is re-calculated. This allows other components to change the state without needing to
 * know which other parts of the app need to be updated.
 */
export default class Observable<T> {
  private id: string;

  private value: T;

  private subscribers: Subscriber<T>[] = [];

  private _isInitialized: boolean = false;

  constructor(id: string, initialValue: T) {
    this.id = id;
    this.value = initialValue;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  getValue(): T {
    return this.value;
  }

  setValue(newValue: T): void {
    this.value = newValue;
    this.notify();
  }

  subscribe(id: string, callback: (value: T) => void): void {
    if (this.isInitialized) {
      throw new Error("Cannot add subscribers after initialization");
    }
    this.subscribers.push({ callback, id });
  }

  initialize(): void {
    if (this.isInitialized) {
      throw new Error("Observable is already initialized");
    }
    this.notify();
    this._isInitialized = true;
  }

  private notify(): void {
    this.subscribers.forEach(({ callback, id }) => {
      if (process.env.NODE_ENV === "production") {
        callback(this.value);
        return;
      }

      const start = performance.now();
      callback(this.value);
      const duration = performance.now() - start;

      if (duration < SLOW_CALLBACK_THRESHOLD_MS) return;
      console.warn(
        `Slow callback detected: Observable(${this.id}) - Subscriber(${id}) (${duration.toFixed(0)}ms)`,
      );
    });
  }
}
