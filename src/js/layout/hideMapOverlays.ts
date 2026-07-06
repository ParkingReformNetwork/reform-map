import { queryStringToParams } from "../state/urlEncoder";

export default function maybeHideMapOverlays(queryString: string) {
  const params = queryStringToParams(queryString);
  if (!params.has("hide-map-overlays")) return;

  // We cannot use `.hidden` for prnLogo/mapCounter because viewToggle.ts
  // resets `.hidden` on these elements every time the view is switched.
  document.querySelector<HTMLElement>(".prn-logo-map")!.style.display = "none";
  document.querySelector<HTMLElement>("#map-counter")!.style.display = "none";

  document.querySelector<HTMLElement>(".leaflet-control-zoom")!.hidden = true;
  document.querySelector<HTMLElement>(".leaflet-control-attribution")!.hidden =
    true;
}
