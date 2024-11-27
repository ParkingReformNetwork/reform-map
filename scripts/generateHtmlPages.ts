/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Handlebars from "handlebars";

import { escapePlaceId } from "../src/js/data";
import { PlaceId } from "../src/js/types";
import { readProcessedCompleteData, ProcessedCompleteEntry } from "./lib/data";

export async function loadTemplate(): Promise<HandlebarsTemplateDelegate> {
  const raw = await fs.readFile("scripts/city_detail.html.handlebars", "utf-8");
  return Handlebars.compile(raw);
}

export function renderHandlebars(
  placeId: string,
  entry: ProcessedCompleteEntry,
  template: HandlebarsTemplateDelegate,
): string {
  return template({
    placeId,
    summary: entry.unifiedPolicy.summary,
    status: entry.unifiedPolicy.status,
    policyChange: entry.unifiedPolicy.policy.join("; "),
    landUse: entry.unifiedPolicy.land.join("; "),
    scope: entry.unifiedPolicy.scope.join("; "),
    requirements: entry.unifiedPolicy.requirements.join("; "),
    reporter: entry.unifiedPolicy.reporter,
    citations: entry.unifiedPolicy.citations.map((citation, i) => ({
      idx: i + 1,
      ...citation,
    })),
  });
}

async function generatePage(
  placeId: string,
  entry: ProcessedCompleteEntry,
  template: HandlebarsTemplateDelegate,
): Promise<void> {
  await fs.writeFile(
    `city_detail/${escapePlaceId(placeId)}.html`,
    renderHandlebars(placeId, entry, template),
  );
}

async function assertEveryPlaceGenerated(
  data: Record<PlaceId, ProcessedCompleteEntry>,
) {
  const htmlPages = await fs.readdir("city_detail/");
  const validPages = new Set(htmlPages);
  const invalidPlaces = Object.entries(data)
    .filter(([placeId]) => !validPages.has(`${escapePlaceId(placeId)}.html`))
    .map(
      ([, entry]) =>
        `${entry.place.name} ${entry.place.state} ${entry.place.country}`,
    );
  if (invalidPlaces.length) {
    throw new Error(`Some places do not have HTML pages: ${invalidPlaces}`);
  }
}

async function main(): Promise<void> {
  const [template, data] = await Promise.all([
    loadTemplate(),
    readProcessedCompleteData(),
  ]);
  await Promise.all(
    Object.entries(data).map(([placeId, entry]) =>
      generatePage(placeId, entry, template),
    ),
  );
  await assertEveryPlaceGenerated(data);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
