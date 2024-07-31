import { PlaceFilterManager } from "./FilterState";

export default function subscribeCounter(manager: PlaceFilterManager): void {
  manager.subscribe((state) => {
    let suffix: string;
    if (state.searchInput.length) {
      suffix = "from search";
    } else if (state.noRequirementsToggle) {
      suffix = "without parking requirements";
    } else {
      suffix = "with parking reforms";
    }
    const numPlaces = manager.placeIds.size;
    const placesWord = numPlaces === 1 ? "place" : "places";
    const text = `Showing ${numPlaces} ${placesWord} ${suffix}`;
    document.getElementById("counter").innerText = text;
  });
}
