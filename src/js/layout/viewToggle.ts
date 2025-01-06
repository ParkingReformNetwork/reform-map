import { Tabulator } from "tabulator-tables";
import Observable from "../state/Observable";

export type ViewState = "map" | "table";

export type ViewStateObservable = Observable<ViewState>;

function updateUI(table: Tabulator, state: ViewState): void {
  const tableIcon = document.querySelector<HTMLButtonElement>(
    ".header-table-icon-container",
  );
  const mapIcon = document.querySelector<HTMLButtonElement>(
    ".header-map-icon-container",
  );
  const tableView = document.querySelector<HTMLElement>("#table-view");
  const mapView = document.querySelector<HTMLElement>("#map");
  const mapCounter = document.querySelector<HTMLElement>("#map-counter");
  const prnLogo = document.querySelector<HTMLElement>(".prn-logo-map");
  if (
    !mapIcon ||
    !tableIcon ||
    !tableView ||
    !mapView ||
    !mapCounter ||
    !prnLogo
  )
    return;

  if (state === "map") {
    tableIcon.style.display = "inline-flex";
    mapIcon.style.display = "none";
    tableView.style.display = "none";
    mapView.hidden = false;
    mapCounter.hidden = false;
    prnLogo.hidden = false;
  } else {
    tableIcon.style.display = "none";
    mapIcon.style.display = "inline-flex";
    tableView.style.display = "flex";
    mapView.hidden = true;
    mapCounter.hidden = true;
    prnLogo.hidden = true;
    table.redraw();
  }
}

function updateOnIconClick(observable: ViewStateObservable): void {
  const tableIcon = document.querySelector<HTMLButtonElement>(
    ".header-table-icon-container",
  );
  const mapIcon = document.querySelector<HTMLButtonElement>(
    ".header-map-icon-container",
  );
  if (!mapIcon || !tableIcon) return;

  tableIcon.addEventListener("click", () => observable.setValue("table"));
  mapIcon.addEventListener("click", () => observable.setValue("map"));
}

export function initViewToggle(): ViewStateObservable {
  const viewToggle = new Observable<ViewState>("view toggle", "map");
  updateOnIconClick(viewToggle);
  return viewToggle;
}

export function addViewToggleSubscribers(
  observable: ViewStateObservable,
  table: Tabulator,
): void {
  observable.subscribe((state) => updateUI(table, state), "switch app view");
}
