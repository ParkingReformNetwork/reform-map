import { expect, test } from "@playwright/test";

import {
  escapePlaceId,
  placeIdToUrl,
  getFilteredIndexes,
  joinWithConjunction,
} from "../../src/js/model/data";

test("escapePlaceID", () => {
  expect(escapePlaceId("Tucson, AZ")).toEqual("Tucson_AZ");
  expect(escapePlaceId("St. Lucia, AZ")).toEqual("St.Lucia_AZ");
});

test("placeIdToUrl", () => {
  expect(placeIdToUrl("Tucson, AZ")).toEqual(
    "https://parkingreform.org/mandates-map/city_detail/Tucson_AZ.html",
  );
});

test("getFilteredIndexes", () => {
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x !== "b")).toEqual([0, 2]);
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x === "b")).toEqual([1]);
  expect(getFilteredIndexes(["a", "b", "c"], (x) => x === "z")).toEqual([]);
});

test("joinWithConjunction", () => {
  expect(joinWithConjunction([], "and")).toEqual("");
  expect(joinWithConjunction(["apple"], "and")).toEqual("apple");

  expect(joinWithConjunction(["apple", "banana"], "and")).toEqual(
    "apple and banana",
  );
  expect(joinWithConjunction(["read", "write"], "or")).toEqual("read or write");

  expect(joinWithConjunction(["apple", "banana", "orange"], "and")).toEqual(
    "apple, banana, and orange",
  );
  expect(
    joinWithConjunction(["read", "write", "execute", "delete"], "or"),
  ).toEqual("read, write, execute, or delete");

  expect(
    joinWithConjunction(["  space  ", "tab\t", "\nnewline"], "and"),
  ).toEqual("  space  , tab\t, and \nnewline");
  expect(joinWithConjunction(["!", "@", "#"], "or")).toEqual("!, @, or #");
});
