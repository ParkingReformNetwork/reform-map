import { PlaceFilterManager } from "./FilterState";

export default function subscribeCounter(manager: PlaceFilterManager): void {
  manager.subscribe(() => {
    document.getElementById("counter-denominator").innerText =
      manager.totalNumPlaces.toString();
    document.getElementById("counter-numerator").innerText =
      manager.placeIds.size.toString();
  });
}
