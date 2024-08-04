import { FilterState, PlaceFilterManager } from "./FilterState";

function determineText(state: FilterState, numPlaces: number): string {
  if (!numPlaces) {
    return "No places selected — use the filter and search icons";
  }
  if (state.searchInput) {
    return `Showing ${state.searchInput} from search`;
  }
  const suffix = state.noRequirementsToggle
    ? "without parking requirements"
    : "with parking reforms";
  const placesWord = numPlaces === 1 ? "place" : "places";
  return `Showing ${numPlaces} ${placesWord} ${suffix}`;
}

export default function subscribeCounters(manager: PlaceFilterManager): void {
  manager.subscribe((state) => {
    const text = determineText(state, manager.placeIds.size);
    document.getElementById("map-counter").innerText = text;
    document.getElementById("table-counter").innerText = text;
  });
}
