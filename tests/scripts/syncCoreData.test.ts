import { expect, test } from "@playwright/test";
import { leftJoin } from "../../scripts/syncCoreData";

test.describe("leftJoin", () => {
  const testCases = [
    {
      baseRows: [
        { place: "City1", state: "State1", country: "Country1", someField: 10 },
        { place: "City2", state: "State2", country: "Country2", someField: 20 },
      ],
      newRows: [
        {
          place: "City1",
          state: "State1",
          country: "Country1",
          population: 1000,
        },
      ],
      expected: [
        {
          place: "City1",
          state: "State1",
          country: "Country1",
          someField: 10,
          population: 1000,
        },
        { place: "City2", state: "State2", country: "Country2", someField: 20 },
      ],
      name: "One matching city",
    },
    {
      baseRows: [
        { place: "City1", state: "State1", country: "Country1", someField: 30 },
        { place: "City2", state: "State2", country: "Country2", someField: 40 },
      ],
      newRows: [
        {
          place: "City3",
          state: "State3",
          country: "Country3",
          population: 2000,
        },
      ],
      expected: [
        { place: "City1", state: "State1", country: "Country1", someField: 30 },
        { place: "City2", state: "State2", country: "Country2", someField: 40 },
      ],
      name: "No matching cities",
    },
    {
      baseRows: [
        { place: "City1", state: "State1", country: "Country1", someField: 50 },
        { place: "City2", state: "State2", country: "Country2", someField: 60 },
      ],
      newRows: [],
      expected: [
        { place: "City1", state: "State1", country: "Country1", someField: 50 },
        { place: "City2", state: "State2", country: "Country2", someField: 60 },
      ],
      name: "Empty city data",
    },
  ];

  for (const { baseRows, newRows, expected, name } of testCases) {
    test(`Should left join correctly: ${name}`, () => {
      const result = leftJoin(baseRows, newRows);
      expect(result).toEqual(expected);
    });
  }
});
