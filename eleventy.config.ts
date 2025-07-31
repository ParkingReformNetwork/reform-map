/** Config for Eleventy to generate the details pages. */

// @ts-ignore
import CleanCSS from "clean-css";
import { compileString as compileStringSass } from "sass";
import { capitalize } from "lodash-es";

import {
  ProcessedCompleteLandUsePolicy,
  readProcessedCompleteData,
} from "./scripts/lib/data.js";
import { escapePlaceId } from "./src/js/model/data.js";

function processLandUse(policy: ProcessedCompleteLandUsePolicy): object {
  return {
    summary: policy.summary,
    dateLabel:
      {
        adopted: "Adoption date",
        proposed: "Proposal date",
        repealed: "Repeal date",
      }[policy.status] ?? "Reform date",
    date: policy.date?.format(),
    status: capitalize(policy.status),
    scope: policy.scope.map(capitalize),
    landUse: policy.land.map(capitalize),
    requirements: policy.requirements.map(capitalize),
    reporter: policy.reporter,
    citations: policy.citations.map((citation) => ({
      urlDomain: citation.url ? new URL(citation.url).hostname : null,
      ...citation,
    })),
  };
}

export default async function (eleventyConfig: any) {
  eleventyConfig.setLiquidOptions({
    jsTruthy: true,
  });

  eleventyConfig.addFilter(
    "scss_compile",
    (code: any) => compileStringSass(code).css,
  );
  eleventyConfig.addFilter(
    "cssmin",
    (code: any) => new CleanCSS({}).minify(code).styles,
  );

  const completeData = await readProcessedCompleteData();
  const entries = Object.entries(completeData).map(([placeId, entry]) => ({
    placeId,
    escapedPlaceId: escapePlaceId(placeId),
    population: entry.place.pop.toLocaleString("en-us"),
    repeal: entry.place.repeal,
    rmMin: entry.rm_min?.map(processLandUse) || [],
    reduceMin: entry.reduce_min?.map(processLandUse) || [],
    addMax: entry.add_max?.map(processLandUse) || [],
  }));

  eleventyConfig.addGlobalData("entries", entries);

  return {
    dir: {
      input: "scripts/11ty",
      output: "city_detail",
    },
  };
}
