import nodeFetch, {
  type RequestInfo,
  type RequestInit,
  type Response,
} from "node-fetch";
import NodeGeocoder from "node-geocoder";

// Nominatim's usage policy allows at most one request per second and
// returns HTTP 429 when exceeded. Pace every request and back off on 429.
// https://operations.osmfoundation.org/policies/nominatim/
const MIN_MS_BETWEEN_REQUESTS = 1100;
const RETRY_DELAYS_MS = [5_000, 20_000, 60_000];

let lastRequestFinishedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetch(
  url: RequestInfo,
  options: RequestInit = {},
): Promise<Response> {
  const doFetch = () =>
    nodeFetch(url, {
      ...options,
      headers: { "User-Agent": "prn-update-map-data" },
    });

  for (let attempt = 0; ; attempt++) {
    const waitMs = lastRequestFinishedAt + MIN_MS_BETWEEN_REQUESTS - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    const response = await doFetch();
    lastRequestFinishedAt = Date.now();
    if (response.status !== 429 || attempt >= RETRY_DELAYS_MS.length) {
      return response;
    }
    const delay = RETRY_DELAYS_MS[attempt];
    console.log(
      `Geocoder rate limited (HTTP 429). Retrying in ${delay / 1000}s (attempt ${attempt + 1} of ${RETRY_DELAYS_MS.length}).`,
    );
    await sleep(delay);
  }
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
  const locationMethods = [() => `${placeName}, ${stateQuery}${countryCode}`];
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
