import { queryStringToParams } from "../state/urlEncoder";

export default function maybeHideMapOverlays(queryString: string) {
  const params = queryStringToParams(queryString);
  if (!params.has("hide-map-overlays")) return;

  // We cannot use `.hidden` because viewToggle already uses hidden to control if the elements are shown,
  // and that gets re-set every time viewToggle is called.
  document.querySelector<HTMLElement>(".prn-logo-map")!.style.display = "none";
  document.querySelector<HTMLElement>("#map-counter")!.style.display = "none";

  document.querySelector<HTMLElement>(".leaflet-control-zoom")!.hidden = true;
  document.querySelector<HTMLElement>(".leaflet-control-attribution")!.hidden =
    true;
}
