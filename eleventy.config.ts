/** Config for Eleventy to generate the details pages. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// @ts-expect-error
import CleanCSS from "clean-css";
import { capitalize } from "lodash-es";
import { compileString as compileStringSass } from "sass";

import {
  type Citation,
  type ProcessedCompleteBenefitDistrict,
  type ProcessedCompleteEntry,
  type ProcessedCompleteLandUsePolicy,
  readProcessedCompleteData,
} from "./scripts/lib/data.js";
import { SAMPLE_PLACES } from "./scripts/lib/samplePlaces.js";
import { generateSEO } from "./scripts/lib/staticPages.js";
import { determinesupplementalPlaceInfo } from "./src/js/model/placeId.js";
import type { ReformStatus } from "./src/js/model/types.js";

function dateLabel(status: ReformStatus): string {
  return (
    {
      adopted: "Adoption date",
      proposed: "Proposal date",
      repealed: "Repeal date",
    }[status] ?? "Reform date"
  );
}

function processCitations(citations: Citation[]): object[] {
  return citations.map((citation) => ({
    urlDomain: citation.url ? new URL(citation.url).hostname : null,
    ...citation,
  }));
}

function processLandUse(policy: ProcessedCompleteLandUsePolicy): object {
  return {
    summary: policy.summary,
    dateLabel: dateLabel(policy.status),
    date: policy.date?.format(),
    status: capitalize(policy.status),
    scope: policy.scope.map(capitalize),
    landUse: policy.land.map(capitalize),
    requirements: policy.requirements.map(capitalize),
    reporter: policy.reporter,
    citations: processCitations(policy.citations),
  };
}

function processBenefitDistrict(
  policy: ProcessedCompleteBenefitDistrict,
): object {
  return {
    summary: policy.summary,
    dateLabel: dateLabel(policy.status),
    date: policy.date?.format(),
    status: capitalize(policy.status),
    reporter: policy.reporter,
    citations: processCitations(policy.citations),
  };
}

/** Filter down to `SAMPLE_PLACES` for a fast `npm test` run rather than
 * generating all ~6400 pages. Filtering here, before the `entries.map()`
 * below, avoids running `generateSEO()`/citation processing for places we
 * are about to discard anyway. */
function filterToSamplePlaces(
  completeData: Record<string, ProcessedCompleteEntry>,
): Array<[string, ProcessedCompleteEntry]> {
  const missing = SAMPLE_PLACES.filter(
    ({ placeId }) => !(placeId in completeData),
  );
  if (missing.length > 0) {
    throw new Error(
      `SAMPLE_PLACES in scripts/lib/samplePlaces.ts references place IDs no longer in the data: ${missing
        .map(({ placeId }) => placeId)
        .join(", ")}`,
    );
  }
  return SAMPLE_PLACES.map(({ placeId }) => [placeId, completeData[placeId]]);
}

export default async function (eleventyConfig: any) {
  eleventyConfig.setLiquidOptions({
    jsTruthy: true,
  });

  // The stylesheet is static and identical for every page, so compile and
  // minify it once here rather than once per generated page.
  const styleScssPath = fileURLToPath(
    new URL("./scripts/11ty/_includes/style.scss", import.meta.url),
  );
  const compiledStyleCss = new CleanCSS({}).minify(
    compileStringSass(readFileSync(styleScssPath, "utf-8")).css,
  ).styles;
  eleventyConfig.addGlobalData("compiledStyleCss", compiledStyleCss);

  const completeData = await readProcessedCompleteData();
  const rawEntries =
    process.env.GEN_HTML_SAMPLE === "true"
      ? filterToSamplePlaces(completeData)
      : Object.entries(completeData);
  const entries = rawEntries.map(([placeId, entry]) => ({
    placeId,
    escapedPlaceId: entry.place.encoded,
    seo: generateSEO(placeId, entry),
    place: {
      name: entry.place.name,
      supplemental: determinesupplementalPlaceInfo(entry.place),
    },
    population: entry.place.pop.toLocaleString("en-us"),
    repeal: entry.place.repeal,
    rmMin: entry.rm_min?.map(processLandUse) || [],
    reduceMin: entry.reduce_min?.map(processLandUse) || [],
    addMax: entry.add_max?.map(processLandUse) || [],
    benefitDistrict: entry.benefit_district?.map(processBenefitDistrict),
  }));

  eleventyConfig.addGlobalData("entries", entries);

  return {
    dir: {
      input: "scripts/11ty",
      output: "city_detail",
    },
  };
}
