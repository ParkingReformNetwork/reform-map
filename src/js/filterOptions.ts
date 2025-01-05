import { capitalize } from "lodash-es";

import {
  FilterState,
  PlaceFilterManager,
  PolicyTypeFilter,
} from "./FilterState";
import Observable from "./Observable";
import { initPopulationSlider } from "./populationSlider";

import optionValuesData from "../../data/option-values.json" with { type: "json" };

// Keep in alignment with FilterState.
type FilterGroupKey =
  | "placeType"
  | "includedPolicyChanges"
  | "scope"
  | "landUse"
  | "status"
  | "country"
  | "year";

const DESELECTED_BY_DEFAULT: Record<FilterGroupKey, Set<string>> = {
  placeType: new Set(),
  includedPolicyChanges: new Set(),
  scope: new Set(),
  landUse: new Set(),
  status: new Set(["planned", "proposed", "repealed", "unverified"]),
  country: new Set(),
  year: new Set(),
};

export class FilterOptions {
  readonly options: Record<FilterGroupKey, string[]>;

  constructor() {
    this.options = {
      placeType: optionValuesData.placeType,
      includedPolicyChanges: optionValuesData.policy,
      scope: optionValuesData.scope,
      landUse: optionValuesData.landUse,
      status: optionValuesData.status,
      country: optionValuesData.country,
      year: optionValuesData.year,
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

function getCheckboxStatsDescription(fieldset: HTMLFieldSetElement): string {
  const checkboxes = fieldset.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  const total = checkboxes.length;
  const checked = Array.from(checkboxes).filter(
    (checkbox) => checkbox.checked,
  ).length;
  return ` (${checked}/${total})`;
}

export interface BaseAccordionElements {
  outerContainer: HTMLDivElement;
  accordionTitle: HTMLSpanElement;
  accordionButton: HTMLButtonElement;
  contentContainer: HTMLDivElement;
}

type FilterGroupAccordionElements = BaseAccordionElements & {
  fieldSet: HTMLFieldSetElement;
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
};

export interface AccordionState {
  hidden: boolean;
  expanded: boolean;
  supplementalTitle?: string;
}

export function updateAccordionUI(
  elements: BaseAccordionElements,
  title: string,
  state: AccordionState,
): void {
  elements.outerContainer.hidden = state.hidden;

  elements.accordionTitle.textContent = `${title}${state.supplementalTitle ?? ""}`;

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
  hide?: (state: FilterState) => boolean;
};

function generateCheckbox(
  inputId: string,
  inputName: string,
  checked: boolean,
  description: string,
): [HTMLLabelElement, HTMLInputElement] {
  const label = document.createElement("label");
  label.className = "filter-checkbox";
  label.htmlFor = inputId;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = inputName;
  input.id = inputId;
  input.checked = checked;

  const squareIcon = document.createElement("i");
  squareIcon.className = "fa-regular fa-square";
  squareIcon.ariaHidden = "true";
  const checkedIcon = document.createElement("i");
  checkedIcon.className = "fa-solid fa-square-check";
  checkedIcon.ariaHidden = "true";

  const span = document.createElement("span");
  span.textContent = description;

  label.appendChild(input);
  label.appendChild(squareIcon);
  label.appendChild(checkedIcon);
  label.appendChild(span);
  return [label, input];
}

/** Generate the base of an accordion.
 *
 * The contentContainer is empty and needs to be filled in by callers. An Observable
 * for AccordionState also needs to be configured.
 */
export function generateAccordion(htmlName: string): BaseAccordionElements {
  const outerContainer = document.createElement("div");
  outerContainer.className = "filter-accordion";

  const buttonId = `filter-accordion-toggle-${htmlName}`;
  const contentId = `filter-accordion-content-${htmlName}`;
  const titleId = `filter-accordion-title-${htmlName}`;

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
  outerContainer.appendChild(contentContainer);

  return {
    outerContainer,
    accordionTitle,
    accordionButton,
    contentContainer,
  };
}

function generateAccordionForFilterGroup(
  params: FilterGroupParams,
  filterOptions: FilterOptions,
): [FilterGroupAccordionElements, Observable<AccordionState>] {
  const baseElements = generateAccordion(params.htmlName);

  const fieldSet = document.createElement("fieldset");
  fieldSet.className = `filter-${params.htmlName}`;
  baseElements.contentContainer.appendChild(fieldSet);

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
    const checked = !DESELECTED_BY_DEFAULT[params.filterStateKey].has(val);
    const description = params.preserveCapitalization ? val : capitalize(val);
    const [label] = generateCheckbox(
      inputId,
      params.htmlName,
      checked,
      description,
    );
    filterOptionsContainer.appendChild(label);
  });

  const elements = {
    ...baseElements,
    fieldSet,
    checkAllButton,
    uncheckAllButton,
  };

  const checkboxStats = getCheckboxStatsDescription(fieldSet);
  const accordionState = new Observable<AccordionState>(
    `filter accordion ${params.htmlName}`,
    {
      hidden: false,
      expanded: false,
      supplementalTitle: checkboxStats,
    },
  );
  accordionState.subscribe((state) =>
    updateAccordionUI(elements, params.legend, state),
  );
  baseElements.accordionButton.addEventListener("click", () => {
    const priorState = accordionState.getValue();
    accordionState.setValue({
      ...priorState,
      expanded: !priorState.expanded,
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
    ...accordionPriorState,
    supplementalTitle: getCheckboxStatsDescription(fieldSet),
  });
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
  filterPopup: HTMLFormElement,
  params: FilterGroupParams,
): void {
  const [accordionElements, accordionState] = generateAccordionForFilterGroup(
    params,
    filterOptions,
  );
  filterPopup.appendChild(accordionElements.outerContainer);

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
      const hidden = params.hide ? params.hide(state) : false;
      accordionState.setValue({ ...priorAccordionState, hidden });
    },
  );
}

function initAllMinimumsToggle(
  filterManager: PlaceFilterManager,
  filterPopup: HTMLFormElement,
): void {
  const outerContainer = document.createElement("div");

  const [label, input] = generateCheckbox(
    "filter-all-minimums-toggle",
    "filter-all-minimums-toggle",
    filterManager.getState().allMinimumsRemovedToggle,
    "Only places with all parking minimums removed",
  );
  label.id = "filter-all-minimums-toggle-label";
  outerContainer.append(label);
  filterPopup.append(outerContainer);

  input.addEventListener("change", () => {
    filterManager.update({
      allMinimumsRemovedToggle: input.checked,
    });
  });

  filterManager.subscribe(
    `possibly hide all minimums toggle`,
    ({ policyTypeFilter }) => {
      outerContainer.hidden = policyTypeFilter === "reduce parking minimums";
    },
  );
}

function initPolicyTypeFilterDropdown(
  filterManager: PlaceFilterManager,
  filterPopup: HTMLFormElement,
): void {
  // Hide the dropdown if on the legacy app.
  if (filterManager.getState().policyTypeFilter === "legacy reform") return;

  const id = "filter-policy-type-dropdown";

  const container = document.createElement("div");
  container.className = "filter-policy-type-dropdown-container";

  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  select.ariaLabel = "the policy type to focus on";

  const options: PolicyTypeFilter[] = [
    "any parking reform",
    "add parking maximums",
    "reduce parking minimums",
    "remove parking minimums",
  ];
  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = capitalize(option);
    select.append(element);
  });

  select.addEventListener("change", () => {
    const policyTypeFilter = select.value as PolicyTypeFilter;
    filterManager.update({ policyTypeFilter });
  });

  container.append(select);
  filterPopup.append(container);
}

export function initFilterOptions(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
): void {
  // Note that the order of this function determines the order of the filter.
  const filterPopup = document.querySelector<HTMLFormElement>("#filter-popup");
  if (!filterPopup) return;

  // Top-level options that change profoundly the app.
  initPolicyTypeFilterDropdown(filterManager, filterPopup);
  initAllMinimumsToggle(filterManager, filterPopup);

  // Options about the reform
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "policy-change",
    filterStateKey: "includedPolicyChanges",
    legend: "Policy change",
    hide: ({ policyTypeFilter }) =>
      policyTypeFilter !== "legacy reform" &&
      policyTypeFilter !== "any parking reform",
  });
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "status",
    filterStateKey: "status",
    legend: "Reform status",
    hide: ({ policyTypeFilter }) => policyTypeFilter === "any parking reform",
  });
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "scope",
    filterStateKey: "scope",
    legend: "Reform scope",
    hide: ({ policyTypeFilter, allMinimumsRemovedToggle }) =>
      policyTypeFilter === "any parking reform" ||
      (allMinimumsRemovedToggle &&
        policyTypeFilter === "remove parking minimums"),
  });
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "land-use",
    filterStateKey: "landUse",
    legend: "Affected land use",
    hide: ({ policyTypeFilter, allMinimumsRemovedToggle }) =>
      policyTypeFilter === "any parking reform" ||
      (allMinimumsRemovedToggle &&
        policyTypeFilter === "remove parking minimums"),
  });
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "year",
    filterStateKey: "year",
    legend: "Reform year",
    useTwoColumns: true,
    hide: ({ policyTypeFilter }) => policyTypeFilter === "any parking reform",
  });

  // Options about the Place
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "country",
    filterStateKey: "country",
    legend: "Country",
    preserveCapitalization: true,
  });
  initFilterGroup(filterManager, filterOptions, filterPopup, {
    htmlName: "place-type",
    filterStateKey: "placeType",
    legend: "Jurisdiction",
    useTwoColumns: true,
  });
  initPopulationSlider(filterManager, filterPopup);
}
