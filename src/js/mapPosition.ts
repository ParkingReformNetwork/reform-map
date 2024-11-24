import { Map } from "leaflet";

import { PlaceFilterManager } from "./FilterState";

export default function subscribeSnapToPlace(
  manager: PlaceFilterManager,
  map: Map,
): void {
  manager.subscribe(({ searchInput }) => {
    if (searchInput) {
      const entry = manager.entries[searchInput];
      const [long, lat] = entry.place.coord;
      map.setView([lat, long], 6);
    }
  });
}
