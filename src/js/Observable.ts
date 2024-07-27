/**
 * A class to manage state of type T.
 *
 * UI elements that depend on the state can use `subscribe()` so that whenever the state changes,
 * the UI is re-calculated. This allows other components to change the state without needing to
 * know which other parts of the app need to be updated.
 */
export default class Observable<T> {
  private value: T;

  private subscribers: ((value: T) => void)[] = [];

  private isInitialized: boolean = false;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  getValue(): T {
    return this.value;
  }

  setValue(newValue: T): void {
    this.value = newValue;
    this.notify();
  }

  subscribe(callback: (value: T) => void): void {
    if (this.isInitialized) {
      throw new Error("Cannot add subscribers after initialization");
    }
    this.subscribers.push(callback);
  }

  initialize(): void {
    if (this.isInitialized) {
      throw new Error("Observable is already initialized");
    }
    this.isInitialized = true;
    this.notify();
  }

  private notify(): void {
    this.subscribers.forEach((callback) => callback(this.value));
  }
}
