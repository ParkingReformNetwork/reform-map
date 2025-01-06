import { capitalize } from "lodash-es";

import {
  FilterState,
  PlaceFilterManager,
  PolicyTypeFilter,
} from "../state/FilterState";
import Observable from "../state/Observable";
import {
  BaseAccordionElements,
  AccordionState,
  generateAccordion,
  generateCheckbox,
  updateAccordionUI,
} from "../layout/accordion";
import { initPopulationSlider } from "./populationSlider";

import optionValuesData from "../../../data/option-values.json" with { type: "json" };

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
  status: new Set(["proposed", "repealed"]),
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
  return `(${checked}/${total})`;
}

type FilterGroupAccordionElements = BaseAccordionElements & {
  fieldSet: HTMLFieldSetElement;
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
};

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
      title: `${params.legend} ${checkboxStats}`,
    },
  );
  accordionState.subscribe((state) => updateAccordionUI(elements, state));
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
  title: string,
  fieldSet: HTMLFieldSetElement,
): void {
  const accordionPriorState = observable.getValue();
  observable.setValue({
    ...accordionPriorState,
    title: `${title} ${getCheckboxStatsDescription(fieldSet)}`,
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
    updateCheckboxStats(
      accordionState,
      params.legend,
      accordionElements.fieldSet,
    );

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
    updateCheckboxStats(
      accordionState,
      params.legend,
      accordionElements.fieldSet,
    );
    filterManager.update({
      [params.filterStateKey]: new Set(
        filterOptions.all(params.filterStateKey),
      ),
    });
  });

  accordionElements.uncheckAllButton.addEventListener("click", () => {
    allCheckboxes.forEach((input) => (input.checked = false));
    updateCheckboxStats(
      accordionState,
      params.legend,
      accordionElements.fieldSet,
    );
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
    hide: ({ policyTypeFilter }) => policyTypeFilter !== "any parking reform",
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
