/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs/promises";

import { $, glob } from "zx";
import { sum } from "lodash-es";
import Papa from "papaparse";

import {
  ProcessedCompleteEntry,
  ProcessedCompleteLandUsePolicy,
  readProcessedCompleteData,
} from "./lib/data";
import { ReformStatus } from "../src/js/model/types";

const DELIMITER = "; ";

function toBoolean(condition: boolean): string {
  return condition ? "TRUE" : "FALSE";
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
  adopted: string;
  proposed: string;
  repealed: string;
} {
  const adopted: any[] = [];
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

    const adoptedPolicySet = determineAnyPolicySet(entry, "adopted");
    const proposedPolicySet = determineAnyPolicySet(entry, "proposed");
    const repealedPolicySet = determineAnyPolicySet(entry, "repealed");

    if (adoptedPolicySet.hasReforms) {
      adopted.push({
        ...initialValues,
        all_minimums_removed: toBoolean(entry.place.repeal),
        ...adoptedPolicySet.csvValues,
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
    adopted: Papa.unparse(adopted),
    proposed: Papa.unparse(proposed),
    repealed: Papa.unparse(repealed),
  };
}

export function createLandUseCsv(
  data: ProcessedCompleteEntry[],
  getter: (
    entry: ProcessedCompleteEntry,
  ) => ProcessedCompleteLandUsePolicy[] | undefined,
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

  const { adopted, proposed, repealed } = createAnyPolicyCsvs(data);
  await writeCsv(adopted, "data/generated/overview_adopted.csv");
  await writeCsv(proposed, "data/generated/overview_proposed.csv");
  await writeCsv(repealed, "data/generated/overview_repealed.csv");

  const addMax = createLandUseCsv(data, (entry) => entry.add_max);
  await writeCsv(addMax, "data/generated/add_maximums.csv");

  const reduceMin = createLandUseCsv(data, (entry) => entry.reduce_min);
  await writeCsv(reduceMin, "data/generated/reduce_minimums.csv");

  const rmMin = createLandUseCsv(data, (entry) => entry.rm_min);
  await writeCsv(rmMin, "data/generated/remove_minimums.csv");

  const files = await glob("data/generated/*");
  await $`zip -j data/generated/mandates-map-data.zip ${files}`;
  console.log("Generated zip at data/generated/mandates-map-data.zip");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
