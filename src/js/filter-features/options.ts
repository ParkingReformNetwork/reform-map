import { capitalize } from "lodash-es";
import optionValuesData from "../../../data/option-values.json" with {
  type: "json",
};
import {
  type AccordionState,
  type BaseAccordionElements,
  generateAccordion,
  generateCheckbox,
  generateGroupSelectorButtons,
  wireAccordion,
} from "../layout/accordion";
import { createLabeledSelect } from "../layout/dropdown";
import { createIcon } from "../layout/icons";
import {
  ALL_POLICY_TYPE,
  ALL_REFORM_STATUS,
  type ReformStatus,
} from "../model/types";
import {
  ALL_POLICY_TYPE_FILTER,
  type FilterState,
  isAllMinimumsRemovedToggleInEffect,
  isAllMinimumsRemovedToggleShown,
  type PlaceFilterManager,
  type PolicyTypeFilter,
} from "../state/FilterState";
import type Observable from "../state/Observable";
import { initPopulationSlider } from "./populationSlider";

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

export function determineCheckedCountTitle(
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
  /**
   * If not set to true, the option will use Lodash's `capitalize()`. This
   * only impacts the UI and not the underlying data.
   */
  preserveCapitalization?: boolean;
  useTwoColumns?: boolean;
  hide?: (state: FilterState) => boolean;
};

function resolveLegend(
  legend: FilterGroupParams["legend"],
  state: FilterState,
): string {
  return typeof legend === "string" ? legend : legend(state);
}

/** Reform scope and land use only apply to policies with a specific reform
 * type, and are irrelevant once the "all minimums removed" toggle is in effect. */
function hideUnlessScopedPolicy(filterState: FilterState): boolean {
  return (
    filterState.policyTypeFilter === "any parking reform" ||
    filterState.policyTypeFilter === "parking benefit district" ||
    isAllMinimumsRemovedToggleInEffect(filterState)
  );
}

function generateAccordionForFilterGroup(
  filterState: FilterState,
  params: FilterGroupParams,
): [FilterGroupAccordionElements, Observable<AccordionState>] {
  const baseElements = generateAccordion(params.htmlName);

  const fieldSet = document.createElement("fieldset");
  fieldSet.className = `filter-${params.htmlName}`;
  baseElements.contentContainer.appendChild(fieldSet);

  const {
    container: groupSelectorButtons,
    checkAllButton,
    uncheckAllButton,
  } = generateGroupSelectorButtons(params.htmlName);
  fieldSet.appendChild(groupSelectorButtons);

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
    const checked = (filterState[params.filterStateKey] as Set<string>).has(
      val,
    );
    const description = params.preserveCapitalization ? val : capitalize(val);
    const [label, input] = generateCheckbox(
      inputId,
      params.htmlName,
      checked,
      description,
    );
    input.dataset.value = val;
    filterOptionsContainer.appendChild(label);
  });

  const elements = {
    ...baseElements,
    fieldSet,
    checkAllButton,
    uncheckAllButton,
  };

  const accordionState = wireAccordion(
    elements,
    `filter accordion ${params.htmlName}`,
    {
      hidden: false,
      expanded: false,
      title: resolveLegend(params.legend, filterState),
      supplementalTitle: determineCheckedCountTitle(fieldSet),
    },
  );
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
    supplementalTitle: determineCheckedCountTitle(fieldSet),
  });
}

/**
 * Hide all options not in the dataset.
 */
function updateCheckboxVisibility(
  optionsInDataset: readonly string[],
  fieldSet: HTMLFieldSetElement,
): void {
  const validOptions = new Set(optionsInDataset);
  fieldSet
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.parentElement!.hidden = !validOptions.has(
        checkbox.dataset.value!,
      );
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

  const currentValues = (): Set<string> =>
    filterManager.getState()[params.filterStateKey];
  const visibleValues = (): Set<string> =>
    new Set(
      getVisibleCheckboxes(accordionElements.fieldSet).map(
        (input) => input.dataset.value!,
      ),
    );

  accordionElements.fieldSet.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    const value = input.dataset.value;
    if (value === undefined) return;
    const next = new Set(currentValues());
    if (input.checked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    filterManager.update({ [params.filterStateKey]: next });
  });

  accordionElements.checkAllButton.addEventListener("click", () => {
    const next = new Set([...currentValues(), ...visibleValues()]);
    filterManager.update({ [params.filterStateKey]: next });
  });

  accordionElements.uncheckAllButton.addEventListener("click", () => {
    const visible = visibleValues();
    const next = new Set(
      [...currentValues()].filter((value) => !visible.has(value)),
    );
    filterManager.update({ [params.filterStateKey]: next });
  });

  filterManager.subscribe(
    `possibly update ${params.htmlName} filter UI`,
    (state) => {
      accordionElements.fieldSet
        .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
        .forEach((input) => {
          input.checked = (state[params.filterStateKey] as Set<string>).has(
            input.dataset.value!,
          );
        });

      updateCheckboxVisibility(
        FILTER_OPTIONS.getOptions(state.policyTypeFilter, state.status)[
          params.filterStateKey
        ],
        accordionElements.fieldSet,
      );
      updateCheckboxStats(accordionState, accordionElements.fieldSet);

      const priorAccordionState = accordionState.getValue();
      const hidden = params.hide ? params.hide(state) : false;
      const title = resolveLegend(params.legend, state);
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
  const warningIcon = createIcon("triangle-exclamation");
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

export function initFilterOptions(filterManager: PlaceFilterManager): void {
  // Note that the order of this function determines the order of the filter.
  const filterPopup = document.querySelector<HTMLFormElement>("#filter-popup");
  if (!filterPopup) return;

  const { datasetDiv, optionsDiv } = initOutermostContainers(
    filterManager,
    filterPopup,
  );

  const initialState = filterManager.getState();

  // Top-level options that change profoundly the app.
  createLabeledSelect(datasetDiv, {
    id: "filter-policy-type-dropdown",
    className: "filter-policy-type-dropdown-container",
    label: "Reform type",
    options: ALL_POLICY_TYPE_FILTER,
    initialValue: initialState.policyTypeFilter,
    onChange: (value) =>
      filterManager.update({ policyTypeFilter: value as PolicyTypeFilter }),
  });
  createLabeledSelect(datasetDiv, {
    id: "filter-status-dropdown",
    className: "filter-status-dropdown-container",
    label: "Status",
    options: ALL_REFORM_STATUS,
    initialValue: initialState.status,
    onChange: (value) =>
      filterManager.update({ status: value as ReformStatus }),
  });
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
    hide: hideUnlessScopedPolicy,
  });
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "land-use",
    filterStateKey: "landUse",
    legend: "Affected land uses",
    hide: hideUnlessScopedPolicy,
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
