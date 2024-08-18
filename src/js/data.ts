import { PlaceId, PlaceEntry } from "./types";

export default async function readData(): Promise<Record<PlaceId, PlaceEntry>> {
  // @ts-ignore
  const rawData = await import("../../map/data.csv");
  return rawData.reduce(
    (acc: Record<string, PlaceEntry>, rawEntry: Record<string, string>) => {
      const entry = {
        place: rawEntry.place,
        state: rawEntry.state,
        country: rawEntry.country,
        summary: rawEntry.summary,
        status: rawEntry.status,
        lat: rawEntry.lat,
        long: rawEntry.long,
        url: rawEntry.citation_url,
        population: rawEntry.population,
        scope: rawEntry.scope.split(", "),
        policyChange: rawEntry.policy_change.split(", "),
        landUse: rawEntry.land_use.split(", "),
        allMinimumsRepealed: rawEntry.all_minimums_repealed === "1",
        reformDate: rawEntry.reform_date,
      };
      const placeId = `${entry.place}, ${entry.state}`;
      acc[placeId] = entry;
      return acc;
    },
    {},
  );
}
