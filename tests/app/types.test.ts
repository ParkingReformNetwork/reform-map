import { expect, test } from "@playwright/test";

import { Date } from "../../src/js/model/types";

test("Date.format()", () => {
  expect(new Date("2020").format()).toEqual("2020");
  expect(new Date("2020-02").format()).toEqual("Feb 2020");
  expect(new Date("2020-02-13").format()).toEqual("Feb 13, 2020");
});

test("Date.preposition()", () => {
  expect(new Date("2020").preposition()).toEqual("in");
  expect(new Date("2020-02").preposition()).toEqual("in");
  expect(new Date("2020-02-13").preposition()).toEqual("on");
});
