/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Papa from "papaparse";

const TRIMMED_REPORT = "map/trimmed_map_data.csv";
const TIDIED_REPORT = "map/tidied_map_data.csv";
const GSHEET =
  "https://docs.google.com/spreadsheets/d/15L8hwNEi13Bov81EulgC8Xwt9_wCgofwcH49xHoNlKI/export?gid=0&format=csv";

export const parseCsv = (rawText: string): Array<Record<string, any>> =>
  Papa.parse(rawText.trim(), {
    header: true,
    dynamicTyping: true,
  }).data as Record<string, string>[];

export const readCsv = async (filePath: string): Promise<Array<Record<string, any>>> => {
  const rawText = await fs.readFile(filePath, "utf-8");
  return parseCsv(rawText);
};

const fetchUpdateCsv = async (): Promise<Array<any[]>> => {
  const response = await fetch(GSHEET);
  const rawText = await response.text();
  return parseCsv(rawText).map((row) => Object.values(row));
};

/* Inspired by leftJoin from updateMapData.js */
const updateLatLng = (reportData: Array<Record<string, any>>, updateData: Array<any[]>) =>
  reportData.map((reportRow) => {
    const matchingRows = updateData.filter(
      (updateRow) =>
        updateRow[0] === reportRow.city &&
        updateRow[1] === reportRow.state &&
        updateRow[2] === reportRow.country,
    );
    return matchingRows.length > 0
      ? { ...reportRow, lat: matchingRows[0][3], long: matchingRows[0][4] }
      : reportRow;
  });

/* Copied from updateMapData.js */
const shouldCsvQuote = (val: any, columnIndex: number): boolean =>
  typeof val === "string" || typeof val === "boolean" || columnIndex === 0;

const writeResult = async (data: Array<Record<string, any>>, filePath: string): Promise<void> => {
  // Papa doesn't quote null/undefined cells, so we have to manually set them to strings.
  const quotedData = data.map((row) =>
    Object.keys(row).reduce((newRow, key) => {
      // eslint-disable-next-line no-param-reassign
      newRow[key] = row[key] === undefined || row[key] === null ? "" : row[key];
      return newRow;
    }, {}),
  );
  const csv = Papa.unparse(quotedData, { quotes: shouldCsvQuote });
  await fs.writeFile(filePath, csv);
};

const main = async (): Promise<void> => {
  const [updateData, trimmedData, tidiedData] = await Promise.all([
    fetchUpdateCsv(),
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
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
