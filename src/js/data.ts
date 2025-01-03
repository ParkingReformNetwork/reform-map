import {
  PlaceId,
  ProcessedCoreEntry,
  RawCoreEntry,
  RawCorePolicy,
  PolicyType,
  Date,
  RawPlace,
  ProcessedPlace,
  ProcessedCorePolicy,
  ProcessedLegacyReform,
  ReformStatus,
} from "./types";

export const COUNTRY_MAPPING: Partial<Record<string, string>> = {
  AU: "Australia",
  AT: "Austria",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CK: "Cook Islands",
  CN: "China",
  DE: "Germany",
  FR: "France",
  IE: "Ireland",
  IL: "Israel",
  KR: "Korea",
  MX: "Mexico",
  NZ: "New Zealand",
  SE: "Sweden",
  SG: "Singapore",
  UK: "United Kingdom",
  US: "United States",
  ZA: "South Africa",
};

export function escapePlaceId(v: string): string {
  return v.replace(/ /g, "").replace(",", "_");
}

export function placeIdToUrl(v: string): string {
  return `https://parkingreform.org/mandates-map/city_detail/${escapePlaceId(v)}.html`;
}

export function processPlace(placeId: PlaceId, raw: RawPlace): ProcessedPlace {
  return {
    ...raw,
    country: COUNTRY_MAPPING[raw.country] ?? raw.country,
    url: placeIdToUrl(placeId),
  };
}

export function numberOfPolicyRecords(
  entry: RawCoreEntry | ProcessedCoreEntry,
): number {
  return (
    (entry.add_max?.length ?? 0) +
    (entry.reduce_min?.length ?? 0) +
    (entry.rm_min?.length ?? 0)
  );
}

export function determineAdoptedPolicyTypes(
  entry: RawCoreEntry | ProcessedCoreEntry,
): PolicyType[] {
  const hasPolicy = (
    policies: ProcessedCorePolicy[] | RawCorePolicy[] | undefined,
  ) => !!policies?.filter((policy) => policy.status === "adopted").length;

  const result: PolicyType[] = [];
  if (hasPolicy(entry.add_max)) result.push("add parking maximums");
  if (hasPolicy(entry.reduce_min)) result.push("reduce parking minimums");
  if (hasPolicy(entry.rm_min)) result.push("remove parking minimums");
  return result;
}

export function determinePolicyTypeStatuses(
  entry: RawCoreEntry | ProcessedCoreEntry,
): Record<PolicyType, Set<ReformStatus>> {
  const getStatuses = (
    policies: ProcessedCorePolicy[] | RawCorePolicy[] | undefined,
  ) => new Set(policies?.map((policy) => policy.status) ?? []);
  return {
    "add parking maximums": getStatuses(entry.add_max),
    "reduce parking minimums": getStatuses(entry.reduce_min),
    "remove parking minimums": getStatuses(entry.rm_min),
  };
}

function processPolicy(raw: RawCorePolicy): ProcessedCorePolicy {
  return {
    ...raw,
    date: Date.fromNullable(raw.date),
  };
}

export function processRawCoreEntry(
  placeId: PlaceId,
  raw: RawCoreEntry,
  options: { includeMultipleReforms: boolean },
): ProcessedCoreEntry {
  let unifiedPolicy: ProcessedLegacyReform;
  if (raw.legacy) {
    unifiedPolicy = {
      ...raw.legacy,
      date: Date.fromNullable(raw.legacy.date),
    };
  } else {
    // Else, if `legacy` is missing, it's a new-style entry but should have exactly
    // one new-style policy record.
    const numNonLegacy = numberOfPolicyRecords(raw);
    if (numNonLegacy > 1) {
      throw new Error(
        `${placeId} has ${numNonLegacy} new-style policy records, but is missing a legacy reform. ` +
          "It must either have exactly one new-style policy record or set a legacy reform",
      );
    }
    let newStylePolicy: RawCorePolicy;
    let policyType: PolicyType;
    if (raw.add_max) {
      newStylePolicy = raw.add_max[0];
      policyType = "add parking maximums";
    } else if (raw.reduce_min) {
      newStylePolicy = raw.reduce_min[0];
      policyType = "reduce parking minimums";
    } else if (raw.rm_min) {
      newStylePolicy = raw.rm_min[0];
      policyType = "remove parking minimums";
    } else {
      throw new Error(`${placeId} has no policies set (new-style or legacy).`);
    }
    unifiedPolicy = { ...processPolicy(newStylePolicy), policy: [policyType] };
  }

  const result: ProcessedCoreEntry = {
    place: processPlace(placeId, raw.place),
    unifiedPolicy,
  };
  if (!options.includeMultipleReforms) return result;

  // Else, add the new-style policy records in addition to the legacy reform.
  if (raw.add_max) {
    result.add_max = raw.add_max.map(processPolicy);
  }
  if (raw.reduce_min) {
    result.reduce_min = raw.reduce_min.map(processPolicy);
  }
  if (raw.rm_min) {
    result.rm_min = raw.rm_min.map(processPolicy);
  }
  return result;
}

export default async function readData(options: {
  includeMultipleReforms: boolean;
}): Promise<Record<PlaceId, ProcessedCoreEntry>> {
  const rawData = (await import("../../data/core.json", {
    with: { type: "json" },
  })) as unknown as Record<PlaceId, RawCoreEntry>;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => [
      placeId,
      processRawCoreEntry(placeId, entry, options),
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

export function joinWithConjunction(
  items: string[],
  conjunction: "and" | "or",
): string {
  if (items.length <= 2) {
    return items.join(` ${conjunction} `);
  }
  const lastItem = items[items.length - 1];
  const priorItems = items.slice(0, -1)
  return `${priorItems.join(", ")}, ${conjunction} ${lastItem}`;
}
