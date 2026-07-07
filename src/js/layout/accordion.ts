import Observable from "../state/Observable";
import { createIcon } from "./icons";

export interface BaseAccordionElements {
  outerContainer: HTMLDetailsElement;
  accordionTitle: HTMLSpanElement;
  accordionButton: HTMLElement;
  contentContainer: HTMLDivElement;
}

export interface AccordionState {
  hidden: boolean;
  title: string;
  supplementalTitle?: string;
}

function updateAccordionUI(
  elements: BaseAccordionElements,
  state: AccordionState,
): void {
  elements.outerContainer.hidden = state.hidden;
  elements.accordionTitle.textContent = `${state.title}${state.supplementalTitle ?? ""}`;
}

/** Create the Observable backing an accordion.
 *
 * Does not call `initialize()`: callers may add more subscribers first, and
 * `Observable.subscribe` throws once initialized. */
export function wireAccordion(
  elements: BaseAccordionElements,
  observableId: string,
  initialState: AccordionState,
): Observable<AccordionState> {
  const accordionState = new Observable<AccordionState>(
    observableId,
    initialState,
  );
  accordionState.subscribe(`update ${observableId} accordion UI`, (state) =>
    updateAccordionUI(elements, state),
  );
  return accordionState;
}

export function generateCheckbox(
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

  const squareIcon = createIcon("square", "icon-square");
  const checkedIcon = createIcon("square-check", "icon-square-check");

  const span = document.createElement("span");
  span.textContent = description;

  label.appendChild(input);
  label.appendChild(squareIcon);
  label.appendChild(checkedIcon);
  label.appendChild(span);
  return [label, input];
}

/** Create a "check all" / "uncheck all" button pair, wrapped in a container. */
export function generateGroupSelectorButtons(htmlName: string): {
  container: HTMLDivElement;
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
} {
  const container = document.createElement("div");
  container.className = "filter-group-selectors-container";

  const checkAllButton = document.createElement("button");
  checkAllButton.type = "button";
  checkAllButton.textContent = "Check all";
  checkAllButton.id = `filter-${htmlName}-check-all`;
  container.appendChild(checkAllButton);

  const uncheckAllButton = document.createElement("button");
  uncheckAllButton.type = "button";
  uncheckAllButton.textContent = "Uncheck all";
  uncheckAllButton.id = `filter-${htmlName}-uncheck-all`;
  container.appendChild(uncheckAllButton);

  return { container, checkAllButton, uncheckAllButton };
}

/** Generate the base of an accordion.
 *
 * The contentContainer is empty and needs to be filled in by callers. An Observable
 * for AccordionState also needs to be configured.
 */
export function generateAccordion(htmlName: string): BaseAccordionElements {
  const outerContainer = document.createElement("details");
  outerContainer.className = "filter-accordion";

  const buttonId = `filter-accordion-toggle-${htmlName}`;
  const contentId = `filter-accordion-content-${htmlName}`;
  const titleId = `filter-accordion-title-${htmlName}`;

  const accordionButton = document.createElement("summary");
  accordionButton.id = buttonId;
  accordionButton.className = "filter-accordion-toggle";

  const accordionTitle = document.createElement("span");
  accordionTitle.id = titleId;
  accordionTitle.className = "filter-accordion-title";
  accordionButton.appendChild(accordionTitle);

  const accordionIconContainer = document.createElement("div");
  accordionIconContainer.className = "filter-accordion-icon-container";
  accordionIconContainer.ariaHidden = "true";
  const downIcon = createIcon("chevron-down", "icon-chevron-down");
  downIcon.setAttribute("title", "expand option checkboxes");
  const upIcon = createIcon("chevron-up", "icon-chevron-up");
  upIcon.setAttribute("title", "collapse option checkboxes");
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
