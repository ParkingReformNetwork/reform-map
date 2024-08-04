import { Map } from "leaflet";

import { PlaceFilterManager } from "./FilterState";

function snapToPlace(map: Map, lat: string, long: string): void {
  map.setView(
    // @ts-ignore
    [lat, long],
    6,
  );
}

export default function subscribeSnapToPlace(
  manager: PlaceFilterManager,
  map: Map,
): void {
  manager.subscribe(({ searchInput }) => {
    if (searchInput) {
      const entry = manager.entries[searchInput];
      snapToPlace(map, entry.lat, entry.long);
    }
  });
}
