import { PlaceId, ProcessedCoreEntry, RawCoreEntry, Date } from "./types";

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

export function processRawCoreEntry(
  placeId: PlaceId,
  raw: RawCoreEntry,
): ProcessedCoreEntry {
  return {
    place: {
      ...raw.place,
      country: countryMapping[raw.place.country] ?? raw.place.country,
      url: placeIdToUrl(placeId),
    },
    unifiedPolicy: { ...raw.legacy, date: Date.fromNullable(raw.legacy.date) },
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
