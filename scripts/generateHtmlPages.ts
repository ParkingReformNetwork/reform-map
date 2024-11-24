/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Handlebars from "handlebars";

import { escapePlaceId } from "../src/js/data";
import { PlaceId } from "../src/js/types";
import { readCompleteData, CompleteEntry } from "./lib/data";

export async function loadTemplate(): Promise<HandlebarsTemplateDelegate> {
  const raw = await fs.readFile("scripts/city_detail.html.handlebars", "utf-8");
  return Handlebars.compile(raw);
}

export function renderHandlebars(
  placeId: string,
  entry: CompleteEntry,
  template: HandlebarsTemplateDelegate,
): string {
  return template({
    placeId,
    summary: entry.legacy.summary,
    status: entry.legacy.status,
    policyChange: entry.legacy.policy.join("; "),
    landUse: entry.legacy.land.join("; "),
    scope: entry.legacy.scope.join("; "),
    requirements: entry.legacy.requirements.join("; "),
    reporter: entry.legacy.reporter,
    citations: entry.legacy.citations.map((citation, i) => ({
      idx: i + 1,
      ...citation,
    })),
  });
}

async function generatePage(
  placeId: string,
  entry: CompleteEntry,
  template: HandlebarsTemplateDelegate,
): Promise<void> {
  await fs.writeFile(
    `city_detail/${escapePlaceId(placeId)}.html`,
    renderHandlebars(placeId, entry, template),
  );
}

async function assertEveryPlaceGenerated(data: Record<PlaceId, CompleteEntry>) {
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
    readCompleteData(),
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
