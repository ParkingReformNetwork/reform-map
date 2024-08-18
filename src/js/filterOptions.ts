import { PlaceEntry } from "./types";
import { PlaceFilterManager } from "./FilterState";
import Observable from "./Observable";

export const OPTION_NOT_SET = "Not available";

type FilterGroupKey =
  | "policyChange"
  | "scope"
  | "landUse"
  | "status"
  | "country"
  | "year";

const DESELECTED_BY_DEFAULT: Record<FilterGroupKey, Set<string>> = {
  policyChange: new Set(),
  scope: new Set(),
  landUse: new Set(),
  status: new Set(["Planned", "Proposed", "Repealed", "Unverified"]),
  country: new Set(),
  year: new Set(),
};

export class FilterOptions {
  readonly options: Record<FilterGroupKey, string[]>;

  constructor(entries: PlaceEntry[]) {
    const policy = new Set<string>();
    const scope = new Set<string>();
    const landUse = new Set<string>();
    const status = new Set<string>();
    const country = new Set<string>();
    const year = new Set<string>();
    entries.forEach((entry) => {
      status.add(entry.status);
      country.add(entry.country);
      year.add(entry.reformDate?.year.toString() || OPTION_NOT_SET);
      entry.policyChange.forEach((v) => policy.add(v));
      entry.scope.forEach((v) => scope.add(v));
      entry.landUse.forEach((v) => landUse.add(v));
    });
    this.options = {
      policyChange: Array.from(policy).sort(),
      scope: Array.from(scope).sort(),
      landUse: Array.from(landUse).sort(),
      status: Array.from(status).sort(),
      country: Array.from(country).sort(),
      year: Array.from(year).sort((a, b) => b.localeCompare(a)),
    };
  }

  default(groupKey: FilterGroupKey): string[] {
    return this.options[groupKey].filter(
      (opt) => !DESELECTED_BY_DEFAULT[groupKey].has(opt),
    );
  }

  all(groupKey: FilterGroupKey): string[] {
    return this.options[groupKey];
  }
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
  filterOptions: FilterOptions,
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
  filterOptions.all(filterStateKey).forEach((val) => {
    const label = document.createElement("label");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = !DESELECTED_BY_DEFAULT[filterStateKey].has(val);

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
  filterOptions: FilterOptions,
  legend: string,
): void {
  const [accordionElements, accordionState] = generateAccordion(
    htmlName,
    legend,
    filterStateKey,
    filterOptions,
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

export function initFilterOptions(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
): void {
  initFilterGroup(
    filterManager,
    "policy-change",
    "policyChange",
    filterOptions,
    "Policy change",
  );
  initFilterGroup(
    filterManager,
    "scope",
    "scope",
    filterOptions,
    "Reform scope",
  );
  initFilterGroup(
    filterManager,
    "land-use",
    "landUse",
    filterOptions,
    "Affected land use",
  );
  initFilterGroup(filterManager, "status", "status", filterOptions, "Status");
  initFilterGroup(
    filterManager,
    "country",
    "country",
    filterOptions,
    "Country",
  );
  initFilterGroup(filterManager, "year", "year", filterOptions, "Year");

  const minimumsToggle = document.querySelector<HTMLInputElement>(
    "#no-requirements-toggle",
  );
  minimumsToggle.checked = filterManager.getState().allMinimumsRepealedToggle;
  minimumsToggle.addEventListener("change", () => {
    filterManager.update({
      allMinimumsRepealedToggle: minimumsToggle.checked,
    });
  });
}
