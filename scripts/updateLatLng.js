/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Papa from "papaparse";

const TRIMMED_REPORT = "map/trimmed_map_data.csv";
const TIDIED_REPORT = "map/tidied_map_data.csv";

const readCsv = async (filePath) => {
  const csvText = await fs.readFile(filePath, "utf-8");
  const { data } = Papa.parse(csvText.trim(), {
    header: true,
    dynamicTyping: true,
  });
  return data;
};

const updateLatLng = (reportData, updateData) => reportData;

const shouldCsvQuote = (val, columnIndex) =>
  typeof val === "string" || typeof val === "boolean" || columnIndex === 0;

const writeResult = async (data, filePath) => {
  // Papa doesn't quote null/undefined cells, so we have to manually set them to strings.
  const quotedData = data.map((row) =>
    Object.keys(row).reduce((newRow, key) => {
      // eslint-disable-next-line no-param-reassign
      newRow[key] = row[key] === undefined || row[key] === null ? "" : row[key];
      return newRow;
    }, {})
  );
  const csv = Papa.unparse(quotedData, { quotes: shouldCsvQuote });
  await fs.writeFile(filePath, csv);
};

const main = async () => {
  const [updateData, trimmedData, tidiedData] = await Promise.all([
    readCsv("update-lat-lng.csv"),
    readCsv(TRIMMED_REPORT),
    readCsv(TIDIED_REPORT),
  ]);
  const updatedTidied = updateLatLng(tidiedData, updateData);
  const updatedTrimmed = updateLatLng(trimmedData, updateData);
  await Promise.all([
    writeResult(updatedTidied, TIDIED_REPORT),
    writeResult(updatedTrimmed, TRIMMED_REPORT),
  ]);
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => console.error(error));
}

export { updateLatLng };
