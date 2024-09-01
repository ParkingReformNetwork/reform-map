/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */

import Papa from "papaparse";

export function parseCsv(rawText: string): Array<Record<string, any>> {
  return Papa.parse(rawText.trim(), {
    header: true,
    dynamicTyping: true,
  }).data as Record<string, any>[];
}
