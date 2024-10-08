import { DateTime } from "luxon";

import { PlaceId, PlaceEntry, RawEntry } from "./types";

export const DATE_REPR = "LLL d, yyyy";

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

export default async function readData(): Promise<Record<PlaceId, PlaceEntry>> {
  const rawData = (await import("../../data/core.json")) as unknown as Record<
    PlaceId,
    RawEntry
  >;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => {
      const date = entry.date
        ? DateTime.fromFormat(entry.date, DATE_REPR)
        : null;
      const updated = {
        ...entry,
        country: countryMapping[entry.country] ?? entry.country,
        date: date && date.isValid ? date : null,
      };
      return [placeId, updated];
    }),
  );
}
