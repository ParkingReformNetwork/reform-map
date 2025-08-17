import fs from "fs/promises";

import { readRawCoreData } from "./lib/data";

const US_MAP: Partial<Record<string, string>> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MP: "Northern Mariana Islands",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  PR: "Puerto Rico",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const CA_MAP: Partial<Record<string, string>> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NT: "Northwest Territories",
  NS: "Nova Scotia",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

async function main(): Promise<void> {
  const rawData = await readRawCoreData();
  const newData = Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => {
      const newState = determineState(entry.place.state, entry.place.country);
      if (!newState) return [placeId, entry];
      const newPlaceId = placeId.replace(
        `, ${entry.place.state!}, `,
        `, ${newState}, `,
      );
      return [newPlaceId, entry];
    }),
  );

  const json = JSON.stringify(newData, null, 2);
  console.log("Writing data/core.json");
  await fs.writeFile("data/core.json", json);
  process.exit(0);
}

function determineState(state: string | null, country: string): string | null {
  if (!state) return null;
  if (country === "United States") {
    return US_MAP[state] ?? null;
  }
  if (country === "Canada") {
    return CA_MAP[state] ?? null;
  }
  return null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
