import { expect, test } from "@playwright/test";

import { escapePlaceId } from "../../src/js/data";

test("escapePlaceID", () => {
  expect(escapePlaceId("Tucson, AZ")).toEqual("Tucson_AZ");
  expect(escapePlaceId("St. Lucia, AZ")).toEqual("St.Lucia_AZ");
});
