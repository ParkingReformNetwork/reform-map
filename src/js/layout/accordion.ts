import { createIcon } from "./icons";

export interface BaseAccordionElements {
  outerContainer: HTMLDivElement;
  accordionTitle: HTMLSpanElement;
  accordionButton: HTMLButtonElement;
  contentContainer: HTMLDivElement;
}

export interface AccordionState {
  hidden: boolean;
  expanded: boolean;
  title: string;
  supplementalTitle?: string;
}

export function updateAccordionUI(
  elements: BaseAccordionElements,
  state: AccordionState,
): void {
  // eslint-disable-next-line no-param-reassign
  elements.outerContainer.hidden = state.hidden;
  // eslint-disable-next-line no-param-reassign
  elements.accordionTitle.textContent = `${state.title}${state.supplementalTitle ?? ""}`;

  const upIcon =
    elements.accordionButton.querySelector<SVGElement>(".icon-chevron-up");
  const downIcon =
    elements.accordionButton.querySelector<SVGElement>(".icon-chevron-down");
  if (!upIcon || !downIcon) return;

  elements.accordionButton.setAttribute(
    "aria-expanded",
    state.expanded.toString(),
  );
  // eslint-disable-next-line no-param-reassign
  elements.contentContainer.hidden = !state.expanded;
  upIcon.style.display = state.expanded ? "block" : "none";
  downIcon.style.display = state.expanded ? "none" : "block";
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
