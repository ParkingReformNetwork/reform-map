import { Tabulator, SortModule } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

export default function initTable(): Tabulator {
  // TODO: freeze columns? https://tabulator.info/docs/6.2/layout#frozen-column
  // TODO: allow resizing columns? https://tabulator.info/docs/6.2/modules#module-resizeColumns
  // TODO: moveable columns? https://tabulator.info/docs/6.2/modules#module-moveColumn
  // TODO: responsive layout https://tabulator.info/docs/6.2/modules#module-responsiveLayout
  Tabulator.registerModule([SortModule]);

  // TODO: load data from PlaceFilterManager.
  const table = new Tabulator("#table", {
    data: [
      {
        id: 1,
        name: "Billy Bob",
        age: "12",
      },
      {
        id: 2,
        name: "Mary May",
        age: "1",
      },
    ],
    layout: "fitColumns",
    columns: [
      { title: "Name", field: "name" },
      { title: "Age", field: "age" },
    ],
  });

  // TODO: subscribe to updates to the selected cities. Figure out
  // how to ensure the table is already initialized. Also consider using
  // https://tabulator.info/docs/6.2/reactivity
  //
  // Is the best approach to filter? https://tabulator.info/docs/6.2/filter
  return table;
}
