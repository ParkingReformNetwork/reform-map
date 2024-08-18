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

export function getDefaultFilterOptions(groupKey: FilterGroupKey): string[] {
  return FILTER_CONFIG[groupKey]
    .filter(([, isDefaultSelected]) => isDefaultSelected)
    .map(([name]) => name);
}

function generateAccordionOptions(
  name: string,
  legend: string,
  filterStateKey: FilterGroupKey,
): HTMLFieldSetElement {
  const fieldset = document.createElement("fieldset");
  fieldset.className = `filter filter-${name}`;

  const legendElement = document.createElement("legend");
  legendElement.textContent = legend;
  fieldset.appendChild(legendElement);

  FILTER_CONFIG[filterStateKey].forEach(([val, isDefaultSelected]) => {
    const label = document.createElement("label");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = isDefaultSelected;

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
  const groupContainer = generateAccordionOptions(
    htmlName,
    legend,
    filterStateKey,
  );

  const outerContainer = document.getElementById("filter-accordion-options");
  outerContainer.appendChild(groupContainer);

  groupContainer.addEventListener("change", () => {
    const checkedLabels = Array.from(
      groupContainer.querySelectorAll('input[type="checkbox"]:checked'),
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
