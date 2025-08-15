import { capitalize } from "lodash-es";

import {
  ALL_POLICY_TYPE_FILTER,
  FilterState,
  isAllMinimumsRemovedToggleShown,
  isAllMinimumsRemovedToggleInEffect,
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
  scope: string[];
  landUse: string[];
  country: string[];
  year: string[];
  placeType: string[];
};

export interface FilterOptions {
  readonly merged: DataSetSpecificOptions;
  readonly datasets: Record<
    PolicyTypeFilter,
    Record<ReformStatus, DataSetSpecificOptions>
  >;
  getOptions(
    policyType: PolicyTypeFilter,
    status: ReformStatus,
  ): DataSetSpecificOptions;
  enabled(policyType: PolicyTypeFilter, status: ReformStatus): boolean;
}

export const FILTER_OPTIONS: FilterOptions = {
  merged: {
    includedPolicyChanges: ALL_POLICY_TYPE,
    ...optionValuesData.merged,
  },

  datasets: {
    "any parking reform": {
      adopted: {
        includedPolicyChanges: ALL_POLICY_TYPE,
        ...optionValuesData.anyAdopted,
      },
      proposed: {
        includedPolicyChanges: ALL_POLICY_TYPE,
        ...optionValuesData.anyProposed,
      },
      repealed: {
        includedPolicyChanges: ALL_POLICY_TYPE,
        ...optionValuesData.anyRepealed,
      },
    },
    "add parking maximums": {
      adopted: {
        includedPolicyChanges: [],
        ...optionValuesData.addMaxAdopted,
      },
      proposed: {
        includedPolicyChanges: [],
        ...optionValuesData.addMaxProposed,
      },
      repealed: {
        includedPolicyChanges: [],
        ...optionValuesData.addMaxRepealed,
      },
    },
    "reduce parking minimums": {
      adopted: {
        includedPolicyChanges: [],
        ...optionValuesData.reduceMinAdopted,
      },
      proposed: {
        includedPolicyChanges: [],
        ...optionValuesData.reduceMinProposed,
      },
      repealed: {
        includedPolicyChanges: [],
        ...optionValuesData.reduceMinRepealed,
      },
    },
    "remove parking minimums": {
      adopted: {
        includedPolicyChanges: [],
        ...optionValuesData.rmMinAdopted,
      },
      proposed: {
        includedPolicyChanges: [],
        ...optionValuesData.rmMinProposed,
      },
      repealed: {
        includedPolicyChanges: [],
        ...optionValuesData.rmMinRepealed,
      },
    },
    "parking benefit district": {
      adopted: {
        includedPolicyChanges: [],
        ...optionValuesData.benefitDistrictAdopted,
      },
      proposed: {
        includedPolicyChanges: [],
        ...optionValuesData.benefitDistrictProposed,
      },
      repealed: {
        includedPolicyChanges: [],
        ...optionValuesData.benefitDistrictRepealed,
      },
    },
  },

  getOptions(
    policyType: PolicyTypeFilter,
    status: ReformStatus,
  ): DataSetSpecificOptions {
    return this.datasets[policyType][status];
  },

  enabled(policyType: PolicyTypeFilter, status: ReformStatus): boolean {
    return this.datasets[policyType][status].placeType.length > 0;
  },
} as const;

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
  // However, we use the initial filterState to determine if it should be checked.
  FILTER_OPTIONS.merged[params.filterStateKey].forEach((val, i) => {
    const inputId = `filter-${params.htmlName}-option-${i}`;
    const checked = filterState[params.filterStateKey].has(val);
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
  optionsContainer: HTMLDivElement,
  params: FilterGroupParams,
): void {
  const [accordionElements, accordionState] = generateAccordionForFilterGroup(
    filterManager.getState(),
    params,
  );
  optionsContainer.appendChild(accordionElements.outerContainer);

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
        FILTER_OPTIONS.getOptions(state.policyTypeFilter, state.status)[
          params.filterStateKey
        ],
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

function initOutermostContainers(
  filterManager: PlaceFilterManager,
  filterPopup: HTMLFormElement,
): {
  datasetDiv: HTMLDivElement;
  optionsDiv: HTMLDivElement;
} {
  const datasetDiv = document.createElement("div");

  const disabledDatasetDiv = document.createElement("div");
  disabledDatasetDiv.classList.add("filter-illegal-dataset-container");
  disabledDatasetDiv.hidden = true;
  const warningIcon = document.createElement("i");
  warningIcon.classList.add("fa-solid", "fa-triangle-exclamation");
  warningIcon.ariaHidden = "true";
  const warningText = document.createElement("span");
  warningText.textContent =
    " This dataset has no entries. To fix, change either the 'reform type' or 'status'.";
  disabledDatasetDiv.append(warningIcon);
  disabledDatasetDiv.append(warningText);

  const optionsDiv = document.createElement("div");

  filterManager.subscribe(
    `possibly disable dataset`,
    ({ policyTypeFilter, status }) => {
      const enabled = FILTER_OPTIONS.enabled(policyTypeFilter, status);
      disabledDatasetDiv.hidden = enabled;
      optionsDiv.hidden = !enabled;
    },
  );

  filterPopup.append(datasetDiv);
  filterPopup.append(disabledDatasetDiv);
  filterPopup.append(optionsDiv);
  return {
    datasetDiv,
    optionsDiv,
  };
}

function initAllMinimumsToggle(
  filterManager: PlaceFilterManager,
  optionsContainer: HTMLDivElement,
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
  optionsContainer.append(outerContainer);

  input.addEventListener("change", () => {
    filterManager.update({
      allMinimumsRemovedToggle: input.checked,
    });
  });

  filterManager.subscribe(
    `possibly hide all minimums toggle`,
    (filterState) => {
      outerContainer.hidden = !isAllMinimumsRemovedToggleShown(filterState);
    },
  );
}

function initPolicyTypeFilterDropdown(
  filterManager: PlaceFilterManager,
  dropdownContainer: HTMLDivElement,
): void {
  const id = "filter-policy-type-dropdown";

  const container = document.createElement("div");
  container.className = "filter-policy-type-dropdown-container";

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = "Reform type";

  const select = document.createElement("select");
  select.id = id;
  select.name = id;

  ALL_POLICY_TYPE_FILTER.forEach((option) => {
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

  container.append(label);
  container.append(select);
  dropdownContainer.append(container);
}

function initStatusDropdown(
  filterManager: PlaceFilterManager,
  dropdownContainer: HTMLDivElement,
): void {
  const id = "filter-status-dropdown";

  const container = document.createElement("div");
  container.className = "filter-status-dropdown-container";

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = "Status";

  const select = document.createElement("select");
  select.id = id;
  select.name = id;

  ALL_REFORM_STATUS.forEach((option) => {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = capitalize(option);
    select.append(element);
  });

  // Set initial value.
  select.value = filterManager.getState().status;

  select.addEventListener("change", () => {
    const status = select.value as ReformStatus;
    filterManager.update({ status });
  });

  container.append(label);
  container.append(select);
  dropdownContainer.append(container);
}

export function initFilterOptions(filterManager: PlaceFilterManager): void {
  // Note that the order of this function determines the order of the filter.
  const filterPopup = document.querySelector<HTMLFormElement>("#filter-popup");
  if (!filterPopup) return;

  const { datasetDiv, optionsDiv } = initOutermostContainers(
    filterManager,
    filterPopup,
  );

  // Top-level options that change profoundly the app.
  initPolicyTypeFilterDropdown(filterManager, datasetDiv);
  initStatusDropdown(filterManager, datasetDiv);
  initAllMinimumsToggle(filterManager, optionsDiv);

  // Options about the reform
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "policy-change",
    filterStateKey: "includedPolicyChanges",
    legend: "Reform types",
    hide: ({ policyTypeFilter }) => policyTypeFilter !== "any parking reform",
  });
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "scope",
    filterStateKey: "scope",
    legend: "Reform scopes",
    hide: (filterState) =>
      filterState.policyTypeFilter === "any parking reform" ||
      filterState.policyTypeFilter === "parking benefit district" ||
      isAllMinimumsRemovedToggleInEffect(filterState),
  });
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "land-use",
    filterStateKey: "landUse",
    legend: "Affected land uses",
    hide: (filterState) =>
      filterState.policyTypeFilter === "any parking reform" ||
      filterState.policyTypeFilter === "parking benefit district" ||
      isAllMinimumsRemovedToggleInEffect(filterState),
  });
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "year",
    filterStateKey: "year",
    legend: ({ status }) => {
      const mapping: Record<ReformStatus, string> = {
        adopted: "Adoption years",
        proposed: "Proposal years",
        repealed: "Repeal years",
      };
      return mapping[status];
    },
    useTwoColumns: true,
    hide: ({ policyTypeFilter }) => policyTypeFilter === "any parking reform",
  });

  // Options about the Place
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "country",
    filterStateKey: "country",
    legend: "Countries",
    preserveCapitalization: true,
  });
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "place-type",
    filterStateKey: "placeType",
    legend: "Jurisdictions",
    useTwoColumns: true,
  });
  initPopulationSlider(filterManager, optionsDiv);
}
