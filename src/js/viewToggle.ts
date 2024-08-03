import { Tabulator } from "tabulator-tables";
import Observable from "./Observable";

type ViewState = "map" | "table";

type ViewStateObservable = Observable<ViewState>;

function updateUI(table: Tabulator, state: ViewState): void {
  const tableIcon = document.querySelector<HTMLButtonElement>(
    ".header-table-icon-container",
  );
  const mapIcon = document.querySelector<HTMLButtonElement>(
    ".header-map-icon-container",
  );
  const tableView = document.querySelector<HTMLElement>("#table-view");
  const mapView = document.querySelector<HTMLElement>("#map");
  const mapCounter = document.querySelector<HTMLElement>("#counter");
  if (state === "map") {
    tableIcon.style.display = "inline-flex";
    mapIcon.style.display = "none";
    tableView.hidden = true;
    mapView.hidden = false;
    mapCounter.hidden = false;
  } else {
    tableIcon.style.display = "none";
    mapIcon.style.display = "inline-flex";
    tableView.hidden = false;
    mapView.hidden = true;
    mapCounter.hidden = true;
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

export default function initViewToggle(table: Tabulator): void {
  const viewToggle = new Observable<ViewState>("map");
  viewToggle.subscribe((state) => updateUI(table, state));
  updateOnIconClick(viewToggle);
  viewToggle.initialize();
}
