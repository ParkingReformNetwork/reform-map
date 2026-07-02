/**
 * Icons reference <symbol> definitions in the SVG sprite at the top of index.html.
 * See README.md for how to add a new icon.
 */

export type IconName =
  | "arrow-right"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "circle-question"
  | "up-right-from-square"
  | "circle-xmark"
  | "link"
  | "magnifying-glass"
  | "square"
  | "square-check"
  | "sliders"
  | "table"
  | "earth-americas"
  | "triangle-exclamation";

function markup(name: IconName, className?: string): string {
  const classAttr = className ? ` class="${className}"` : "";
  return `<svg${classAttr} aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

export function iconHtml(name: IconName, className?: string): string {
  return markup(name, className);
}

export function createIcon(name: IconName, className?: string): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = markup(name, className);
  return template.content.firstChild as SVGSVGElement;
}
