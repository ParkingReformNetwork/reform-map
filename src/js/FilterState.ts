import { isEqual } from "lodash-es";
import { PlaceId, ProcessedCoreEntry } from "./types";
import Observable from "./Observable";
import { UNKNOWN_YEAR } from "./filterOptions";

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

// Note that this only tracks state set by the user.
// Computed values are handled elsewhere.
export interface FilterState {
  searchInput: string | null;
  allMinimumsRemovedToggle: boolean;
  policyChange: string[];
  scope: string[];
  landUse: string[];
  status: string[];
  country: string[];
  year: string[];
  populationSliderIndexes: [number, number];
}

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  state: FilterState;
  placeIds: Set<string>;
  matchedCountries: Set<string>;
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
    this.state = new Observable(initialState);
  }

  get totalNumPlaces(): number {
    return Object.keys(this.entries).length;
  }

  get placeIds(): Set<PlaceId> {
    return this.ensureCache().placeIds;
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

  subscribe(observer: (state: FilterState) => void): void {
    this.state.subscribe(observer);
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

    const placeIds = new Set<string>();
    const matchedCountries = new Set<string>();
    for (const placeId in this.entries) {
      if (this.shouldBeRendered(placeId)) {
        placeIds.add(placeId);
        matchedCountries.add(this.entries[placeId].place.country);
      }
    }

    this.cache = {
      state: currentState,
      placeIds,
      matchedCountries,
    };
    return this.cache;
  }

  private shouldBeRendered(placeId: PlaceId): boolean {
    const state = this.state.getValue();
    const entry = this.entries[placeId];

    // Search overrides filter config.
    if (state.searchInput) {
      return state.searchInput === placeId;
    }

    const isScope = entry.unifiedPolicy.scope.some((v) =>
      state.scope.includes(v),
    );
    const isPolicy = entry.unifiedPolicy.policy.some((v) =>
      state.policyChange.includes(v),
    );
    const isLand = entry.unifiedPolicy.land.some((v) =>
      state.landUse.includes(v),
    );
    const isStatus = state.status.includes(entry.unifiedPolicy.status);
    const isCountry = state.country.includes(entry.place.country);
    const isYear = state.year.includes(
      entry.unifiedPolicy.date?.parsed.year.toString() || UNKNOWN_YEAR,
    );

    const isAllMinimumsRepealed =
      !state.allMinimumsRemovedToggle || entry.place.repeal;

    const [sliderLeftIndex, sliderRightIndex] = state.populationSliderIndexes;
    const isPopulation =
      entry.place.pop >= POPULATION_INTERVALS[sliderLeftIndex][1] &&
      entry.place.pop <= POPULATION_INTERVALS[sliderRightIndex][1];

    return (
      isScope &&
      isPolicy &&
      isLand &&
      isStatus &&
      isYear &&
      isCountry &&
      isAllMinimumsRepealed &&
      isPopulation
    );
  }
}
