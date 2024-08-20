import { DateTime } from "luxon";
import { capitalize } from "lodash-es";

import { PlaceId, PlaceEntry } from "./types";

export const DATE_REPR = "LLL d, yyyy";

function splitStringArray(
  val: string,
  transform: Record<string, string> = {},
): string[] {
  // We should directly fix the CSV data once we do the data migration, rather than
  // patching here.
  return val.split(", ").map((v) => {
    const lowercase = capitalize(v.toLowerCase());
    return transform[lowercase] ?? lowercase;
  });
}

export default async function readData(): Promise<Record<PlaceId, PlaceEntry>> {
  // @ts-ignore
  const rawData = await import("../../map/data.csv");
  return rawData.reduce(
    (acc: Record<string, PlaceEntry>, rawEntry: Record<string, string>) => {
      const date = DateTime.fromFormat(rawEntry.reform_date, DATE_REPR);
      const entry = {
        place: rawEntry.place,
        state: rawEntry.state,
        country: rawEntry.country,
        summary: rawEntry.summary,
        status: rawEntry.status,
        lat: rawEntry.lat,
        long: rawEntry.long,
        url: rawEntry.citation_url,
        population: parseInt(rawEntry.population),
        policyChange: splitStringArray(rawEntry.policy_change, {
          "Parking maximums": "Add parking maximums",
          "Eliminate parking minimums": "Remove parking minimums",
        }),
        scope: splitStringArray(rawEntry.scope, {
          "City center/business district": "City center / business district",
          "Main street/special": "Main street / special",
        }),
        landUse: splitStringArray(rawEntry.land_use, {
          Residential: "Residential, all uses",
          "Low density (sf) residential": "Residential, low-density",
          "High density residential": "Residential, high-density",
          "Multi-family residential": "Residential, multi-family",
        }),
        allMinimumsRemoved: rawEntry.all_minimums_repealed === "1",
        reformDate: date.isValid ? date : null,
      };
      const placeId = `${entry.place}, ${entry.state}`;
      acc[placeId] = entry;
      return acc;
    },
    {},
  );
}
