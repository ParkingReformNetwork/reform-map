import { expect, test } from "@playwright/test";

import { getFilteredIndexes } from "../../src/js/model/data";

test("getFilteredIndexes", () => {
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x !== "b")).toEqual([0, 2]);
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x === "b")).toEqual([1]);
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x === "z")).toEqual([]);
});
