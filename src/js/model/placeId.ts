/* eslint-disable camelcase */
import { COUNTRY_MAPPING } from "./data";
import type { PlaceId, PlaceType } from "./types";

export function determinePlaceIdForDirectus(place: {
  name: string;
  state: string | null;
  country_code: string;
  type: PlaceType;
}): PlaceId {
  const { name, state, country_code, type } = place;
  const country = COUNTRY_MAPPING[country_code];
  if (!country) {
    throw new Error(
      `Missing country in COUNTRY_MAPPING in data.ts: ${country_code}`,
    );
  }
  if (type === "country" && name === country) return name;
  return state ? `${name}, ${state}, ${country}` : `${name}, ${country}`;
}

/** Get the additional info about the place beyond its `name`, if any.
 *
 * This is useful for splitting up the full PlaceId into the `name` vs.
 * supplemental info.
 */
export function determinesupplementalPlaceInfo(place: {
  name: string;
  state: string | null;
  country: string;
  type: PlaceType;
}): string | null {
  const { name, state, country, type } = place;
  if (type === "country" && name === country) return null;
  return state ? `${state}, ${country}` : country;
}

export function stripCountryFromPlaceId(placeId: PlaceId): string {
  const [place, state] = placeId.split(", ");
  return state ? `${place}, ${state}` : place;
}

/**
 * Normalize the place ID for being used in a URL.
 *
 * This strips the country so that our historical details pages keep working.
 */
export function encodePlaceId(placeId: PlaceId): string {
  return stripCountryFromPlaceId(placeId).replace(/ /g, "").replace(",", "_");
}

export function encodedPlaceToUrl(encodedPlace: string): string {
  return `https://parkingreform.org/mandates-map/city_detail/${encodedPlace}.html`;
}
