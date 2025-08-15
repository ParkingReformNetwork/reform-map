import { placeIdToUrl } from "./placeId";
import {
  PlaceId,
  ProcessedCoreEntry,
  RawCoreEntry,
  RawCoreLandUsePolicy,
  PolicyType,
  Date,
  RawPlace,
  ProcessedPlace,
  ProcessedCoreLandUsePolicy,
  ReformStatus,
  RawCoreBenefitDistrict,
  ProcessedCoreBenefitDistrict,
} from "./types";

export const COUNTRIES_PREFIXED_BY_THE = new Set([
  "United States",
  "United Kingdom",
  "Netherlands",
]);

export const COUNTRY_MAPPING: Partial<Record<string, string>> = {
  AU: "Australia",
  AT: "Austria",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CK: "Cook Islands",
  CN: "China",
  DE: "Germany",
  DK: "Denmark",
  FI: "Finland",
  FR: "France",
  IE: "Ireland",
  IN: "India",
  IL: "Israel",
  IS: "Iceland",
  KR: "Korea",
  MX: "Mexico",
  NL: "Netherlands",
  NZ: "New Zealand",
  SE: "Sweden",
  SG: "Singapore",
  UK: "United Kingdom",
  US: "United States",
  ZA: "South Africa",
};

export function processPlace(placeId: PlaceId, raw: RawPlace): ProcessedPlace {
  return {
    ...raw,
    url: placeIdToUrl(placeId),
  };
}

export function determineAllPolicyTypes(
  entry: RawCoreEntry | ProcessedCoreEntry,
  status: ReformStatus,
): PolicyType[] {
  const hasPolicy = (policies: Array<{ status: ReformStatus }> | undefined) =>
    !!policies?.filter((policy) => policy.status === status).length;

  const result: PolicyType[] = [];
  if (hasPolicy(entry.add_max)) result.push("add parking maximums");
  if (hasPolicy(entry.reduce_min)) result.push("reduce parking minimums");
  if (hasPolicy(entry.rm_min)) result.push("remove parking minimums");
  if (hasPolicy(entry.benefit_district))
    result.push("parking benefit district");
  return result;
}

export function determinePolicyTypeStatuses(
  entry: RawCoreEntry | ProcessedCoreEntry,
): Record<PolicyType, Set<ReformStatus>> {
  const getStatuses = (policies: Array<{ status: ReformStatus }> | undefined) =>
    new Set(policies?.map((policy) => policy.status) ?? []);
  return {
    "add parking maximums": getStatuses(entry.add_max),
    "reduce parking minimums": getStatuses(entry.reduce_min),
    "remove parking minimums": getStatuses(entry.rm_min),
    "parking benefit district": getStatuses(entry.benefit_district),
  };
}

function processLandUsePolicy(
  raw: RawCoreLandUsePolicy,
): ProcessedCoreLandUsePolicy {
  return {
    ...raw,
    date: Date.fromNullable(raw.date),
  };
}

function processBenefitDistrict(
  raw: RawCoreBenefitDistrict,
): ProcessedCoreBenefitDistrict {
  return {
    ...raw,
    date: Date.fromNullable(raw.date),
  };
}

export function processRawCoreEntry(
  placeId: PlaceId,
  raw: RawCoreEntry,
): ProcessedCoreEntry {
  const result: ProcessedCoreEntry = {
    place: processPlace(placeId, raw.place),
  };
  if (raw.add_max) {
    result.add_max = raw.add_max.map(processLandUsePolicy);
  }
  if (raw.reduce_min) {
    result.reduce_min = raw.reduce_min.map(processLandUsePolicy);
  }
  if (raw.rm_min) {
    result.rm_min = raw.rm_min.map(processLandUsePolicy);
  }
  if (raw.benefit_district) {
    result.benefit_district = raw.benefit_district.map(processBenefitDistrict);
  }
  return result;
}

export default async function readData(): Promise<
  Record<PlaceId, ProcessedCoreEntry>
> {
  const rawData = (await import("../../../data/core.json", {
    with: { type: "json" },
  })) as unknown as Record<PlaceId, RawCoreEntry>;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => [
      placeId,
      processRawCoreEntry(placeId, entry),
    ]),
  );
}

export function getFilteredIndexes<T>(
  array: T[],
  predicate: (value: T) => boolean,
): number[] {
  return array.reduce((indexes: number[], currentValue, currentIndex) => {
    if (predicate(currentValue)) {
      indexes.push(currentIndex);
    }
    return indexes;
  }, []);
}
