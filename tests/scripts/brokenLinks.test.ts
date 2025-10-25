import { expect, test } from "@playwright/test";
import { readCitationIdAndLinks } from "../../scripts/brokenLinks";

test("mapPlaceToCitationLinks correctly determines some example pages", async () => {
  // If the links get updated, then update the below tests.
  const rawResult = await readCitationIdAndLinks();
  const result = Object.fromEntries(rawResult);
  expect(result[8022]).toEqual(
    "https://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
  );
  expect(result[8050]).toEqual("https://www.albionne.com/media/686");
});
