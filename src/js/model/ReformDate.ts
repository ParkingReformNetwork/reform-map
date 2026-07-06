const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Wraps a raw date string in the format `yyyy`, `yyyy-mm`, or `yyyy-mm-dd`. */
export class ReformDate {
  readonly raw: string;

  /** Memoized [month, day] (1-indexed, defaulting to 1 when raw omits them). */
  #monthDay: [number, number] | undefined;

  constructor(raw: string) {
    this.raw = raw;
  }

  static fromNullable(dateStr: string | undefined): ReformDate | undefined {
    return dateStr ? new this(dateStr) : undefined;
  }

  get year(): string {
    return this.raw.slice(0, 4);
  }

  get #parsedMonthDay(): [number, number] {
    if (this.#monthDay) return this.#monthDay;
    const month = this.raw.length >= 7 ? Number(this.raw.slice(5, 7)) : 1;
    const day = this.raw.length >= 10 ? Number(this.raw.slice(8, 10)) : 1;
    this.#monthDay = [month, day];
    return this.#monthDay;
  }

  valueOf(): number {
    const [month, day] = this.#parsedMonthDay;
    return Number(this.year) * 10000 + month * 100 + day;
  }

  format(): string {
    if (this.raw.length === 4) return this.raw;
    const [month, day] = this.#parsedMonthDay;
    const monthName = MONTH_ABBREVIATIONS[month - 1];
    if (this.raw.length === 7) return `${monthName} ${this.year}`;
    return `${monthName} ${day}, ${this.year}`;
  }
}
