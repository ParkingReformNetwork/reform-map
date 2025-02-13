/* eslint-disable no-underscore-dangle */

const SLOW_CALLBACK_THRESHOLD_MS = 2;

export interface Subscriber<T> {
  callback: (value: T) => void;
  id: string | undefined;
}

/**
 * A class to manage state of type T.
 *
 * UI elements that depend on the state can use `subscribe()` so that whenever the state changes,
 * the UI is re-calculated. This allows other components to change the state without needing to
 * know which other parts of the app need to be updated.
 */
export default class Observable<T> {
  private id: string | undefined;

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

  subscribe(callback: (value: T) => void, id?: string): void {
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
      const callbackLabel = id ?? "anonymous";
      // eslint-disable-next-line no-console
      console.warn(
        `Slow callback detected: Observable(${this.id}) - Subscriber(${callbackLabel}) (${duration.toFixed(0)}ms)`,
      );
    });
  }
}
