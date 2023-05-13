import {
  magnitudeToHighest,
  magnitudeToHighestOrAllUses,
  landUseToString,
  populationToBin,
} from "../updateMapData";

describe("magnitudeToHighest", () => {
  const testCases = [
    ["Regional", "Regional"],
    ["Citywide", "Citywide"],
    ["City Center", "City Center"],
    ["Transit Oriented", "TOD"],
    ["Main Street", "Main Street"],
    ["Unknown", "NA"],
  ];

  test.each(testCases)(
    'returns the highest magnitude for "%s"',
    (magnitudeString, expected) => {
      expect(magnitudeToHighest(magnitudeString)).toBe(expected);
    }
  );
});

describe("magnitudeToHighestOrAllUses", () => {
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

  test.each(testCases)(
    'returns the highest or all uses magnitude for "%s" and "%s"',
    (magnitudeString, landusesString, expected) => {
      expect(magnitudeToHighestOrAllUses(magnitudeString, landusesString)).toBe(
        expected
      );
    }
  );
});

describe("landUseToString", () => {
  const testCases = [
    ["All Uses", "city"],
    ["Residential, Commercial, Other", "laptop"],
    ["Commercial", "building"],
    ["Residential", "home"],
    ["blah blah unknown", "car"],
  ];

  test.each(testCases)(
    'returns the corresponding icon for land use "%s"',
    (landUseString, expected) => {
      expect(landUseToString(landUseString)).toBe(expected);
    }
  );
});

describe("populationToBin", () => {
  const testCases = [
    [600000, 1],
    [250000, 0.7],
    [120000, 0.4],
    [50000, 0.2],
    [1, 0.2],
  ];

  test.each(testCases)(
    "returns the correct bin for population %d",
    (population, expected) => {
      expect(populationToBin(population)).toBe(expected);
    }
  );
});
