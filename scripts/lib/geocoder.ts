/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import nodeFetch from "node-fetch";
import NodeGeocoder from "node-geocoder";

export async function fetch(
  url: nodeFetch.RequestInfo,
  options: nodeFetch.RequestInit = {},
): Promise<nodeFetch.Response> {
  return nodeFetch(url, {
    ...options,
    headers: { "User-Agent": "prn-update-map-data" },
  });
}

export function initGeocoder(): NodeGeocoder.Geocoder {
  return NodeGeocoder({ provider: "openstreetmap", fetch });
}

export async function getLongLat(
  placeName: string,
  state: string | null,
  countryCode: string,
  geocoder: NodeGeocoder.Geocoder,
): Promise<[number, number] | null> {
  const stateQuery = state ? `${state}, ` : "";
  // We try the most precise query first, then fall back to less precise queries.
  const locationMethods = [() => `${placeName}, ${stateQuery}, ${countryCode}`];
  if (stateQuery) {
    locationMethods.push(() => `${placeName}, ${stateQuery}`);
  }
  locationMethods.push(() => `${placeName}`);

  for (const getLocationString of locationMethods) {
    const locationString = getLocationString();
    const geocodeResults = await geocoder.geocode(locationString);
    if (geocodeResults.length > 0) {
      const lat = geocodeResults[0].latitude;
      const long = geocodeResults[0].longitude;
      if (!lat || !long) continue;
      return [long, lat];
    }
  }
  return null;
}
