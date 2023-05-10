const { expect, test } = require("@jest/globals");
const { needsUpdate } = require("../updateCityDetail");

test("dummy test", () => {
  expect(needsUpdate()).toBeNull();
});
