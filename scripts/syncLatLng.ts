/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { parseCsv } from "./lib/csv";
import { readCoreData, saveCoreData } from "./lib/data";
import { RawEntry, PlaceId } from "../src/js/types";

const GSHEET =
  "https://docs.google.com/spreadsheets/d/15L8hwNEi13Bov81EulgC8Xwt9_wCgofwcH49xHoNlKI/export?gid=0&format=csv";

async function fetchUpdateCsv(): Promise<Array<any[]>> {
  const response = await fetch(GSHEET);
  const rawText = await response.text();
  return parseCsv(rawText).map((row) => Object.values(row));
}

/* Inspired by join() from updateMapData.ts */
function updateLatLng(
  coreData: Record<PlaceId, RawEntry>,
  updateData: Array<any[]>,
): Record<PlaceId, RawEntry> {
  return Object.fromEntries(
    Object.entries(coreData).map(([placeId, entry]) => {
      const matchingRows = updateData.filter(
        (updateRow) =>
          updateRow[0] === entry.place &&
          updateRow[1] === entry.state &&
          updateRow[2] === entry.country,
      );
      if (!matchingRows.length) return [placeId, entry];
      const update = matchingRows[0];
      const lat = update[3];
      const long = update[4];
      return [
        placeId,
        {
          ...entry,
          coord: [long, lat],
        },
      ];
    }),
  );
}

async function main(): Promise<void> {
  const [updateData, coreData] = await Promise.all([
    fetchUpdateCsv(),
    readCoreData(),
  ]);
  const updatedData = updateLatLng(coreData, updateData);
  await saveCoreData(updatedData);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
