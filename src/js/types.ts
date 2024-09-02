import type { DateTime } from "luxon";

export type PlaceId = string;

interface BaseEntry {
  // Full name of the town, city, county, province, state, or country.
  place: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  summary: string;
  status: string;
  policy: string[];
  scope: string[];
  land: string[];
  repeal: boolean;
  pop: number;
  coord: [string, string];
}

export type RawEntry = BaseEntry & {
  // The page name for the URL.
  page: string;
  // Country abbreviation.
  country: string;
  date: string | null;
};

export type PlaceEntry = BaseEntry & {
  url: string;
  // Full country name.
  country: string;
  date: DateTime<true> | null;
};
