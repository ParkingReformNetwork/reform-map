import { Tabulator } from "tabulator-tables";
import Observable from "./Observable";

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
  tableIcon.addEventListener("click", () => observable.setValue("table"));

  const mapIcon = document.querySelector<HTMLButtonElement>(
    ".header-map-icon-container",
  );
  mapIcon.addEventListener("click", () => observable.setValue("map"));
}

export default function initViewToggle(table: Tabulator): ViewStateObservable {
  const viewToggle = new Observable<ViewState>("map");
  viewToggle.subscribe((state) => updateUI(table, state));
  updateOnIconClick(viewToggle);
  return viewToggle;
}
