import type { Map as LeafletMap } from "leaflet";

import type { PlaceFilterManager } from "../state/FilterState";

export default function subscribeSnapToPlace(
  manager: PlaceFilterManager,
  map: LeafletMap,
): void {
  manager.subscribe("move map on search", ({ searchInput }) => {
    if (searchInput) {
      const [long, lat] = manager.entries[searchInput].place.coord;
      map.setView([lat, long], 6);
    }
  });
}
