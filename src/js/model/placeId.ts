import type { PlaceId, PlaceType } from "./types";

export function determinePlaceId(place: {
  name: string;
  state: string | null;
}): PlaceId {
  const { name, state } = place;
  return state ? `${name}, ${state}` : name;
}

/** Get the additional info about the place beyond its `name`, if any.
 *
 * This is useful for splitting up the full PlaceId into the `name` vs.
 * supplemental info.
 */
export function determinesupplementalPlaceInfo(place: {
  state: string | null;
  country: string;
  type: PlaceType;
}): string | null {
  const { state, country, type } = place;
  if (type === "country") return null;
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
export function escapePlaceId(placeId: PlaceId): string {
  return stripCountryFromPlaceId(placeId).replace(/ /g, "").replace(",", "_");
}

export function placeIdToUrl(placeId: PlaceId): string {
  return `https://parkingreform.org/mandates-map/city_detail/${escapePlaceId(placeId)}.html`;
}
