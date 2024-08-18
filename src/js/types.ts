import type { DateTime } from "luxon";

export type PlaceId = string;

export interface PlaceEntry {
  place: string;
  state: string;
  country: string;
  summary: string;
  status: string;
  policyChange: string[];
  scope: string[];
  landUse: string[];
  reformDate: DateTime | null;
  allMinimumsRepealed: boolean;
  population: number;
  url: string;
  lat: string;
  long: string;
}
