import { PlaceId, PlaceEntry, RawEntry, Date } from "./types";

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

export default async function readData(): Promise<Record<PlaceId, PlaceEntry>> {
  const rawData = (await import("../../data/core.json")) as unknown as Record<
    PlaceId,
    RawEntry
  >;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => {
      const date = entry.legacy.date ? new Date(entry.legacy.date) : null;
      const updated = {
        place: {
          ...entry.place,
          country: countryMapping[entry.place.country] ?? entry.place.country,
          url: placeIdToUrl(placeId),
        },
        unifiedPolicy: { ...entry.legacy, date },
      };
      return [placeId, updated];
    }),
  );
}
