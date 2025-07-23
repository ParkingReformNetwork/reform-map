import { capitalize, isEqual } from "lodash-es";

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
import {
  ALL_POLICY_TYPE,
  ALL_REFORM_STATUS,
  ReformStatus,
} from "../model/types";

/** These option values change depending on which dataset is loaded.
 *
 * Note that some datasets may not actually use a particular option group, but
 * we still include it to make the modeling simpler.
 *
 * Keep in alignment with FilterState.
 */
type DataSetSpecificOptions = {
  includedPolicyChanges: readonly string[];
  status: readonly string[];
  scope: string[];
  landUse: string[];
  country: string[];
  year: string[];
  placeType: string[];
};

// We only check `adopted` by default. (We should actually fix `status`
// to be a radio selection rather than multiple choice.)
export const DEFAULT_REFORM_STATUS: ReformStatus = "adopted";

export class FilterOptions {
  readonly merged: DataSetSpecificOptions;

  readonly datasets: Record<PolicyTypeFilter, DataSetSpecificOptions>;

  constructor() {
    this.merged = {
      includedPolicyChanges: ALL_POLICY_TYPE,
      status: ALL_REFORM_STATUS,
      ...optionValuesData.merged,
    };
    this.datasets = {
      "any parking reform": {
        includedPolicyChanges: ALL_POLICY_TYPE,
        status: ALL_REFORM_STATUS,
        ...optionValuesData.any,
      },
      "add parking maximums": {
        includedPolicyChanges: [],
        status: ALL_REFORM_STATUS,
        ...optionValuesData.addMax,
      },
      "remove parking minimums": {
        includedPolicyChanges: [],
        status: ALL_REFORM_STATUS,
        ...optionValuesData.rmMin,
      },
      "reduce parking minimums": {
        includedPolicyChanges: [],
        status: ALL_REFORM_STATUS,
        ...optionValuesData.reduceMin,
      },
    };
  }

  getOptions(policyType: PolicyTypeFilter): DataSetSpecificOptions {
    return this.datasets[policyType];
  }
}

function getVisibleCheckboxes(
  fieldset: HTMLFieldSetElement,
): Array<HTMLInputElement> {
  const allCheckboxes = fieldset.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  return Array.from(allCheckboxes).filter(
    (checkbox) => !checkbox.parentElement?.hidden,
  );
}

function extractLabel(
  input: HTMLInputElement,
  preserveCapitalization?: boolean,
): string | undefined {
  const text = input.parentElement?.textContent?.trim();
  return preserveCapitalization ? text : text?.toLowerCase();
}

/**
 * Get all options that are checked, regardless of if they are hidden.
 */
export function determineCheckedLabels(
  fieldset: HTMLFieldSetElement,
  preserveCapitalization?: boolean,
): Set<string> {
  return new Set(
    Array.from(
      fieldset.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]:checked',
      ),
    )
      .map((input) => extractLabel(input, preserveCapitalization))
      .filter((x) => x !== undefined),
  );
}

export function determineSupplementalTitle(
  fieldset: HTMLFieldSetElement,
): string {
  const visibleCheckboxes = getVisibleCheckboxes(fieldset);
  const total = visibleCheckboxes.length;
  const checked = visibleCheckboxes.filter(
    (checkbox) => checkbox.checked,
  ).length;
  return ` (${checked}/${total})`;
}

type FilterGroupAccordionElements = BaseAccordionElements & {
  fieldSet: HTMLFieldSetElement;
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
};

type FilterGroupParams = {
  htmlName: string;
  filterStateKey: keyof DataSetSpecificOptions;
  legend: string | ((state: FilterState) => string);
  /// If not set to true, the option will use Lodash's `capitalize()`. This
  /// only impacts the UI and not the underlying data.
  preserveCapitalization?: boolean;
  useTwoColumns?: boolean;
  hide?: (state: FilterState) => boolean;
};

function generateAccordionForFilterGroup(
  filterState: FilterState,
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

  // When setting up the filter group, we use `merged` to add every option in the universe.
  filterOptions.merged[params.filterStateKey].forEach((val, i) => {
    const inputId = `filter-${params.htmlName}-option-${i}`;
    const checked =
      params.filterStateKey !== "status" || val === DEFAULT_REFORM_STATUS;
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

  const accordionState = new Observable<AccordionState>(
    `filter accordion ${params.htmlName}`,
    {
      hidden: false,
      expanded: false,
      title:
        typeof params.legend === "string"
          ? params.legend
          : params.legend(filterState),
      supplementalTitle: determineSupplementalTitle(fieldSet),
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
  fieldSet: HTMLFieldSetElement,
): void {
  const accordionPriorState = observable.getValue();
  observable.setValue({
    ...accordionPriorState,
    supplementalTitle: determineSupplementalTitle(fieldSet),
  });
}

/**
 * Hide all options not in the dataset.
 */
function updateCheckboxVisibility(
  optionsInDataset: readonly string[],
  fieldSet: HTMLFieldSetElement,
  preserveCapitalization?: boolean,
): void {
  const validOptions = new Set(optionsInDataset);
  fieldSet
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((checkbox) => {
      const label = extractLabel(checkbox, preserveCapitalization);
      // eslint-disable-next-line no-param-reassign
      checkbox.parentElement!.hidden = !label || !validOptions.has(label);
    });
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  filterOptions: FilterOptions,
  filterPopup: HTMLFormElement,
  params: FilterGroupParams,
): void {
  const [accordionElements, accordionState] = generateAccordionForFilterGroup(
    filterManager.getState(),
    params,
    filterOptions,
  );
  filterPopup.appendChild(accordionElements.outerContainer);

  accordionElements.fieldSet.addEventListener("change", () => {
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({ [params.filterStateKey]: checkedLabels });
  });

  accordionElements.checkAllButton.addEventListener("click", () => {
    const visibleCheckboxes = getVisibleCheckboxes(accordionElements.fieldSet);
    visibleCheckboxes.forEach((input) => {
      // eslint-disable-next-line no-param-reassign
      input.checked = true;
    });
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({
      [params.filterStateKey]: checkedLabels,
    });
  });

  accordionElements.uncheckAllButton.addEventListener("click", () => {
    const visibleCheckboxes = getVisibleCheckboxes(accordionElements.fieldSet);
    visibleCheckboxes.forEach((input) => {
      // eslint-disable-next-line no-param-reassign
      input.checked = false;
    });
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({
      [params.filterStateKey]: checkedLabels,
    });
  });

  filterManager.subscribe(
    `possibly update ${params.htmlName} filter UI`,
    (state) => {
      updateCheckboxVisibility(
        filterOptions.getOptions(state.policyTypeFilter)[params.filterStateKey],
        accordionElements.fieldSet,
        params.preserveCapitalization,
      );
      updateCheckboxStats(accordionState, accordionElements.fieldSet);

      const priorAccordionState = accordionState.getValue();
      const hidden = params.hide ? params.hide(state) : false;
      const title =
        typeof params.legend === "string"
          ? params.legend
          : params.legend(state);
      accordionState.setValue({ ...priorAccordionState, title, hidden });
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
      outerContainer.hidden = policyTypeFilter !== "remove parking minimums";
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

  // Set initial value.
  select.value = filterManager.getState().policyTypeFilter;

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
    legend: ({ status }) => {
      if (isEqual(status, new Set(["adopted"]))) return "Adoption year";
      if (isEqual(status, new Set(["proposed"]))) return "Proposal year";
      if (isEqual(status, new Set(["repealed"]))) return "Repeal year";
      return "Reform year";
    },
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
