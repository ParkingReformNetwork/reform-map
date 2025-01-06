import { Map } from "leaflet";

import { PlaceFilterManager } from "../state/FilterState";

export default function subscribeSnapToPlace(
  manager: PlaceFilterManager,
  map: Map,
): void {
  manager.subscribe("move map on search", ({ searchInput }) => {
    if (searchInput) {
      const [long, lat] = manager.entries[searchInput].place.coord;
      map.setView([lat, long], 6);
    }
  });
}
