import type { PlaceId } from "./types";

export function determinePlaceId(place: {
  name: string;
  state: string | null;
}): PlaceId {
  const { name, state } = place;
  return state ? `${name}, ${state}` : name;
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
