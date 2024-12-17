import { capitalize } from "lodash-es";

import { ProcessedCoreEntry } from "./types";
import { PlaceFilterManager, PolicyTypeFilter } from "./FilterState";
import Observable from "./Observable";

export const UNKNOWN_YEAR = "Unknown";

// Keep in alignment with FilterState.
type FilterGroupKey =
  | "includedPolicyChanges"
  | "scope"
  | "landUse"
  | "status"
  | "country"
  | "year";

const DESELECTED_BY_DEFAULT: Record<FilterGroupKey, Set<string>> = {
  includedPolicyChanges: new Set(),
  scope: new Set(),
  landUse: new Set(),
  status: new Set(["planned", "proposed", "repealed", "unverified"]),
  country: new Set(),
  year: new Set(),
};

export class FilterOptions {
  readonly options: Record<FilterGroupKey, string[]>;

  constructor(entries: ProcessedCoreEntry[]) {
    const policy = new Set<string>();
    const scope = new Set<string>();
    const landUse = new Set<string>();
    const status = new Set<string>();
    const country = new Set<string>();
    const year = new Set<string>();
    entries.forEach((entry) => {
      status.add(entry.unifiedPolicy.status);
      country.add(entry.place.country);
      year.add(
        entry.unifiedPolicy.date?.parsed.year.toString() || UNKNOWN_YEAR,
      );
      entry.unifiedPolicy.policy.forEach((v) => policy.add(v));
      entry.unifiedPolicy.scope.forEach((v) => scope.add(v));
      entry.unifiedPolicy.land.forEach((v) => landUse.add(v));
    });
    this.options = {
      includedPolicyChanges: Array.from(policy).sort(),
      scope: Array.from(scope).sort(),
      landUse: Array.from(landUse).sort(),
      status: Array.from(status).sort(),
      country: Array.from(country).sort(),
      year: Array.from(year).sort((a, b) => b.localeCompare(a)),
    };
  }

  default(groupKey: FilterGroupKey): Set<string> {
    return new Set(
      this.options[groupKey].filter(
        (opt) => !DESELECTED_BY_DEFAULT[groupKey].has(opt),
      ),
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
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
};

type AccordionState = {
  hidden: boolean;
  expanded: boolean;
  checkboxStats: CheckboxStats;
};

function updateAccordionUI(
  elements: AccordionElements,
  title: string,
  state: AccordionState,
): void {
  elements.outerContainer.hidden = state.hidden;

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

type FilterGroupParams = {
  htmlName: string;
  filterStateKey: FilterGroupKey;
  legend: string;
  /// If not set to true, the option will use Lodash's `capitalize()`. This
  /// only impacts the UI and not the underlying data.
  preserveCapitalization?: boolean;
  useTwoColumns?: boolean;
  hideForPolicyTypeFilter?: PolicyTypeFilter[];
};

function generateAccordion(
  params: FilterGroupParams,
  filterOptions: FilterOptions,
): [AccordionElements, Observable<AccordionState>] {
  const outerContainer = document.createElement("div");
  outerContainer.className = "filter-accordion";

  const buttonId = `filter-accordion-toggle-${params.htmlName}`;
  const contentId = `filter-accordion-content-${params.htmlName}`;
  const titleId = `filter-accordion-title-${params.htmlName}`;

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
  fieldSet.className = `filter-${params.htmlName}`;

  const groupSelectorButtons = document.createElement("div");
  groupSelectorButtons.className = "filter-group-selectors-container";
  fieldSet.appendChild(groupSelectorButtons);

  const checkAllButton = document.createElement("button");
  checkAllButton.type = "button";
  checkAllButton.textContent = "Check all";
  checkAllButton.id = `filter-${params.htmlName}-check-all`;
  groupSelectorButtons.appendChild(checkAllButton);

  const uncheckAllButton = document.createElement("button");
  uncheckAllButton.type = "button";
  uncheckAllButton.textContent = "Uncheck all";
  uncheckAllButton.id = `filter-${params.htmlName}-uncheck-all`;
  groupSelectorButtons.appendChild(uncheckAllButton);

  const filterOptionsContainer = document.createElement("div");
  filterOptionsContainer.className = "filter-checkbox-options-container";
  if (params.useTwoColumns) {
    filterOptionsContainer.className = "filter-checkbox-options-two-columns";
  }
  fieldSet.appendChild(filterOptionsContainer);

  filterOptions.all(params.filterStateKey).forEach((val, i) => {
    const inputId = `filter-${params.htmlName}-option-${i}`;

    const label = document.createElement("label");
    label.className = "filter-checkbox";
    label.htmlFor = inputId;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = params.htmlName;
    input.id = inputId;
    input.checked = !DESELECTED_BY_DEFAULT[params.filterStateKey].has(val);

    const squareIcon = document.createElement("i");
    squareIcon.className = "fa-regular fa-square";
    squareIcon.ariaHidden = "true";
    const checkedIcon = document.createElement("i");
    checkedIcon.className = "fa-solid fa-square-check";
    checkedIcon.ariaHidden = "true";

    const description = document.createElement("span");
    description.textContent = params.preserveCapitalization
      ? val
      : capitalize(val);

    label.appendChild(input);
    label.appendChild(squareIcon);
    label.appendChild(checkedIcon);
    label.appendChild(description);

    filterOptionsContainer.appendChild(label);
  });

  contentContainer.appendChild(fieldSet);
  outerContainer.appendChild(contentContainer);

  const elements = {
    outerContainer,
    accordionTitle,
    accordionButton,
    contentContainer,
    fieldSet,
    checkAllButton,
    uncheckAllButton,
  };

  const accordionState = new Observable<AccordionState>(
    `filter accordion ${params.htmlName}`,
    {
      hidden: false,
      expanded: false,
      checkboxStats: getCheckboxStats(fieldSet),
    },
  );
  accordionState.subscribe((state) =>
    updateAccordionUI(elements, params.legend, state),
  );
  accordionButton.addEventListener("click", () => {
    const priorState = accordionState.getValue();
    accordionState.setValue({
      hidden: priorState.hidden,
      expanded: !priorState.expanded,
      checkboxStats: priorState.checkboxStats,
    });
  });
  accordionState.initialize();

  return [elements, accordionState];
}

function updateCheckboxStats(
  observable: Observable<AccordionState>,
  fieldSet: HTMLFieldSetElement,
): void {
  const accordionPriorState = observable.getValue();
  observable.setValue({
    hidden: accordionPriorState.hidden,
    expanded: accordionPriorState.expanded,
    checkboxStats: getCheckboxStats(fieldSet),
  });
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
  params: FilterGroupParams,
): void {
  const [accordionElements, accordionState] = generateAccordion(
    params,
    filterOptions,
  );

  const outerContainer = document.getElementById("filter-accordion-options");
  if (!outerContainer) return;
  outerContainer.appendChild(accordionElements.outerContainer);

  accordionElements.fieldSet.addEventListener("change", () => {
    updateCheckboxStats(accordionState, accordionElements.fieldSet);

    const checkedLabels = Array.from(
      accordionElements.fieldSet.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
    )
      .map((input) => {
        const text = input.parentElement?.textContent?.trim();
        return params.preserveCapitalization ? text : text?.toLowerCase();
      })
      .filter((x) => x !== undefined);
    filterManager.update({ [params.filterStateKey]: new Set(checkedLabels) });
  });

  const allCheckboxes = Array.from(
    accordionElements.fieldSet.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    ),
  );

  accordionElements.checkAllButton.addEventListener("click", () => {
    allCheckboxes.forEach((input) => (input.checked = true));
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    filterManager.update({
      [params.filterStateKey]: new Set(
        filterOptions.all(params.filterStateKey),
      ),
    });
  });

  accordionElements.uncheckAllButton.addEventListener("click", () => {
    allCheckboxes.forEach((input) => (input.checked = false));
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    filterManager.update({
      [params.filterStateKey]: new Set(),
    });
  });

  filterManager.subscribe(
    `possibly hide ${params.htmlName} in filter`,
    (state) => {
      const priorAccordionState = accordionState.getValue();
      const hidden =
        params.hideForPolicyTypeFilter?.includes(state.policyTypeFilter) ??
        false;
      accordionState.setValue({ ...priorAccordionState, hidden });
    },
  );
}

function initAllMinimumsToggle(filterManager: PlaceFilterManager): void {
  const inputId = `filter-all-minimums-toggle`;

  const label = document.createElement("label");
  label.className = "filter-checkbox";
  label.htmlFor = inputId;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = inputId;
  input.id = inputId;
  input.checked = filterManager.getState().allMinimumsRemovedToggle;

  const squareIcon = document.createElement("i");
  squareIcon.className = "fa-regular fa-square";
  squareIcon.ariaHidden = "true";
  const checkedIcon = document.createElement("i");
  checkedIcon.className = "fa-solid fa-square-check";
  checkedIcon.ariaHidden = "true";

  const description = document.createElement("span");
  description.textContent = "Only places with all minimums removed";

  label.appendChild(input);
  label.appendChild(squareIcon);
  label.appendChild(checkedIcon);
  label.appendChild(description);

  const filterPopup = document.getElementById("filter-popup");
  if (!filterPopup) return;
  filterPopup.prepend(label);

  input.addEventListener("change", () => {
    filterManager.update({
      allMinimumsRemovedToggle: input.checked,
    });
  });
}

export function initFilterOptions(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
): void {
  initAllMinimumsToggle(filterManager);

  initFilterGroup(filterManager, filterOptions, {
    htmlName: "policy-change",
    filterStateKey: "includedPolicyChanges",
    legend: "Policy change",
    hideForPolicyTypeFilter: [
      "add parking maximums",
      "reduce parking minimums",
      "remove parking minimums",
    ],
  });
  initFilterGroup(filterManager, filterOptions, {
    htmlName: "scope",
    filterStateKey: "scope",
    legend: "Reform scope",
    hideForPolicyTypeFilter: ["any parking reform"],
  });
  initFilterGroup(filterManager, filterOptions, {
    htmlName: "land-use",
    filterStateKey: "landUse",
    legend: "Affected land use",
    hideForPolicyTypeFilter: ["any parking reform"],
  });
  initFilterGroup(filterManager, filterOptions, {
    htmlName: "status",
    filterStateKey: "status",
    legend: "Status",
    hideForPolicyTypeFilter: ["any parking reform"],
  });
  initFilterGroup(filterManager, filterOptions, {
    htmlName: "country",
    filterStateKey: "country",
    legend: "Country",
    preserveCapitalization: true,
  });
  initFilterGroup(filterManager, filterOptions, {
    htmlName: "year",
    filterStateKey: "year",
    legend: "Year",
    useTwoColumns: true,
    hideForPolicyTypeFilter: ["any parking reform"],
  });

  const minimumsToggle = document.querySelector<HTMLInputElement>(
    "#all-minimums-toggle-checkbox",
  );
  if (!minimumsToggle) return;
  minimumsToggle.checked = filterManager.getState().allMinimumsRemovedToggle;
  minimumsToggle.addEventListener("change", () => {
    filterManager.update({
      allMinimumsRemovedToggle: minimumsToggle.checked,
    });
  });
}
