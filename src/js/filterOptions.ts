import { PlaceFilterManager } from "./FilterState";

// The boolean next to each option is for whether it's selected by default.
const FILTER_CONFIG = {
  policyChange: [
    ["Reduce Parking Minimums", true],
    ["Eliminate Parking Minimums", true],
    ["Parking Maximums", true],
  ],
  scope: [
    ["Regional", true],
    ["Citywide", true],
    ["City Center/Business District", true],
    ["Transit Oriented", true],
    ["Main Street/Special", true],
  ],
  landUse: [
    ["All Uses", true],
    ["Commercial", true],
    ["Residential", true],
  ],
  implementationStage: [
    ["Implemented", true],
    ["Passed", true],
    ["Planned", false],
    ["Proposed", false],
    ["Repealed", false],
  ],
} as const;

type FilterGroupKey = keyof typeof FILTER_CONFIG;

export const FilterOptions = {
  getAllOptions(fieldset: FilterGroupKey): string[] {
    return FILTER_CONFIG[fieldset].map((option) => option[0]);
  },

  getDefaultSelected(fieldset: FilterGroupKey): string[] {
    return FILTER_CONFIG[fieldset]
      .filter(([, isDefaultSelected]) => isDefaultSelected)
      .map(([name]) => name);
  },
};

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
  filterStateKey: FilterGroupKey,
  legend: string,
): void {
  const outerContainer = document.getElementById("filter-accordion-options");
  const options = FilterOptions.getAllOptions(filterStateKey);
  outerContainer.appendChild(
    generateAccordionOptions(htmlName, legend, options),
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

export function initFilterOptions(filterManager: PlaceFilterManager): void {
  initFilterGroup(
    filterManager,
    "policy-change",
    "policyChange",
    "Policy change",
  );
  initFilterGroup(filterManager, "scope", "scope", "Reform scope");
  initFilterGroup(filterManager, "land-use", "landUse", "Affected land use");
  initFilterGroup(
    filterManager,
    "stage",
    "implementationStage",
    "Implementation stage",
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
