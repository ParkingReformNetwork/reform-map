import type { DateTime } from "luxon";

export type PlaceId = string;

export interface PlaceEntry {
  place: string;
  state: string | null;
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
