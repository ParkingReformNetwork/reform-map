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

  private benchmarkEnabled: boolean = false;

  private isInitialized: boolean = false;

  constructor(options: {
    initialValue: T;
    id?: string;
    enableBenchmarks?: boolean;
  }) {
    const { initialValue, id, enableBenchmarks } = options;
    this.id = id;
    this.value = initialValue;
    this.benchmarkEnabled =
      !!enableBenchmarks && process.env.NODE_ENV !== "production";
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
    this.isInitialized = true;
    this.notify();
  }

  private subscriberLabel(subscriberId?: string): string {
    const observableLabel = this.id ?? "anonymous";
    const callbackLabel = subscriberId ?? "anonymous";
    return `Observable(${observableLabel}) - Subscriber(${callbackLabel})`;
  }

  private notify(): void {
    if (this.benchmarkEnabled) {
      this.subscribers.forEach(({ callback, id }) => {
        const benchmarkId = this.subscriberLabel(id);
        console.time(benchmarkId);
        callback(this.value);
        console.timeEnd(benchmarkId);
      });
    } else {
      this.subscribers.forEach(({ callback }) => callback(this.value));
    }
  }
}
