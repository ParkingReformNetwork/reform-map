import { updateItem } from "@directus/sdk";

import {
  DirectusClient,
  initDirectus,
  Place,
  readItemsBatched,
} from "./lib/directus";

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
  const client = await initDirectus();

  const places = await readPlaces(client);
  for (const place of places) {
    const updatedState = determineState(place.state!, place.country_code!);
    if (updatedState) {
      console.log(`Updated '${place.state}' to '${updatedState}'`);
      await client.request(
        updateItem("places", place.id!, { state: updatedState }),
      );
    } else {
      console.log(`⚠️ Unrecognized state '${place.state}'`);
    }
  }

  process.exit(0);
}

function determineState(state: string, country: string): string | null {
  if (country === "US") {
    return US_MAP[state] ?? null;
  }
  if (country === "CA") {
    return CA_MAP[state] ?? null;
  }
  throw new Error(`Unrecognized country: ${country}`);
}

async function readPlaces(
  client: DirectusClient,
): Promise<Array<Partial<Place>>> {
  return readItemsBatched(
    client,
    "places",
    ["id", "state", "country_code"],
    300,
    {
      _and: [
        { country_code: { _in: ["US", "CA"] } },
        { state: { _nnull: true } },
      ],
    },
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
