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

/// Wraps a raw date string in the format `yyyy`, `yyyy-mm`, or `yyyy-mm-dd`.
export class ReformDate {
  readonly raw: string;

  // Memoized [month, day] (1-indexed, defaulting to 1 when raw omits them).
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
  // The value used for the URL. Note that this may be an outdated value
  // so that we don't require a redirect.
  encoded: string;
  pop: number;
  // [long, lat]
  coord: [number, number];
  repeal: boolean | undefined;
}
export type ProcessedPlace = RawPlace & { url: string };

const LAND_USE_POLICY_TYPE = [
  "add parking maximums",
  "reduce parking minimums",
  "remove parking minimums",
] as const;
export type LandUsePolicyType = (typeof LAND_USE_POLICY_TYPE)[number];

export const ALL_POLICY_TYPE = [
  ...LAND_USE_POLICY_TYPE,
  "parking benefit district",
] as const;
export type PolicyType = (typeof ALL_POLICY_TYPE)[number];

export const ALL_REFORM_STATUS = ["adopted", "proposed", "repealed"] as const;
export type ReformStatus = (typeof ALL_REFORM_STATUS)[number];

/// Every benefit district record has these values. It is missing some fields like `date`.
export interface BaseBenefitDistrict {
  status: ReformStatus;
}

/// Every land use policy has these values. It is missing some fields like `date`.
export interface BaseLandUsePolicy {
  status: ReformStatus;
  scope: string[];
  land: string[];
}

export type RawCoreBenefitDistrict = BaseBenefitDistrict & {
  date: string | undefined;
};
export type ProcessedCoreBenefitDistrict = BaseBenefitDistrict & {
  date: ReformDate | undefined;
};

export type RawCoreLandUsePolicy = BaseLandUsePolicy & {
  date: string | undefined;
};
export type ProcessedCoreLandUsePolicy = BaseLandUsePolicy & {
  date: ReformDate | undefined;
};

export interface RawCoreEntry {
  place: RawPlace;
  benefit_district?: RawCoreBenefitDistrict[];
  reduce_min?: RawCoreLandUsePolicy[];
  rm_min?: RawCoreLandUsePolicy[];
  add_max?: RawCoreLandUsePolicy[];
}

export interface ProcessedCoreEntry {
  place: ProcessedPlace;
  benefit_district?: ProcessedCoreBenefitDistrict[];
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
