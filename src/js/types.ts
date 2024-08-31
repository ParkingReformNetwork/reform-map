import type { DateTime } from "luxon";

export type PlaceId = string;

export interface PlaceEntry {
  // Full name of the town, city, county, province, state, or country.
  // Must always be set.
  place: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  // Country abbreviation. Must always be set.
  country: string;
  summary: string;
  status: string;
  policyChange: string[];
  scope: string[];
  landUse: string[];
  reformDate: DateTime | null;
  allMinimumsRemoved: boolean;
  population: number;
  url: string;
  lat: string;
  long: string;
}
