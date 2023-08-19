import { Control, DomUtil } from "leaflet";

const addLegend = (map, scopeToColor) => {
  const legend = new Control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = DomUtil.create("div", "legend");
    const scopes = [
      { key: "Regional", label: "Regional" },
      { key: "Citywide", label: "Citywide" },
      { key: "City Center", label: "City Center/District" },
      { key: "TOD", label: "Transit Oriented" },
      { key: "Main Street", label: "Main Street/Special" },
    ];
    const listItems = scopes
      .map(
        (scope) => `
            <li>
              <i style="background:${scopeToColor[scope.key]};"></i>${
          scope.label
        }
            </li>`
      )
      .join("");
    div.innerHTML += `<h2>Scope of reform</h2><ul>${listItems}</ul>`;
    return div;
  };
  legend.addTo(map);
};

export default addLegend;
