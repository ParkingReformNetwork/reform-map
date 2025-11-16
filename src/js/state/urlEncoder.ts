import { isEqual } from "lodash-es";

import type { FilterState } from "./FilterState";
import { FILTER_OPTIONS } from "../filter-features/options";
import { POPULATION_MAX_INDEX } from "../filter-features/populationSlider";
import { COUNTRY_MAPPING } from "../model/data";

export const MERGED_STRING_SET_OPTIONS = {
  placeType: new Set(FILTER_OPTIONS.merged.placeType),
  includedPolicyChanges: new Set(FILTER_OPTIONS.merged.includedPolicyChanges),
  scope: new Set(FILTER_OPTIONS.merged.scope),
  landUse: new Set(FILTER_OPTIONS.merged.landUse),
  country: new Set(FILTER_OPTIONS.merged.country),
  year: new Set(FILTER_OPTIONS.merged.year),
};

export const DEFAULT_FILTER_STATE: FilterState = {
  searchInput: null,
  policyTypeFilter: "any parking reform",
  status: "adopted",
  allMinimumsRemovedToggle: false,
  ...MERGED_STRING_SET_OPTIONS,
  populationSliderIndexes: [0, POPULATION_MAX_INDEX],
};

const ARRAY_DELIMITER = ".";
const BOOL_TRUE = "y";
const BOOL_FALSE = "n";

class BidirectionalMap<K extends string, V extends string> {
  private constructor(
    private encodeMap: Record<K, V>,
    private decodeMap: Record<V, K>,
  ) {
    this.encodeMap = encodeMap;
    this.decodeMap = decodeMap;
  }

  static from<const T extends ReadonlyArray<readonly [string, string]>>(
    entries: T,
  ) {
    type Entry = T[number];
    const encodeMap = Object.fromEntries(entries) as Record<Entry[0], Entry[1]>;
    const decodeMap = Object.fromEntries(
      entries.map(([a, b]) => [b, a]),
    ) as Record<Entry[1], Entry[0]>;

    return new BidirectionalMap(encodeMap, decodeMap);
  }

  keys(): Set<string> {
    return new Set(Object.keys(this.encodeMap));
  }

  encode(key: K): V {
    return this.encodeMap[key];
  }

  encodeSet(keys: Set<string>): string {
    return Array.from(keys)
      .map((key) => this.encode(key as K))
      .join(ARRAY_DELIMITER);
  }

  decode(value: string | null): K | null {
    if (value === null) return null;
    return this.decodeMap[value as V] ?? null;
  }

  decodeSet(value: string | null, fallback: Set<string>): Set<string> {
    if (value === null) return fallback;
    const parsed = new Set(
      value
        .split(ARRAY_DELIMITER)
        .map((v) => this.decode(v))
        .filter((v) => v !== null),
    );
    return parsed.size ? parsed : fallback;
  }
}

export const POLICY_TYPE_NAME = "reform";
export const STATUS_NAME = "status";
export const ALL_MINIMUMS_REPEALED_TOGGLE_NAME = "repeal";
export const YEAR_NAME = "yr";
export const COUNTRY_NAME = "cntry";
export const PLACE_TYPE_NAME = "juris";
export const INCLUDED_POLICY_NAME = "reforms";
export const LAND_USE_NAME = "lnd";
export const SCOPE_NAME = "scp";
export const POPULATION_NAME = "pop";

export const POLICY_TYPE_MAP = BidirectionalMap.from([
  ["any parking reform", "any"],
  ["add parking maximums", "mx"],
  ["reduce parking minimums", "rd"],
  ["remove parking minimums", "rm"],
  ["parking benefit district", "bd"],
]);
export const STATUS_MAP = BidirectionalMap.from([
  ["adopted", "a"],
  ["proposed", "p"],
  ["repealed", "r"],
]);
export const PLACE_TYPE_MAP = BidirectionalMap.from([
  ["city", "cty"],
  ["state", "st"],
  ["county", "cnty"],
  ["country", "cntry"],
]);
export const LAND_USE_MAP = BidirectionalMap.from([
  ["all uses", "all"],
  ["commercial", "com"],
  ["industrial", "ind"],
  ["medical", "med"],
  ["other", "oth"],
  ["residential, all uses", "res-all"],
  ["residential, low-density", "res-low"],
  ["residential, multi-family", "fam"],
]);
export const SCOPE_MAP = BidirectionalMap.from([
  ["city center / business district", "cntr"],
  ["citywide", "cty"],
  ["main street / special", "main"],
  ["regional", "reg"],
  ["transit-oriented", "trns"],
]);
export const COUNTRY_MAP = BidirectionalMap.from(
  Object.entries(COUNTRY_MAPPING).map(([code, country]) => [
    country!,
    code.toLowerCase(),
  ]),
);
export const YEAR_MAP = BidirectionalMap.from(
  Array.from(MERGED_STRING_SET_OPTIONS.year).map((year) => [year, year]),
);

export function encodeFilterState(filterState: FilterState): URLSearchParams {
  const result = new URLSearchParams();
  if (filterState.policyTypeFilter !== DEFAULT_FILTER_STATE.policyTypeFilter) {
    result.append(
      POLICY_TYPE_NAME,
      POLICY_TYPE_MAP.encode(filterState.policyTypeFilter),
    );
  }

  if (filterState.status !== DEFAULT_FILTER_STATE.status) {
    result.append(STATUS_NAME, STATUS_MAP.encode(filterState.status));
  }

  if (
    filterState.allMinimumsRemovedToggle !==
    DEFAULT_FILTER_STATE.allMinimumsRemovedToggle
  ) {
    result.append(
      ALL_MINIMUMS_REPEALED_TOGGLE_NAME,
      filterState.allMinimumsRemovedToggle ? BOOL_TRUE : BOOL_FALSE,
    );
  }

  if (
    !isEqual(
      filterState.includedPolicyChanges,
      DEFAULT_FILTER_STATE.includedPolicyChanges,
    )
  ) {
    result.append(
      INCLUDED_POLICY_NAME,
      POLICY_TYPE_MAP.encodeSet(filterState.includedPolicyChanges),
    );
  }

  if (!isEqual(filterState.placeType, DEFAULT_FILTER_STATE.placeType)) {
    result.append(
      PLACE_TYPE_NAME,
      PLACE_TYPE_MAP.encodeSet(filterState.placeType),
    );
  }

  if (!isEqual(filterState.country, DEFAULT_FILTER_STATE.country)) {
    result.append(COUNTRY_NAME, COUNTRY_MAP.encodeSet(filterState.country));
  }

  if (!isEqual(filterState.year, DEFAULT_FILTER_STATE.year)) {
    result.append(YEAR_NAME, YEAR_MAP.encodeSet(filterState.year));
  }

  if (!isEqual(filterState.landUse, DEFAULT_FILTER_STATE.landUse)) {
    result.append(LAND_USE_NAME, LAND_USE_MAP.encodeSet(filterState.landUse));
  }

  if (!isEqual(filterState.scope, DEFAULT_FILTER_STATE.scope)) {
    result.append(SCOPE_NAME, SCOPE_MAP.encodeSet(filterState.scope));
  }

  if (
    !isEqual(
      filterState.populationSliderIndexes,
      DEFAULT_FILTER_STATE.populationSliderIndexes,
    )
  ) {
    result.append(
      POPULATION_NAME,
      filterState.populationSliderIndexes.join(ARRAY_DELIMITER),
    );
  }

  result.sort();
  return result;
}

function decodeAllMinimumsRepealed(v: string | null): boolean {
  if (v === BOOL_TRUE) return true;
  if (v === BOOL_FALSE) return false;
  return DEFAULT_FILTER_STATE.allMinimumsRemovedToggle;
}

export function decodePopulation(str: string | null): [number, number] {
  if (str === null) return DEFAULT_FILTER_STATE.populationSliderIndexes;
  let left: number;
  let right: number;
  try {
    const split = str.split(ARRAY_DELIMITER);
    if (split.length !== 2) return DEFAULT_FILTER_STATE.populationSliderIndexes;
    left = Number.parseInt(split[0], 10);
    right = Number.parseInt(split[1], 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return DEFAULT_FILTER_STATE.populationSliderIndexes;
  }
  const isValid = left >= 0 && right <= POPULATION_MAX_INDEX && left < right;
  return isValid ? [left, right] : DEFAULT_FILTER_STATE.populationSliderIndexes;
}

export function queryStringToParams(queryString: string): URLSearchParams {
  const cleanQuery = queryString.startsWith("?")
    ? queryString.slice(1)
    : queryString;
  return new URLSearchParams(cleanQuery);
}

export function decodeFilterState(queryString: string): FilterState {
  const params = queryStringToParams(queryString);
  return {
    searchInput: DEFAULT_FILTER_STATE.searchInput,
    policyTypeFilter:
      POLICY_TYPE_MAP.decode(params.get(POLICY_TYPE_NAME)) ??
      DEFAULT_FILTER_STATE.policyTypeFilter,
    status:
      STATUS_MAP.decode(params.get(STATUS_NAME)) ?? DEFAULT_FILTER_STATE.status,
    allMinimumsRemovedToggle: decodeAllMinimumsRepealed(
      params.get(ALL_MINIMUMS_REPEALED_TOGGLE_NAME),
    ),
    includedPolicyChanges: POLICY_TYPE_MAP.decodeSet(
      params.get(INCLUDED_POLICY_NAME),
      DEFAULT_FILTER_STATE.includedPolicyChanges,
    ),
    year: YEAR_MAP.decodeSet(params.get(YEAR_NAME), DEFAULT_FILTER_STATE.year),
    country: COUNTRY_MAP.decodeSet(
      params.get(COUNTRY_NAME),
      DEFAULT_FILTER_STATE.country,
    ),
    placeType: PLACE_TYPE_MAP.decodeSet(
      params.get(PLACE_TYPE_NAME),
      DEFAULT_FILTER_STATE.placeType,
    ),
    landUse: LAND_USE_MAP.decodeSet(
      params.get(LAND_USE_NAME),
      DEFAULT_FILTER_STATE.landUse,
    ),
    scope: SCOPE_MAP.decodeSet(
      params.get(SCOPE_NAME),
      DEFAULT_FILTER_STATE.scope,
    ),
    populationSliderIndexes: decodePopulation(params.get(POPULATION_NAME)),
  };
}
