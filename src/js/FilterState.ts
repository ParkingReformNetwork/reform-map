import { isEqual } from "lodash-es";
import {
  PlaceId,
  PolicyType,
  ProcessedCoreEntry,
  ProcessedCorePolicy,
  ProcessedPlace,
} from "./types";
import Observable from "./Observable";
import { UNKNOWN_YEAR } from "./filterOptions";
import { determinePolicyTypes, getFilteredIndexes } from "./data";

export const POPULATION_INTERVALS: Array<[string, number]> = [
  ["100", 100],
  ["5k", 5000],
  ["25k", 25000],
  ["50k", 50000],
  ["100k", 100000],
  ["500k", 500000],
  ["1M", 1000000],
  ["50M", 50000000],
];

export type PolicyTypeFilter =
  | PolicyType
  | "legacy reform"
  | "any parking reform";

// Note that this only tracks state set by the user.
// Computed values are handled elsewhere.
//
// Some of the values are not relevant to certain policy types.
// For example, "any parking reform" will ignore `scope`. Still,
// we preserve the state so it persists when changing the policy type.
//
// Keep key names in alignment with FilterGroupKey in filterOptions.ts
export interface FilterState {
  searchInput: string | null;
  policyTypeFilter: PolicyTypeFilter;
  allMinimumsRemovedToggle: boolean;
  includedPolicyChanges: Set<string>;
  scope: Set<string>;
  landUse: Set<string>;
  status: Set<string>;
  country: Set<string>;
  year: Set<string>;
  populationSliderIndexes: [number, number];
}

/// The policy record indexes matching the current FilterState.
///
/// Only one of the policy types will be set at a time. If the PolicyTypeFilter
/// is set to 'any parking reform', none of the indexes will be set.
export interface MatchedPolicyRecords {
  rmMinIdx: number[];
  reduceMinIdx: number[];
  addMaxIdx: number[];
}

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  state: FilterState;
  matchedPolicyRecords: Record<PlaceId, MatchedPolicyRecords>;
  matchedCountries: Set<string>;
  numMatchedPolicyRecords: number;
}

export class PlaceFilterManager {
  private readonly state: Observable<FilterState>;

  readonly entries: Record<PlaceId, ProcessedCoreEntry>;

  private cache: CacheEntry | null = null;

  constructor(
    entries: Record<PlaceId, ProcessedCoreEntry>,
    initialState: FilterState,
  ) {
    this.entries = entries;
    this.state = new Observable({
      initialValue: initialState,
      id: "FilterState",
      enableBenchmarks: true,
    });
  }

  get totalNumPlaces(): number {
    return Object.keys(this.entries).length;
  }

  get matchedPolicyRecords(): Record<PlaceId, MatchedPolicyRecords> {
    return this.ensureCache().matchedPolicyRecords;
  }

  /// The number of matching policy records, given that a place may have >1 policy record.
  ///
  /// Note that this will be zero with 'any parking reform' since only the place
  /// matches and not individual policy records.
  get numMatchedPolicyRecords(): number {
    return this.ensureCache().numMatchedPolicyRecords;
  }

  get placeIds(): Set<PlaceId> {
    return new Set(Object.keys(this.matchedPolicyRecords));
  }

  get matchedCountries(): Set<string> {
    return this.ensureCache().matchedCountries;
  }

  getState(): FilterState {
    return this.state.getValue();
  }

  update(changes: Partial<FilterState>): void {
    const priorState = this.state.getValue();
    this.state.setValue({ ...priorState, ...changes });
  }

  subscribe(id: string, observer: (state: FilterState) => void): void {
    this.state.subscribe(observer, id);
  }

  initialize(): void {
    this.state.initialize();
  }

  /// Recompute the CacheEntry if FilterState has changed.
  private ensureCache(): CacheEntry {
    const currentState = this.state.getValue();
    if (this.cache && isEqual(currentState, this.cache.state)) {
      return this.cache;
    }

    const matchedPolicyRecords: Record<PlaceId, MatchedPolicyRecords> = {};
    const matchedCountries = new Set<string>();
    let numMatchedPolicyRecords = 0;
    for (const placeId in this.entries) {
      const matchedRecords = this.getMatchingPolicyRecords(placeId);
      if (!matchedRecords) continue;
      matchedPolicyRecords[placeId] = matchedRecords;
      matchedCountries.add(this.entries[placeId].place.country);
      numMatchedPolicyRecords +=
        matchedRecords.addMaxIdx.length +
        matchedRecords.reduceMinIdx.length +
        matchedRecords.rmMinIdx.length;
    }

    this.cache = {
      state: currentState,
      matchedPolicyRecords,
      matchedCountries,
      numMatchedPolicyRecords,
    };
    return this.cache;
  }

  private matchesPlace(place: ProcessedPlace): boolean {
    const filterState = this.state.getValue();

    const isCountry = filterState.country.has(place.country);
    if (!isCountry) return false;

    const isAllMinimumsRepealed =
      // If the toggle is false, we don't care.
      !filterState.allMinimumsRemovedToggle ||
      // If the policy type is "reduce parking minimums", we don't care about
      // `allMinimumsRemovedToggle` because no places have that toggle set &
      // also have parking minimum reductions.
      filterState.policyTypeFilter === "reduce parking minimums" ||
      place.repeal;
    if (!isAllMinimumsRepealed) return false;

    const [sliderLeftIndex, sliderRightIndex] =
      filterState.populationSliderIndexes;
    const isPopulation =
      place.pop >= POPULATION_INTERVALS[sliderLeftIndex][1] &&
      place.pop <= POPULATION_INTERVALS[sliderRightIndex][1];
    return isPopulation;
  }

  private matchesPolicyRecord(policyRecord: ProcessedCorePolicy): boolean {
    const filterState = this.state.getValue();

    const isStatus = filterState.status.has(policyRecord.status);
    if (!isStatus) return false;

    const isYear = filterState.year.has(
      policyRecord.date?.parsed.year.toString() || UNKNOWN_YEAR,
    );
    if (!isYear) return false;

    const isScope = policyRecord.scope.some((v) => filterState.scope.has(v));
    if (!isScope) return false;

    const isLand = policyRecord.land.some((v) => filterState.landUse.has(v));
    return isLand;
  }

  private getMatchingPolicyRecords(
    placeId: PlaceId,
  ): MatchedPolicyRecords | null {
    const filterState = this.state.getValue();
    const entry = this.entries[placeId];

    // Search overrides filter config. It acts like 'any parking reform', so
    // return empty policy record indexes if it's a match.
    if (filterState.searchInput) {
      return filterState.searchInput === placeId
        ? {
            rmMinIdx: [],
            reduceMinIdx: [],
            addMaxIdx: [],
          }
        : null;
    }

    const isPlace = this.matchesPlace(entry.place);
    if (!isPlace) return null;

    if (filterState.policyTypeFilter === "legacy reform") {
      const isPolicyType = entry.unifiedPolicy.policy.some((v) =>
        filterState.includedPolicyChanges.has(v),
      );
      if (!isPolicyType) return null;
      return this.matchesPolicyRecord(entry.unifiedPolicy)
        ? {
            rmMinIdx: [],
            reduceMinIdx: [],
            addMaxIdx: [],
          }
        : null;
    }

    if (filterState.policyTypeFilter === "any parking reform") {
      const policyTypes = determinePolicyTypes(entry);
      const isPolicyType = policyTypes.some((v) =>
        filterState.includedPolicyChanges.has(v),
      );
      return isPolicyType
        ? {
            rmMinIdx: [],
            reduceMinIdx: [],
            addMaxIdx: [],
          }
        : null;
    }

    if (filterState.policyTypeFilter === "add parking maximums") {
      const matchingPolicies = getFilteredIndexes(
        entry.add_max ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord),
      );
      return matchingPolicies.length
        ? { addMaxIdx: matchingPolicies, reduceMinIdx: [], rmMinIdx: [] }
        : null;
    }

    if (filterState.policyTypeFilter === "reduce parking minimums") {
      const matchingPolicies = getFilteredIndexes(
        entry.reduce_min ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord),
      );
      return matchingPolicies.length
        ? { addMaxIdx: [], reduceMinIdx: matchingPolicies, rmMinIdx: [] }
        : null;
    }

    if (filterState.policyTypeFilter === "remove parking minimums") {
      const matchingPolicies = getFilteredIndexes(
        entry.rm_min ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord),
      );
      return matchingPolicies.length
        ? { addMaxIdx: [], reduceMinIdx: [], rmMinIdx: matchingPolicies }
        : null;
    }

    throw new Error(`Unreachable code`);
  }
}
