import {
  determineAllPolicyTypes,
  getFilteredIndexes,
  getLandUsePolicyRecords,
} from "../model/data";
import type { ReformDate } from "../model/ReformDate";
import {
  ALL_POLICY_TYPE,
  type PlaceId,
  type PlaceType,
  type PolicyType,
  type ProcessedCoreBenefitDistrict,
  type ProcessedCoreEntry,
  type ProcessedCoreLandUsePolicy,
  type ProcessedPlace,
  type ReformStatus,
  UNKNOWN_YEAR,
} from "../model/types";
import Observable from "./Observable";

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

export const ALL_POLICY_TYPE_FILTER = [
  "any parking reform",
  ...ALL_POLICY_TYPE,
] as const;
export type PolicyTypeFilter = (typeof ALL_POLICY_TYPE_FILTER)[number];

// Note that this only tracks state set by the user.
// Computed values are handled elsewhere.
//
// This is a single unified global view of the state, even though we
// have multiple datasets like 'remove parking minimums'. Some of the
// option groups are not relevant to certain datasets; for example,
// "any parking reform" will ignore `scope`. Likewise, certain values
// within an option group are irrelevant to certain data sets; for example,
// while all datasets have 'country', their entries usually only have a subset
// of the total set of countries across all datsets. Nevertheless,
// we unify the state so that it persists when changing the policy type.
//
// Keep key names in alignment with DataSetSpecificOptions in filter-features/options.ts
export interface FilterState {
  searchInput: string | null;
  policyTypeFilter: PolicyTypeFilter;
  status: ReformStatus;
  allMinimumsRemovedToggle: boolean;
  placeType: Set<string>;
  includedPolicyChanges: Set<PolicyType>;
  scope: Set<string>;
  landUse: Set<string>;
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
  // Note that we still record all policy types a place has, even ones the
  // filter state is actively excluding via includedPolicyChanges.
  policyTypes: PolicyType[];
}

export type PlaceMatch =
  | PlaceMatchSearch
  | PlaceMatchSinglePolicy
  | PlaceMatchAnyPolicy;

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  version: number;
  matchedPlaces: Record<PlaceId, PlaceMatch>;
  placeIds: Set<PlaceId>;
  numMatchedPlaces: number;
  matchedCountries: Set<string>;
  matchedPolicyTypesForAnyPolicy: Set<PolicyType>;
  matchedPlaceTypes: Set<PlaceType>;
}

/**
 * Return whether the 'only places with all minimums removed' toggle
 * is shown to the user, which is based on the current dataset.
 */
export function isAllMinimumsRemovedToggleShown(
  filterState: Pick<FilterState, "policyTypeFilter" | "status">,
): boolean {
  return (
    filterState.policyTypeFilter === "remove parking minimums" &&
    filterState.status === "adopted"
  );
}

/**
 * Return whether the 'only places with all minimums removed' toggle
 * is activated and relevant to the current dataset.
 */
export function isAllMinimumsRemovedToggleInEffect(
  filterState: Pick<
    FilterState,
    "allMinimumsRemovedToggle" | "policyTypeFilter" | "status"
  >,
): boolean {
  return (
    filterState.allMinimumsRemovedToggle &&
    isAllMinimumsRemovedToggleShown(filterState)
  );
}

export class PlaceFilterManager {
  private readonly state: Observable<FilterState>;

  readonly entries: Record<PlaceId, ProcessedCoreEntry>;

  private cache: CacheEntry | null = null;

  // Bumped on every state change so the cache can be invalidated with a cheap
  // integer comparison.
  private stateVersion: number = 0;

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
    return this.ensureCache().placeIds;
  }

  get numMatchedPlaces(): number {
    return this.ensureCache().numMatchedPlaces;
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
    this.stateVersion += 1;
    this.state.setValue({ ...priorState, ...changes });
  }

  subscribe(id: string, observer: (state: FilterState) => void): void {
    this.state.subscribe(id, observer);
  }

  initialize(): void {
    this.state.initialize();
  }

  /// Recompute the CacheEntry if FilterState has changed.
  private ensureCache(): CacheEntry {
    if (this.cache && this.cache.version === this.stateVersion) {
      return this.cache;
    }

    const matchedPlaces: Record<PlaceId, PlaceMatch> = {};
    const placeIds = new Set<PlaceId>();
    const matchedCountries = new Set<string>();
    const matchedPolicyTypes = new Set<PolicyType>();
    const matchedPlaceTypes = new Set<PlaceType>();
    let numMatchedPlaces = 0;
    for (const placeId of Object.keys(this.entries)) {
      const match = this.getPlaceMatch(placeId);
      if (!match) continue;
      matchedPlaces[placeId] = match;
      placeIds.add(placeId);
      numMatchedPlaces += 1;
      matchedCountries.add(this.entries[placeId].place.country);
      matchedPlaceTypes.add(this.entries[placeId].place.type);
      if (match.type === "any") {
        for (const policyType of match.policyTypes) {
          matchedPolicyTypes.add(policyType);
        }
      }
    }

    this.cache = {
      version: this.stateVersion,
      matchedPlaces,
      placeIds,
      numMatchedPlaces,
      matchedCountries,
      matchedPolicyTypesForAnyPolicy: matchedPolicyTypes,
      matchedPlaceTypes,
    };
    return this.cache;
  }

  private matchesPlace(place: ProcessedPlace): boolean {
    const filterState = this.state.getValue();

    const matchesPlaceType = filterState.placeType.has(place.type);
    if (!matchesPlaceType) return false;

    const matchesCountry = filterState.country.has(place.country);
    if (!matchesCountry) return false;

    const matchesRepealFilter =
      !isAllMinimumsRemovedToggleInEffect(filterState) || place.repeal;
    if (!matchesRepealFilter) return false;

    const [sliderLeftIndex, sliderRightIndex] =
      filterState.populationSliderIndexes;
    const matchesPopulation =
      place.pop >= POPULATION_INTERVALS[sliderLeftIndex][1] &&
      place.pop <= POPULATION_INTERVALS[sliderRightIndex][1];
    return matchesPopulation;
  }

  private matchesStatusAndYear(record: {
    status: ReformStatus;
    date: ReformDate | undefined;
  }): boolean {
    const filterState = this.state.getValue();

    const matchesStatus = record.status === filterState.status;
    if (!matchesStatus) return false;

    return filterState.year.has(record.date?.year || UNKNOWN_YEAR);
  }

  private matchesLandUsePolicy(
    policyRecord: ProcessedCoreLandUsePolicy,
    options: { ignoreScope?: boolean; ignoreLand?: boolean },
  ): boolean {
    const filterState = this.state.getValue();

    if (!this.matchesStatusAndYear(policyRecord)) return false;

    if (!options.ignoreScope) {
      const matchesScope = policyRecord.scope.some((v) =>
        filterState.scope.has(v),
      );
      if (!matchesScope) return false;
    }

    if (!options.ignoreLand) {
      const matchesLand = policyRecord.land.some((v) =>
        filterState.landUse.has(v),
      );
      if (!matchesLand) return false;
    }

    return true;
  }

  private matchesBenefitDistrict(
    record: ProcessedCoreBenefitDistrict,
  ): boolean {
    return this.matchesStatusAndYear(record);
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

    if (!this.matchesPlace(entry.place)) return null;

    switch (filterState.policyTypeFilter) {
      case "any parking reform": {
        const policyTypes = determineAllPolicyTypes(entry, filterState.status);
        const matchesPolicyType = policyTypes.some((v) =>
          filterState.includedPolicyChanges.has(v),
        );
        return matchesPolicyType ? { type: "any", policyTypes } : null;
      }

      case "add parking maximums":
      case "reduce parking minimums":
      case "remove parking minimums": {
        const policyType = filterState.policyTypeFilter;
        // If 'all minimums removed' is in effect, then 'land use' and 'scope' are irrelevant:
        //  - the place will only have a single policy record for minimum removal
        //  - that policy record must be set to "All uses" and "Citywide"
        const ignoreLandAndScope =
          policyType === "remove parking minimums" &&
          isAllMinimumsRemovedToggleInEffect(filterState);
        const matchingPolicies = getFilteredIndexes(
          getLandUsePolicyRecords(entry, policyType),
          (policyRecord) =>
            this.matchesLandUsePolicy(policyRecord, {
              ignoreScope: ignoreLandAndScope,
              ignoreLand: ignoreLandAndScope,
            }),
        );
        return matchingPolicies.length
          ? {
              type: "single policy",
              policyType,
              matchingIndexes: matchingPolicies,
            }
          : null;
      }

      case "parking benefit district": {
        const matchingPolicies = getFilteredIndexes(
          entry.benefit_district ?? [],
          (record) => this.matchesBenefitDistrict(record),
        );
        return matchingPolicies.length
          ? {
              type: "single policy",
              policyType: "parking benefit district",
              matchingIndexes: matchingPolicies,
            }
          : null;
      }

      default:
        throw new Error(`Unrecognized policy type`);
    }
  }
}
