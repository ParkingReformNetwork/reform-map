import { DateTime } from "luxon";

export type PlaceId = string;

export type ReformStatus =
  | "implemented"
  | "passed"
  | "planned"
  | "proposed"
  | "repealed";

interface BaseEntry {
  // Full name of the town, city, county, province, state, or country.
  place: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  summary: string;
  status: ReformStatus;
  policy: string[];
  scope: string[];
  land: string[];
  repeal: boolean;
  pop: number;
  // [long, lat]
  coord: [number, number];
}

export type RawEntry = BaseEntry & {
  // Country abbreviation.
  country: string;
  date: string | null;
};

export class Date {
  readonly raw: string;
  readonly parsed: DateTime<true>;

  constructor(raw: string) {
    this.raw = raw;
    const parsed = DateTime.fromISO(raw);
    if (!parsed.isValid) {
      throw new Error(`Invalid date string: ${raw}`);
    }
    this.parsed = parsed;
  }

  format(): string {
    if (this.raw.length === 4) return this.raw;
    if (this.raw.length === 7) return this.parsed.toFormat("LLL yyyy");
    return this.parsed.toFormat("LLL d, yyyy");
  }

  preposition(): "in" | "on" {
    return this.raw.length === 10 ? "on" : "in";
  }
}

export type PlaceEntry = BaseEntry & {
  // URL for the dedicated place page.
  url: string;
  // Full country name.
  country: string;
  date: Date | null;
};
