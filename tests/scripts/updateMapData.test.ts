import { expect, test } from "@playwright/test";
import { leftJoin } from "../../scripts/updateMapData";

test.describe("leftJoin", () => {
  const testCases = [
    {
      baseRows: [
        { city: "City1", state: "State1", country: "Country1", someField: 10 },
        { city: "City2", state: "State2", country: "Country2", someField: 20 },
      ],
      newRows: [
        {
          city: "City1",
          state: "State1",
          country: "Country1",
          population: 1000,
        },
      ],
      expected: [
        {
          city: "City1",
          state: "State1",
          country: "Country1",
          someField: 10,
          population: 1000,
        },
        { city: "City2", state: "State2", country: "Country2", someField: 20 },
      ],
      name: "One matching city",
    },
    {
      baseRows: [
        { city: "City1", state: "State1", country: "Country1", someField: 30 },
        { city: "City2", state: "State2", country: "Country2", someField: 40 },
      ],
      newRows: [
        {
          city: "City3",
          state: "State3",
          country: "Country3",
          population: 2000,
        },
      ],
      expected: [
        { city: "City1", state: "State1", country: "Country1", someField: 30 },
        { city: "City2", state: "State2", country: "Country2", someField: 40 },
      ],
      name: "No matching cities",
    },
    {
      baseRows: [
        { city: "City1", state: "State1", country: "Country1", someField: 50 },
        { city: "City2", state: "State2", country: "Country2", someField: 60 },
      ],
      newRows: [],
      expected: [
        { city: "City1", state: "State1", country: "Country1", someField: 50 },
        { city: "City2", state: "State2", country: "Country2", someField: 60 },
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
