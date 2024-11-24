import { DateTime } from "luxon";

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

export type PlaceId = string;

export type ReformStatus =
  | "implemented"
  | "passed"
  | "planned"
  | "proposed"
  | "repealed";

export interface Place {
  // Full name of the town, city, county, province, state, or country.
  name: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  country: string;
  pop: number;
  // [long, lat]
  coord: [number, number];
  repeal: boolean;
}

interface BaseLegacyReform {
  summary: string;
  status: ReformStatus;
  policy: string[];
  scope: string[];
  land: string[];
}

export interface RawEntry {
  place: Place;
  legacy: BaseLegacyReform & { date: string | null };
}

export interface PlaceEntry {
  place: Place & { url: string };
  unifiedPolicy: BaseLegacyReform & { date: Date | null };
}
