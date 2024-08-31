import { FilterState, PlaceFilterManager } from "./FilterState";

function determineHtml(state: FilterState, numPlaces: number): string {
  if (!numPlaces) {
    return "No places selected — use the filter and search icons";
  }
  if (state.searchInput) {
    return `Showing ${state.searchInput} from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>`;
  }
  const suffix = state.allMinimumsRemovedToggle
    ? "with all parking minimums removed"
    : "with parking reforms";
  const placesWord = numPlaces === 1 ? "place" : "places";
  return `Showing ${numPlaces} ${placesWord} ${suffix}`;
}

function setUpResetButton(
  counterContainer: HTMLElement,
  manager: PlaceFilterManager,
): void {
  counterContainer.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.matches(".counter-search-reset")
    ) {
      manager.update({ searchInput: null });
    }
  });
}

export default function initCounters(manager: PlaceFilterManager): void {
  const mapCounter = document.getElementById("map-counter");
  const tableCounter = document.getElementById("table-counter");
  if (!mapCounter || !tableCounter) return;

  setUpResetButton(mapCounter, manager);
  setUpResetButton(tableCounter, manager);

  manager.subscribe((state) => {
    const html = determineHtml(state, manager.placeIds.size);
    mapCounter.innerHTML = html;
    tableCounter.innerHTML = html;
  });
}
