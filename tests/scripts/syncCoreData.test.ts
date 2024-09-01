import { expect, test } from "@playwright/test";
import { join } from "../../scripts/syncCoreData";

test.describe("join()", () => {
  test("merges correctly", () => {
    const baseRows = [
      { place: "City1", state: "State1", country: "Country1", someField: 10 },
      { place: "City2", state: "State2", country: "Country2", someField: 20 },
    ];
    const newRows = [
      {
        place: "City1",
        state: "State1",
        country: "Country1",
        population: 1000,
      },
      {
        place: "City2",
        state: "State2",
        country: "Country2",
        population: 2000,
      },
    ];
    const result = join(baseRows, newRows);
    expect(result).toEqual([
      {
        place: "City1",
        state: "State1",
        country: "Country1",
        someField: 10,
        population: 1000,
      },
      {
        place: "City2",
        state: "State2",
        country: "Country2",
        someField: 20,
        population: 2000,
      },
    ]);
  });

  test("errors if no match", () => {
    const baseRows = [
      { place: "City1", state: "State1", country: "Country1", someField: 10 },
    ];
    expect(() => join(baseRows, [])).toThrow();
  });

  test("errors if >1 match", () => {
    const baseRows = [
      { place: "City1", state: "State1", country: "Country1", someField: 10 },
    ];
    const newRows = [
      {
        place: "City1",
        state: "State1",
        country: "Country1",
        population: 1000,
      },
      {
        place: "City1",
        state: "State1",
        country: "Country1",
        population: 2000,
      },
    ];
    expect(() => join(baseRows, newRows)).toThrow();
  });
});
