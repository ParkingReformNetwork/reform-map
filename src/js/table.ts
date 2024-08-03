import { Tabulator, FilterModule, SortModule } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

import { PlaceFilterManager } from "./FilterState";

export default function initTable(
  filterManager: PlaceFilterManager,
): Tabulator {
  // TODO: counter
  // TODO: styling, including y scrolling
  // TODO: figure out how to display details
  // TODO: placeholder value

  // TODO: freeze columns? https://tabulator.info/docs/6.2/layout#frozen-column
  // TODO: allow resizing columns? https://tabulator.info/docs/6.2/modules#module-resizeColumns
  // TODO: moveable columns? https://tabulator.info/docs/6.2/modules#module-moveColumn
  // TODO: responsive layout https://tabulator.info/docs/6.2/modules#module-responsiveLayout
  // TODO: downloads?
  Tabulator.registerModule([FilterModule, SortModule]);

  const data = Object.entries(filterManager.entries).map(
    ([placeId, entry]) => ({
      id: placeId,
      city: entry.city,
      state: entry.state,
      country: entry.country,
    }),
  );
  const columns = [
    { title: "City", field: "city" },
    { title: "State", field: "state" },
    { title: "Country", field: "country" },
  ];

  const table = new Tabulator("#table", {
    data,
    columns,
    layout: "fitColumns",
  });

  let tableBuilt = false;
  table.on("tableBuilt", () => {
    tableBuilt = true;
    table.setFilter((row) => filterManager.placeIds.has(row.id));
  });
  filterManager.subscribe(() => {
    if (!tableBuilt) return;
    table.refreshFilter();
  });

  return table;
}
