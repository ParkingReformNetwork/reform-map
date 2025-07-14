import { expect, test } from "@playwright/test";
import { Window } from "happy-dom";

import {
  determineSupplementalTitle,
  determineCheckedLabels,
} from "../../src/js/filter-features/options";

function createFieldset(childrenHTML: string): HTMLFieldSetElement {
  const window = new Window();
  const { document } = window;
  document.body.innerHTML = `<fieldset>${childrenHTML}</fieldset>`;
  return document.querySelector("fieldset")! as unknown as HTMLFieldSetElement;
}

test("determineSupplementalTitle", () => {
  // 5 checkboxes:
  // - 2 are hidden, one of which is checked
  // - 3 are visible, two of which are checked
  const fieldset = createFieldset(`
      <label><input type="checkbox" checked></label>
      <label><input type="checkbox"></label>
      <label><input type="checkbox" checked></label>
      <label hidden><input type="checkbox" checked></label>
      <label hidden><input type="checkbox"></label>
    `);
  expect(determineSupplementalTitle(fieldset)).toEqual(" (2/3)");
});

test("determineCheckedLabels should return labels of checked checkboxes", () => {
  const fieldset = createFieldset(`
    <div><input type="checkbox" checked>First Option</div>
    <div><input type="checkbox">Second Option</div>
    <div><input type="checkbox" checked>Third Option</div>
    <div hidden><input type="checkbox" checked>Hidden Checked</div>
    <div hidden><input type="checkbox">Hidden Unchecked</div>
  `);

  const result = determineCheckedLabels(fieldset);
  expect(result).toEqual(
    new Set(["first option", "third option", "hidden checked"]),
  );

  const preserveCapitalization = determineCheckedLabels(fieldset, true);
  expect(preserveCapitalization).toEqual(
    new Set(["First Option", "Third Option", "Hidden Checked"]),
  );
});
