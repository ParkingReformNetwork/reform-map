import { COUNTRY_MAPPING } from "../../src/js/model/data";
import {
  PolicyType,
  RawCorePolicy,
  ReformStatus,
  UNKNOWN_YEAR,
  Date,
  RawPlace,
  RawCoreEntry,
} from "../../src/js/model/types";

export const ALL_POLICY_TYPE: PolicyType[] = [
  "add parking maximums",
  "reduce parking minimums",
  "remove parking minimums",
];

export const ALL_STATUS: ReformStatus[] = ["adopted", "proposed", "repealed"];

/** The option values for a single dataset. */
class OptionValues {
  readonly placeType: Set<string>;
  readonly country: Set<string>;
  readonly scope: Set<string>;
  readonly landUse: Set<string>;
  readonly year: Set<string>;

  constructor() {
    this.placeType = new Set();
    this.country = new Set();
    this.scope = new Set();
    this.landUse = new Set();
    this.year = new Set([UNKNOWN_YEAR]);
  }

  add(place: RawPlace, policyRecord: RawCorePolicy): void {
    this.placeType.add(place.type);
    this.country.add(COUNTRY_MAPPING[place.country] ?? place.country);
    policyRecord.scope.forEach((v) => this.scope.add(v));
    policyRecord.land.forEach((v) => this.landUse.add(v));
    if (policyRecord.date) {
      this.year.add(new Date(policyRecord.date).parsed.year.toString());
    }
  }

  export() {
    return {
      placeType: Array.from(this.placeType).sort(),
      country: Array.from(this.country).sort(),
      scope: Array.from(this.scope).sort(),
      landUse: Array.from(this.landUse).sort(),
      year: Array.from(this.year).sort().reverse(),
    };
  }
}

export function determineOptionValues(entries: RawCoreEntry[]) {
  const merged = new OptionValues();
  const addMax = new OptionValues();
  const reduceMin = new OptionValues();
  const rmMin = new OptionValues();

  entries.forEach((entry) => {
    entry.add_max?.forEach((policyRecord) => {
      merged.add(entry.place, policyRecord);
      addMax.add(entry.place, policyRecord);
    });
    entry.reduce_min?.forEach((policyRecord) => {
      merged.add(entry.place, policyRecord);
      reduceMin.add(entry.place, policyRecord);
    });
    entry.rm_min?.forEach((policyRecord) => {
      merged.add(entry.place, policyRecord);
      rmMin.add(entry.place, policyRecord);
    });
  });

  const result = {
    policy: ALL_POLICY_TYPE,
    status: ALL_STATUS,
    merged: merged.export(),
    addMax: addMax.export(),
    reduceMin: reduceMin.export(),
    rmMin: rmMin.export(),
  };
  return result;
}
