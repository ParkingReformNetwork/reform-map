import { isEqual } from "lodash-es";
import {
  PlaceId,
  PlaceType,
  PolicyType,
  ProcessedCoreEntry,
  ProcessedCorePolicy,
  ProcessedPlace,
  UNKNOWN_YEAR,
} from "../model/types";
import Observable from "./Observable";
import { determineAdoptedPolicyTypes, getFilteredIndexes } from "../model/data";

export const POPULATION_INTERVALS: Array<[string, number]> = [
  ["100", 100],
  ["5k", 5000],
  ["25k", 25000],
  ["50k", 50000],
  ["100k", 100000],
  ["500k", 500000],
  ["1M", 1000000],
  ["75M", 750000000],
];

export type PolicyTypeFilter = PolicyType | "any parking reform";

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
  placeType: Set<string>;
  includedPolicyChanges: Set<string>;
  scope: Set<string>;
  landUse: Set<string>;
  status: Set<string>;
  country: Set<string>;
  year: Set<string>;
  populationSliderIndexes: [number, number];
}

interface PlaceMatchSearch {
  type: "search";
}

interface PlaceMatchSinglePolicy {
  type: "single policy";
  policyType: PolicyType;
  matchingIndexes: number[];
}

interface PlaceMatchAnyPolicy {
  type: "any";
  // Note that we still record if a place has a certain policy type
  // even if the filter state is actively ignoring that policy.
  hasRmMin: boolean;
  hasReduceMin: boolean;
  hasAddMax: boolean;
}

type PlaceMatch =
  | PlaceMatchSearch
  | PlaceMatchSinglePolicy
  | PlaceMatchAnyPolicy;

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  state: FilterState;
  matchedPlaces: Record<PlaceId, PlaceMatch>;
  matchedCountries: Set<string>;
  matchedPolicyTypesForAnyPolicy: Set<PolicyType>;
  matchedPlaceTypes: Set<PlaceType>;
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
    this.state = new Observable("FilterState", initialState);
  }

  get totalNumPlaces(): number {
    return Object.keys(this.entries).length;
  }

  get matchedPlaces(): Record<PlaceId, PlaceMatch> {
    return this.ensureCache().matchedPlaces;
  }

  get placeIds(): Set<PlaceId> {
    return new Set(Object.keys(this.matchedPlaces));
  }

  get matchedCountries(): Set<string> {
    return this.ensureCache().matchedCountries;
  }

  get matchedPlaceTypes(): Set<PlaceType> {
    return this.ensureCache().matchedPlaceTypes;
  }

  /// The policy types the matched places have.
  ///
  /// This is only set when the policy type is 'any parking reform'.
  ///
  /// Stores all policy types belonging to matched places, even if the
  /// filter state is set to ignore that policy type.
  get matchedPolicyTypes(): Set<PolicyType> {
    return this.ensureCache().matchedPolicyTypesForAnyPolicy;
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

    const matchedPlaces: Record<PlaceId, PlaceMatch> = {};
    const matchedCountries = new Set<string>();
    const matchedPolicyTypes = new Set<PolicyType>();
    const matchedPlaceTypes = new Set<PlaceType>();
    for (const placeId in this.entries) {
      const match = this.getPlaceMatch(placeId);
      if (!match) continue;
      matchedPlaces[placeId] = match;
      matchedCountries.add(this.entries[placeId].place.country);
      matchedPlaceTypes.add(this.entries[placeId].place.type);
      if (match.type === "any") {
        if (match.hasAddMax) matchedPolicyTypes.add("add parking maximums");
        if (match.hasReduceMin)
          matchedPolicyTypes.add("reduce parking minimums");
        if (match.hasRmMin) matchedPolicyTypes.add("remove parking minimums");
      }
    }

    this.cache = {
      state: currentState,
      matchedPlaces,
      matchedCountries,
      matchedPolicyTypesForAnyPolicy: matchedPolicyTypes,
      matchedPlaceTypes,
    };
    return this.cache;
  }

  private matchesPlace(place: ProcessedPlace): boolean {
    const filterState = this.state.getValue();

    const isPlaceType = filterState.placeType.has(place.type);
    if (!isPlaceType) return false;

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

  private matchesPolicyRecord(
    policyRecord: ProcessedCorePolicy,
    options: { ignoreScope?: boolean; ignoreLand?: boolean },
  ): boolean {
    const filterState = this.state.getValue();

    const isStatus = filterState.status.has(policyRecord.status);
    if (!isStatus) return false;

    const isYear = filterState.year.has(
      policyRecord.date?.parsed.year.toString() || UNKNOWN_YEAR,
    );
    if (!isYear) return false;

    if (!options.ignoreScope) {
      const isScope = policyRecord.scope.some((v) => filterState.scope.has(v));
      if (!isScope) return false;
    }

    if (!options.ignoreLand) {
      const isLand = policyRecord.land.some((v) => filterState.landUse.has(v));
      if (!isLand) return false;
    }

    return true;
  }

  private getPlaceMatch(placeId: PlaceId): PlaceMatch | null {
    const filterState = this.state.getValue();
    const entry = this.entries[placeId];

    // Search overrides filter config.
    if (filterState.searchInput) {
      return filterState.searchInput === placeId
        ? {
            type: "search",
          }
        : null;
    }

    const isPlace = this.matchesPlace(entry.place);
    if (!isPlace) return null;

    if (filterState.policyTypeFilter === "any parking reform") {
      const policyTypes = determineAdoptedPolicyTypes(entry);
      const isPolicyType = policyTypes.some((v) =>
        filterState.includedPolicyChanges.has(v),
      );
      return isPolicyType
        ? {
            type: "any",
            hasAddMax: policyTypes.includes("add parking maximums"),
            hasReduceMin: policyTypes.includes("reduce parking minimums"),
            hasRmMin: policyTypes.includes("remove parking minimums"),
          }
        : null;
    }

    if (filterState.policyTypeFilter === "add parking maximums") {
      const matchingPolicies = getFilteredIndexes(
        entry.add_max ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord, {}),
      );
      return matchingPolicies.length
        ? {
            type: "single policy",
            policyType: "add parking maximums",
            matchingIndexes: matchingPolicies,
          }
        : null;
    }

    if (filterState.policyTypeFilter === "reduce parking minimums") {
      const matchingPolicies = getFilteredIndexes(
        entry.reduce_min ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord, {}),
      );
      return matchingPolicies.length
        ? {
            type: "single policy",
            policyType: "reduce parking minimums",
            matchingIndexes: matchingPolicies,
          }
        : null;
    }

    if (filterState.policyTypeFilter === "remove parking minimums") {
      // If 'all minimums removed' is checked, then 'land use' and 'scope' are irrelevent:
      //  - the place will only have a single policy record for minimum removal
      //  - that policy record must be set to "All uses" and "Citywide"
      const options = {
        ignoreScope: filterState.allMinimumsRemovedToggle,
        ignoreLand: filterState.allMinimumsRemovedToggle,
      };
      const matchingPolicies = getFilteredIndexes(
        entry.rm_min ?? [],
        (policyRecord) => this.matchesPolicyRecord(policyRecord, options),
      );
      return matchingPolicies.length
        ? {
            type: "single policy",
            policyType: "remove parking minimums",
            matchingIndexes: matchingPolicies,
          }
        : null;
    }

    throw new Error(`Unreachable code`);
  }
}
