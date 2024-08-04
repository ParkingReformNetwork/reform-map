import { Map } from "leaflet";

import { PlaceFilterManager } from "./FilterState";

export default function subscribeSnapToPlace(
  manager: PlaceFilterManager,
  map: Map,
): void {
  manager.subscribe(({ searchInput }) => {
    if (searchInput) {
      const entry = manager.entries[searchInput];
      map.setView(
        // @ts-ignore
        [entry.lat, entry.long],
        6,
      );
    }
  });
}
