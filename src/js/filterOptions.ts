import { PlaceFilterManager } from "./FilterState";

function initFilterGroup(
  filterManager: PlaceFilterManager,
  filterClass: string,
  filterStateKey: string,
): void {
  const container = document.querySelector(`.${filterClass}`);

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
  // initFilterGroup(filterManager, "filter-scope", "scope");
  // initFilterGroup(filterManager, "filter-land-use", "landUse");
  // initFilterGroup(filterManager, "filter-policy-change", "policyChange");
  // initFilterGroup(filterManager, "filter-stage", "implementationStage");

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
