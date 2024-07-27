import { expect, test } from "@playwright/test";
import {
  leftJoin,
  magnitudeToHighest,
  magnitudeToHighestOrAllUses,
  landUseToString,
  populationToBin,
} from "../../scripts/updateMapData";

test.describe("magnitudeToHighest", () => {
  const testCases = [
    ["Regional", "Regional"],
    ["Citywide", "Citywide"],
    ["City Center", "City Center"],
    ["Transit Oriented", "TOD"],
    ["Main Street", "Main Street"],
    ["Unknown", "NA"],
  ];
  for (const [magnitudeString, expected] of testCases) {
    test(`returns the highest magnitude for ${magnitudeString}`, () => {
      expect(magnitudeToHighest(magnitudeString)).toBe(expected);
    });
  }
});

test.describe("magnitudeToHighestOrAllUses", () => {
  const testCases = [
    ["Citywide", "all uses", "Citywide All"],
    ["Citywide", "residential commercial", "Citywide"],
    ["City Center", "all uses", "City Center All"],
    ["City Center", "commercial", "City Center"],
    ["Transit Oriented", "all uses", "TOD"],
    ["Transit Oriented", "residential", "TOD All"],
    ["Main Street", "all uses", "Main Street"],
    ["Main Street", "commercial", "Main Street All"],
    ["Unknown", "unknown", "NA"],
  ];
  for (const [magnitudeString, landusesString, expected] of testCases) {
    test(`returns the highest or all uses magnitude for ${magnitudeString} and ${landusesString}`, () => {
      expect(magnitudeToHighestOrAllUses(magnitudeString, landusesString)).toBe(
        expected,
      );
    });
  }
});

test.describe("landUseToString", () => {
  const testCases = [
    ["All Uses", "city"],
    ["Residential, Commercial, Other", "laptop"],
    ["Commercial", "building"],
    ["Residential", "home"],
    ["blah blah unknown", "car"],
  ];

  for (const [landUseString, expected] of testCases) {
    test(`returns the corresponding icon for land use ${landUseString}`, () => {
      expect(landUseToString(landUseString)).toBe(expected);
    });
  }
});

test.describe("populationToBin", () => {
  const testCases = [
    [600000, 1],
    [250000, 0.7],
    [120000, 0.4],
    [50000, 0.2],
    [1, 0.2],
  ];

  for (const [population, expected] of testCases) {
    test(`returns the correct bin for population ${population}`, () => {
      expect(populationToBin(population)).toBe(expected);
    });
  }
});

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
