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

  static fromNullable(dateStr?: string | null): Date | null {
    return dateStr ? new this(dateStr) : null;
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

export const ALL_PLACE_TYPES = ["city", "county", "state", "country"] as const;
export type PlaceType = (typeof ALL_PLACE_TYPES)[number];

export interface RawPlace {
  // Full name of the town, city, county, province, state, or country.
  name: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  country: string;
  type: PlaceType;
  pop: number;
  // [long, lat]
  coord: [number, number];
  repeal: boolean;
}
export type ProcessedPlace = RawPlace & { url: string };

export const ALL_POLICY_TYPE = [
  "add parking maximums",
  "reduce parking minimums",
  "remove parking minimums",
] as const;
export type PolicyType = (typeof ALL_POLICY_TYPE)[number];

export const ALL_REFORM_STATUS = ["adopted", "proposed", "repealed"] as const;
export type ReformStatus = (typeof ALL_REFORM_STATUS)[number];

/// Every land use policy has these values. It is missing some fields like `date`.
export interface BaseLandUsePolicy {
  status: ReformStatus;
  scope: string[];
  land: string[];
}

export type RawCoreLandUsePolicy = BaseLandUsePolicy & { date: string | null };
export type ProcessedCoreLandUsePolicy = BaseLandUsePolicy & {
  date: Date | null;
};

export interface RawCoreEntry {
  place: RawPlace;
  reduce_min?: RawCoreLandUsePolicy[];
  rm_min?: RawCoreLandUsePolicy[];
  add_max?: RawCoreLandUsePolicy[];
}

export interface ProcessedCoreEntry {
  place: ProcessedPlace;
  reduce_min?: ProcessedCoreLandUsePolicy[];
  rm_min?: ProcessedCoreLandUsePolicy[];
  add_max?: ProcessedCoreLandUsePolicy[];
}
export const UNKNOWN_YEAR = "unknown";

/// The types from `data/option-values.json`.
export interface OptionValues {
  placeType: PlaceType[];
  policy: PolicyType[];
  status: ReformStatus[];
  scope: string[];
  landUse: string[];
  country: string[];
  year: string[];
}
