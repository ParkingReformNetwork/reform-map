import { PlaceFilterManager } from "./FilterState";

function generateAccordionOptions(
  name: string,
  legend: string,
  options: string[],
): HTMLFieldSetElement {
  const fieldset = document.createElement("fieldset");
  fieldset.className = `filter filter-${name}`;

  const legendElement = document.createElement("legend");
  legendElement.textContent = legend;
  fieldset.appendChild(legendElement);

  options.forEach((val) => {
    const label = document.createElement("label");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;

    label.appendChild(input);
    label.appendChild(document.createTextNode(val));

    fieldset.appendChild(label);
  });

  return fieldset;
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  htmlName: string,
  filterStateKey: string,
  legend: string,
  filterOptions: string[],
): void {
  const outerContainer = document.getElementById("filter-accordion-options");
  outerContainer.appendChild(
    generateAccordionOptions(htmlName, legend, filterOptions),
  );

  const container = document.querySelector(`.filter-${htmlName}`);

  // Set initial state.
  const initialState = filterManager.getState()[filterStateKey] as string[];
  Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ).forEach((input) => {
    const label = input.parentElement.textContent.trim();
    input.checked = initialState.includes(label);
  });

  container.addEventListener("change", () => {
    const checkedLabels = Array.from(
      container.querySelectorAll('input[type="checkbox"]:checked'),
    ).map((input) => input.parentElement.textContent.trim());
    filterManager.update({ [filterStateKey]: checkedLabels });
  });
}

export default function initFilterOptions(
  filterManager: PlaceFilterManager,
): void {
  initFilterGroup(
    filterManager,
    "policy-change",
    "policyChange",
    "Policy change",
    [
      "Reduce Parking Minimums",
      "Eliminate Parking Minimums",
      "Parking Maximums",
    ],
  );
  initFilterGroup(filterManager, "scope", "scope", "Reform scope", [
    "Regional",
    "Citywide",
    "City Center/Business District",
    "Transit Oriented",
    "Main Street/Special",
  ]);
  initFilterGroup(filterManager, "land-use", "landUse", "Affected land use", [
    "All Uses",
    "Commercial",
    "Residential",
  ]);
  initFilterGroup(
    filterManager,
    "stage",
    "implementationStage",
    "Implementation stage",
    ["Implemented", "Passed", "Planned", "Proposed", "Repealed"],
  );

  const noRequirementsToggle = document.querySelector<HTMLInputElement>(
    "#no-requirements-toggle",
  );
  noRequirementsToggle.checked = filterManager.getState().noRequirementsToggle;
  noRequirementsToggle.addEventListener("change", () => {
    filterManager.update({
      noRequirementsToggle: noRequirementsToggle.checked,
    });
  });
}
