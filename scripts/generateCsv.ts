/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import { sum } from "lodash-es";
import Papa from "papaparse";

import {
  ProcessedCompleteEntry,
  ProcessedCompletePolicy,
  readProcessedCompleteData,
} from "./lib/data";

const DELIMITER = "; ";

function toBoolean(condition: boolean): string {
  return condition ? "TRUE" : "FALSE";
}

function createLegacyCsv(data: ProcessedCompleteEntry[]): string {
  const entries = data.map((entry) => ({
    place: entry.place.name,
    state: entry.place.state,
    country: entry.place.country,
    all_minimums_repealed: toBoolean(entry.place.repeal),
    status: entry.unifiedPolicy.status,
    policy_change: entry.unifiedPolicy.policy,
    scope: entry.unifiedPolicy.scope,
    land_uses: entry.unifiedPolicy.land,
    reform_date: entry.unifiedPolicy.date?.raw,
    population: entry.place.pop,
    lat: entry.place.coord[1],
    long: entry.place.coord[0],
    url: entry.place.url,
    reporter: entry.unifiedPolicy.reporter,
    summary: entry.unifiedPolicy.summary,
  }));
  const csv = Papa.unparse(entries);

  // Validate expected number of entries.
  const numJson = data.length;
  const numCsv = csv.split("\r\n").length - 1;
  if (numJson !== numCsv) {
    throw new Error(`CSV has unequal entries to JSON: ${numCsv} vs ${numJson}`);
  }

  return csv;
}

export function createAnyPolicyCsv(data: ProcessedCompleteEntry[]): string {
  const entries = data.map((entry) => ({
    place: entry.place.name,
    state: entry.place.state,
    country: entry.place.country,
    population: entry.place.pop,
    lat: entry.place.coord[1],
    long: entry.place.coord[0],
    all_minimums_repealed: toBoolean(entry.place.repeal),
    has_minimums_repeal: toBoolean(!!entry.rm_min?.length),
    has_minimums_reduction: toBoolean(!!entry.reduce_min?.length),
    has_maximums: toBoolean(!!entry.add_max?.length),
    prn_url: entry.place.url,
  }));
  const csv = Papa.unparse(entries);

  // Validate expected number of entries.
  const numJson = data.length;
  const numCsv = csv.split("\r\n").length - 1;
  if (numJson !== numCsv) {
    throw new Error(`CSV has unequal entries to JSON: ${numCsv} vs ${numJson}`);
  }

  return csv;
}

export function createReformCsv(
  data: ProcessedCompleteEntry[],
  getter: (
    entry: ProcessedCompleteEntry,
  ) => ProcessedCompletePolicy[] | undefined,
): string {
  const entries = data.flatMap((entry) => {
    const policies = getter(entry);
    if (!policies) return [];
    return policies.map((policy) => ({
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      population: entry.place.pop,
      lat: entry.place.coord[1],
      long: entry.place.coord[0],
      all_minimums_repealed: toBoolean(entry.place.repeal),
      status: policy.status,
      reform_date: policy.date?.raw,
      scope: policy.scope.join(DELIMITER),
      land_uses: policy.land.join(DELIMITER),
      requirements: policy.requirements.join(DELIMITER),
      summary: policy.summary,
      num_citations: policy.citations.length,
      reporter: policy.reporter,
      prn_url: entry.place.url,
    }));
  });
  const csv = Papa.unparse(entries);

  // Validate expected number of entries (total # of matching policy records).
  const numJson = sum(data.flatMap((entry) => getter(entry)?.length ?? 0));
  const numCsv = csv.split("\r\n").length - 1;
  if (numJson !== numCsv) {
    throw new Error(`CSV has unequal entries to JSON: ${numCsv} vs ${numJson}`);
  }

  return csv;
}

async function writeCsv(csv: string, filePath: string): Promise<void> {
  await fs.writeFile(filePath, csv);
  console.log(`Generated CSV at ${filePath}`);
}

async function main(): Promise<void> {
  const completeData = await readProcessedCompleteData();
  const data = Object.values(completeData);

  const legacy = createLegacyCsv(data);
  await writeCsv(legacy, "map/data.csv");

  const anyPolicy = createAnyPolicyCsv(data);
  await writeCsv(anyPolicy, "data/csv/any_parking_reform.csv");

  const addMax = createReformCsv(data, (entry) => entry.add_max);
  await writeCsv(addMax, "data/csv/add_maximums.csv");

  const reduceMin = createReformCsv(data, (entry) => entry.reduce_min);
  await writeCsv(reduceMin, "data/csv/reduce_minimums.csv");

  const rmMin = createReformCsv(data, (entry) => entry.rm_min);
  await writeCsv(rmMin, "data/csv/remove_minimums.csv");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
