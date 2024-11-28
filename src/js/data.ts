import {
  PlaceId,
  ProcessedCoreEntry,
  RawCoreEntry,
  RawCorePolicy,
  PolicyType,
  Date,
  RawPlace,
  ProcessedPlace,
} from "./types";

const countryMapping: Partial<Record<string, string>> = {
  AU: "Australia",
  AT: "Austria",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CN: "China",
  DE: "Germany",
  FR: "France",
  IE: "Ireland",
  IL: "Israel",
  MX: "Mexico",
  NZ: "New Zealand",
  SE: "Sweden",
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
    country: countryMapping[raw.country] ?? raw.country,
    url: placeIdToUrl(placeId),
  };
}

export function processRawCoreEntry(
  placeId: PlaceId,
  raw: RawCoreEntry,
): ProcessedCoreEntry {
  if (raw.legacy) {
    return {
      place: processPlace(placeId, raw.place),
      unifiedPolicy: {
        ...raw.legacy,
        date: Date.fromNullable(raw.legacy.date),
      },
    };
  }

  const numNonLegacy =
    (raw.add_max?.length || 0) +
    (raw.reduce_min?.length || 0) +
    (raw.rm_min?.length || 0);
  if (numNonLegacy > 1) {
    throw new Error(
      `${placeId} has ${numNonLegacy} new-style policies, but is missing a legacy reform. ` +
        "It must either have exactly one new-style policy or set a legacy reform",
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

  return {
    place: processPlace(placeId, raw.place),
    unifiedPolicy: {
      ...newStylePolicy,
      date: Date.fromNullable(newStylePolicy.date),
      policy: [policyType],
    },
  };
}

export default async function readData(): Promise<
  Record<PlaceId, ProcessedCoreEntry>
> {
  const rawData = (await import("../../data/core.json")) as unknown as Record<
    PlaceId,
    RawCoreEntry
  >;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => [
      placeId,
      processRawCoreEntry(placeId, entry),
    ]),
  );
}
