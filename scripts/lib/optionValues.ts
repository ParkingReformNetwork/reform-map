import { COUNTRY_MAPPING } from "../../src/js/model/data";
import {
  PolicyType,
  RawCorePolicy,
  ReformStatus,
  UNKNOWN_YEAR,
  Date,
} from "../../src/js/model/types";
import { RawCompleteEntry } from "./data";

export const ALL_POLICY_TYPE: PolicyType[] = [
  "add parking maximums",
  "reduce parking minimums",
  "remove parking minimums",
];

export const ALL_STATUS: ReformStatus[] = ["adopted", "proposed", "repealed"];

export function determineOptionValues(entries: RawCompleteEntry[]) {
  const placeType = new Set<string>();
  const scope = new Set<string>();
  const landUse = new Set<string>();
  const country = new Set<string>();
  const year = new Set<string>([UNKNOWN_YEAR]);

  const savePolicyRecord = (policyRecord: RawCorePolicy): void => {
    policyRecord.scope.forEach((v) => scope.add(v));
    policyRecord.land.forEach((v) => landUse.add(v));
    if (policyRecord.date) {
      year.add(new Date(policyRecord.date).parsed.year.toString());
    }
  };

  entries.forEach((entry) => {
    placeType.add(entry.place.type);
    country.add(COUNTRY_MAPPING[entry.place.country] ?? entry.place.country);
    entry.add_max?.forEach(savePolicyRecord);
    entry.reduce_min?.forEach(savePolicyRecord);
    entry.rm_min?.forEach(savePolicyRecord);
  });
  const result = {
    policy: ALL_POLICY_TYPE,
    status: ALL_STATUS,
    placeType: Array.from(placeType).sort(),
    scope: Array.from(scope).sort(),
    landUse: Array.from(landUse).sort(),
    country: Array.from(country).sort(),
    year: Array.from(year).sort().reverse(),
  };
  return result;
}
