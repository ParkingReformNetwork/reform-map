import { PlaceFilterManager } from "./FilterState";

export default function subscribeMapCounter(manager: PlaceFilterManager): void {
  manager.subscribe((state) => {
    let text: string;
    const numPlaces = manager.placeIds.size;
    if (numPlaces) {
      let suffix: string;
      if (state.searchInput.length) {
        suffix = "from search";
      } else if (state.noRequirementsToggle) {
        suffix = "without parking requirements";
      } else {
        suffix = "with parking reforms";
      }
      const placesWord = numPlaces === 1 ? "place" : "places";
      text = `Showing ${numPlaces} ${placesWord} ${suffix}`;
    } else {
      text = `No places selected — use the filter and search icons`;
    }

    document.getElementById("map-counter").innerText = text;
  });
}
