import { PlaceFilterManager } from "./FilterState";
import Observable from "./Observable";

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
    ["Multi-Family Residential", true],
    ["Low Density (SF) Residential", true],
    ["High Density Residential", true],
    ["Industrial", true],
    ["Medical", true],
    ["Other", true],
  ],
  status: [
    ["Implemented", true],
    ["Passed", true],
    ["Planned", false],
    ["Proposed", false],
    ["Repealed", false],
    ["Unverified", false],
  ],
} as const;

type FilterGroupKey = keyof typeof FILTER_CONFIG;

export function getAllFilterOptions(groupKey: FilterGroupKey): string[] {
  return FILTER_CONFIG[groupKey].map((option) => option[0]);
}

export function getDefaultFilterOptions(groupKey: FilterGroupKey): string[] {
  return FILTER_CONFIG[groupKey]
    .filter(([, isDefaultSelected]) => isDefaultSelected)
    .map(([name]) => name);
}

type CheckboxStats = {
  total: number;
  checked: number;
};

function getCheckboxStats(fieldset: HTMLFieldSetElement): CheckboxStats {
  const checkboxes = fieldset.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  const total = checkboxes.length;
  const checked = Array.from(checkboxes).filter(
    (checkbox) => checkbox.checked,
  ).length;
  return { total, checked };
}

type AccordionElements = {
  outerContainer: HTMLDivElement;
  accordionTitle: HTMLSpanElement;
  accordionButton: HTMLButtonElement;
  contentContainer: HTMLDivElement;
  fieldSet: HTMLFieldSetElement;
};

type AccordionState = {
  expanded: boolean;
  checkboxStats: CheckboxStats;
};

function updateAccordionUI(
  elements: AccordionElements,
  title: string,
  state: AccordionState,
): void {
  elements.accordionTitle.textContent = `${title} (${state.checkboxStats.checked}/${state.checkboxStats.total})`;

  const upIcon =
    elements.accordionButton.querySelector<SVGElement>(".fa-chevron-up");
  const downIcon =
    elements.accordionButton.querySelector<SVGElement>(".fa-chevron-down");
  if (!upIcon || !downIcon) return;

  elements.accordionButton.setAttribute(
    "aria-expanded",
    state.expanded.toString(),
  );
  elements.contentContainer.hidden = !state.expanded;
  upIcon.style.display = state.expanded ? "block" : "none";
  downIcon.style.display = state.expanded ? "none" : "block";
}

function generateAccordion(
  name: string,
  title: string,
  filterStateKey: FilterGroupKey,
): [AccordionElements, Observable<AccordionState>] {
  const outerContainer = document.createElement("div");
  outerContainer.className = "filter-accordion";

  const buttonId = `filter-accordion-toggle-${name}`;
  const contentId = `filter-accordion-content-${name}`;
  const titleId = `filter-accordion-title-${name}`;

  const accordionButton = document.createElement("button");
  // Turn off clicking "submitting" the form, which reloads the page.
  accordionButton.type = "button";
  accordionButton.id = buttonId;
  accordionButton.className = "filter-accordion-toggle";
  accordionButton.ariaExpanded = "false";
  accordionButton.setAttribute("aria-controls", contentId);

  const accordionTitle = document.createElement("span");
  accordionTitle.id = titleId;
  accordionTitle.className = "filter-accordion-title";
  accordionButton.appendChild(accordionTitle);

  const accordionIconContainer = document.createElement("div");
  accordionIconContainer.className = "filter-accordion-icon-container";
  accordionIconContainer.ariaHidden = "true";
  const downIcon = document.createElement("i");
  downIcon.className = "fa-solid fa-chevron-down";
  downIcon.title = "expand option checkboxes";
  const upIcon = document.createElement("i");
  upIcon.className = "fa-solid fa-chevron-up";
  upIcon.title = "collapse option checkboxes";
  accordionIconContainer.appendChild(downIcon);
  accordionIconContainer.appendChild(upIcon);
  accordionButton.appendChild(accordionIconContainer);

  outerContainer.appendChild(accordionButton);

  const contentContainer = document.createElement("div");
  contentContainer.id = contentId;
  contentContainer.className = "filter-accordion-content";
  contentContainer.setAttribute("aria-describedby", titleId);

  const fieldSet = document.createElement("fieldset");
  fieldSet.className = `filter-${name}`;
  FILTER_CONFIG[filterStateKey].forEach(([val, isDefaultSelected]) => {
    const label = document.createElement("label");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = isDefaultSelected;

    label.appendChild(input);
    label.appendChild(document.createTextNode(val));

    fieldSet.appendChild(label);
  });

  contentContainer.appendChild(fieldSet);
  outerContainer.appendChild(contentContainer);

  const elements = {
    outerContainer,
    accordionTitle,
    accordionButton,
    contentContainer,
    fieldSet,
  };

  const accordionState = new Observable<AccordionState>({
    expanded: false,
    checkboxStats: getCheckboxStats(fieldSet),
  });
  accordionState.subscribe((state) =>
    updateAccordionUI(elements, title, state),
  );
  accordionButton.addEventListener("click", () => {
    const priorState = accordionState.getValue();
    accordionState.setValue({
      expanded: !priorState.expanded,
      checkboxStats: priorState.checkboxStats,
    });
  });
  accordionState.initialize();

  return [elements, accordionState];
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  htmlName: string,
  filterStateKey: FilterGroupKey,
  legend: string,
): void {
  const [accordionElements, accordionState] = generateAccordion(
    htmlName,
    legend,
    filterStateKey,
  );

  const outerContainer = document.getElementById("filter-accordion-options");
  outerContainer.appendChild(accordionElements.outerContainer);

  accordionElements.fieldSet.addEventListener("change", () => {
    const accordionPriorState = accordionState.getValue();
    accordionState.setValue({
      expanded: accordionPriorState.expanded,
      checkboxStats: getCheckboxStats(accordionElements.fieldSet),
    });

    const checkedLabels = Array.from(
      accordionElements.fieldSet.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
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
  initFilterGroup(filterManager, "status", "status", "Status");

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
