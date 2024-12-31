/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import { $, glob } from "zx";
import { sum } from "lodash-es";
import Papa from "papaparse";

import {
  ProcessedCompleteEntry,
  ProcessedCompletePolicy,
  readProcessedCompleteData,
} from "./lib/data";
import { ReformStatus } from "../src/js/types";

const DELIMITER = "; ";

function toBoolean(condition: boolean): string {
  return condition ? "TRUE" : "FALSE";
}

function createLegacyCsv(data: ProcessedCompleteEntry[]): string {
  const entries = data.map((entry) => ({
    place: entry.place.name,
    state: entry.place.state,
    country: entry.place.country,
    place_type: entry.place.type,
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

interface AnyPolicySet {
  hasReforms: boolean;
  csvValues: {
    minimums_removal: string;
    minimums_reduction: string;
    maximums: string;
  };
}

function determineAnyPolicySet(
  entry: ProcessedCompleteEntry,
  status: ReformStatus,
): AnyPolicySet {
  const hasRm =
    entry.rm_min?.some((policy) => policy.status === status) ?? false;
  const hasReduce =
    entry.reduce_min?.some((policy) => policy.status === status) ?? false;
  const hasMax =
    entry.add_max?.some((policy) => policy.status === status) ?? false;
  return {
    hasReforms: hasRm || hasReduce || hasMax,
    csvValues: {
      minimums_removal: toBoolean(hasRm),
      minimums_reduction: toBoolean(hasReduce),
      maximums: toBoolean(hasMax),
    },
  };
}

export function createAnyPolicyCsvs(data: ProcessedCompleteEntry[]): {
  passed: string;
  proposed: string;
  repealed: string;
} {
  const passed: any[] = [];
  const proposed: any[] = [];
  const repealed: any[] = [];
  data.forEach((entry) => {
    const initialValues = {
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      place_type: entry.place.type,
      population: entry.place.pop,
      lat: entry.place.coord[1],
      long: entry.place.coord[0],
    };
    const prnUrl = { prn_url: entry.place.url };

    const passedPolicySet = determineAnyPolicySet(entry, "passed");
    const proposedPolicySet = determineAnyPolicySet(entry, "proposed");
    const repealedPolicySet = determineAnyPolicySet(entry, "repealed");

    if (passedPolicySet.hasReforms) {
      passed.push({
        ...initialValues,
        all_minimums_removed: toBoolean(entry.place.repeal),
        ...passedPolicySet.csvValues,
        ...prnUrl,
      });
    }
    if (proposedPolicySet.hasReforms) {
      proposed.push({
        ...initialValues,
        ...proposedPolicySet.csvValues,
        ...prnUrl,
      });
    }
    if (repealedPolicySet.hasReforms) {
      repealed.push({
        ...initialValues,
        ...repealedPolicySet.csvValues,
        ...prnUrl,
      });
    }
  });

  return {
    passed: Papa.unparse(passed),
    proposed: Papa.unparse(proposed),
    repealed: Papa.unparse(repealed),
  };
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
      place_type: entry.place.type,
      lat: entry.place.coord[1],
      long: entry.place.coord[0],
      all_minimums_removed: toBoolean(entry.place.repeal),
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

async function writeJson(
  data: Record<string, ProcessedCompleteEntry>,
  filePath: string,
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`Generated ${filePath}`);
}

async function main(): Promise<void> {
  const completeData = await readProcessedCompleteData();
  const data = Object.values(completeData);

  await writeJson(completeData, "data/generated/complete-data.json");

  const legacy = createLegacyCsv(data);
  await writeCsv(legacy, "map/data.csv");

  const { passed, proposed, repealed } = createAnyPolicyCsvs(data);
  await writeCsv(passed, "data/generated/overview_passed.csv");
  await writeCsv(proposed, "data/generated/overview_proposed.csv");
  await writeCsv(repealed, "data/generated/overview_repealed.csv");

  const addMax = createReformCsv(data, (entry) => entry.add_max);
  await writeCsv(addMax, "data/generated/add_maximums.csv");

  const reduceMin = createReformCsv(data, (entry) => entry.reduce_min);
  await writeCsv(reduceMin, "data/generated/reduce_minimums.csv");

  const rmMin = createReformCsv(data, (entry) => entry.rm_min);
  await writeCsv(rmMin, "data/generated/remove_minimums.csv");

  const files = await glob("data/generated/*");
  await $`zip -j data/generated/mandates-map-data.zip ${files}`;
  console.log("Generated CSV at data/generated/mandates-map-data.zip");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
