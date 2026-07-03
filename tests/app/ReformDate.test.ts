import { expect, test } from "@playwright/test";

import { ReformDate } from "../../src/js/model/ReformDate";

test("ReformDate.format()", () => {
  expect(new ReformDate("2020").format()).toEqual("2020");
  expect(new ReformDate("2020-02").format()).toEqual("Feb 2020");
  expect(new ReformDate("2020-02-13").format()).toEqual("Feb 13, 2020");
});

test("ReformDate.valueOf() orders chronologically", () => {
  const year = new ReformDate("2020");
  const month = new ReformDate("2020-06");
  const day = new ReformDate("2020-06-15");
  const later = new ReformDate("2021-01-01");

  expect(year.valueOf()).toBeLessThan(month.valueOf());
  expect(month.valueOf()).toBeLessThan(day.valueOf());
  expect(day.valueOf()).toBeLessThan(later.valueOf());
});
