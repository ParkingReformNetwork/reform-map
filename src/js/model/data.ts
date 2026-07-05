import { encodedPlaceToUrl } from "./placeId";
import { ReformDate } from "./ReformDate";
import {
  ALL_POLICY_TYPE,
  type LandUsePolicyType,
  type PlaceId,
  type PolicyType,
  type ProcessedCoreBenefitDistrict,
  type ProcessedCoreEntry,
  type ProcessedCoreLandUsePolicy,
  type ProcessedPlace,
  type RawCoreBenefitDistrict,
  type RawCoreEntry,
  type RawCoreLandUsePolicy,
  type RawPlace,
  type ReformStatus,
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

export function processPlace(raw: RawPlace): ProcessedPlace {
  return {
    ...raw,
    url: encodedPlaceToUrl(raw.encoded),
  };
}

function getPolicyRecords(
  entry: RawCoreEntry | ProcessedCoreEntry,
  policyType: PolicyType,
): Array<{ status: ReformStatus }> {
  switch (policyType) {
    case "add parking maximums":
      return entry.add_max ?? [];
    case "reduce parking minimums":
      return entry.reduce_min ?? [];
    case "remove parking minimums":
      return entry.rm_min ?? [];
    case "parking benefit district":
      return entry.benefit_district ?? [];
  }
}

export function determineAllPolicyTypes(
  entry: RawCoreEntry | ProcessedCoreEntry,
  status: ReformStatus,
): PolicyType[] {
  return ALL_POLICY_TYPE.filter((policyType) =>
    getPolicyRecords(entry, policyType).some((p) => p.status === status),
  );
}

export function determinePolicyTypeStatuses(
  entry: RawCoreEntry | ProcessedCoreEntry,
): Record<PolicyType, Set<ReformStatus>> {
  return Object.fromEntries(
    ALL_POLICY_TYPE.map((policyType) => [
      policyType,
      new Set(getPolicyRecords(entry, policyType).map((p) => p.status)),
    ]),
  ) as Record<PolicyType, Set<ReformStatus>>;
}

export function getLandUsePolicyRecords(
  entry: ProcessedCoreEntry,
  policyType: LandUsePolicyType,
): ProcessedCoreLandUsePolicy[] {
  switch (policyType) {
    case "add parking maximums":
      return entry.add_max ?? [];
    case "reduce parking minimums":
      return entry.reduce_min ?? [];
    case "remove parking minimums":
      return entry.rm_min ?? [];
  }
}

function processLandUsePolicy(
  raw: RawCoreLandUsePolicy,
): ProcessedCoreLandUsePolicy {
  return {
    ...raw,
    date: ReformDate.fromNullable(raw.date),
  };
}

function processBenefitDistrict(
  raw: RawCoreBenefitDistrict,
): ProcessedCoreBenefitDistrict {
  return {
    ...raw,
    date: ReformDate.fromNullable(raw.date),
  };
}

export function processRawCoreEntry(raw: RawCoreEntry): ProcessedCoreEntry {
  const result: ProcessedCoreEntry = {
    place: processPlace(raw.place),
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
      processRawCoreEntry(entry),
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
