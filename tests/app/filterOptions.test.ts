import { expect, test } from "@playwright/test";
import { Window } from "happy-dom";

import { determineSupplementalTitle } from "../../src/js/filter-features/options";

function createFieldset(childrenHTML: string): HTMLFieldSetElement {
  const window = new Window();
  const document = window.document;
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
