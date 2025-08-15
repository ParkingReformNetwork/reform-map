import type { FilterState } from "./FilterState";
import { FILTER_OPTIONS } from "../filter-features/options";
import { POPULATION_MAX_INDEX } from "../filter-features/populationSlider";

export const DEFAULT_FILTER_STATE: FilterState = {
  searchInput: null,
  policyTypeFilter: "remove parking minimums",
  status: "adopted",
  allMinimumsRemovedToggle: true,
  placeType: new Set(FILTER_OPTIONS.merged.placeType),
  includedPolicyChanges: new Set(FILTER_OPTIONS.merged.includedPolicyChanges),
  scope: new Set(FILTER_OPTIONS.merged.scope),
  landUse: new Set(FILTER_OPTIONS.merged.landUse),
  country: new Set(FILTER_OPTIONS.merged.country),
  year: new Set(FILTER_OPTIONS.merged.year),
  populationSliderIndexes: [0, POPULATION_MAX_INDEX],
};

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

  encode(key: K): V {
    return this.encodeMap[key];
  }

  decode(value: string | null, fallback: K): K {
    if (value === null) return fallback;
    return this.decodeMap[value as V] ?? fallback;
  }
}

export const POLICY_TYPE_NAME = "reform";
export const STATUS_NAME = "status";

const POLICY_TYPE_MAP = BidirectionalMap.from([
  ["any parking reform", "any"],
  ["add parking maximums", "mx"],
  ["reduce parking minimums", "rd"],
  ["remove parking minimums", "rm"],
  ["parking benefit district", "bd"],
]);
const STATUS_MAP = BidirectionalMap.from([
  ["adopted", "a"],
  ["proposed", "p"],
  ["repealed", "r"],
]);

export function encode(filterState: FilterState): URLSearchParams {
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
  result.sort();
  return result;
}

export function decode(queryString: string): FilterState {
  const cleanQuery = queryString.startsWith("?")
    ? queryString.slice(1)
    : queryString;
  const params = new URLSearchParams(cleanQuery);
  return {
    ...DEFAULT_FILTER_STATE,
    policyTypeFilter: POLICY_TYPE_MAP.decode(
      params.get(POLICY_TYPE_NAME),
      DEFAULT_FILTER_STATE.policyTypeFilter,
    ),
    status: STATUS_MAP.decode(
      params.get(STATUS_NAME),
      DEFAULT_FILTER_STATE.status,
    ),
  };
}
