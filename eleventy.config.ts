/** Config for Eleventy to generate the details pages. */

// @ts-ignore
import CleanCSS from "clean-css";
import { compileString as compileStringSass } from "sass";
import { capitalize } from "lodash-es";

import {
  ProcessedCompletePolicy,
  readProcessedCompleteData,
} from "./scripts/lib/data.js";
import { escapePlaceId } from "./src/js/data.js";

function processPolicyRecord(policy: ProcessedCompletePolicy): object {
  return {
    summary: policy.summary,
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
  const legacy: object[] = [];
  const revamp: object[] = [];
  Object.entries(completeData).forEach(([placeId, entry]) => {
    const common = {
      placeId,
      escapedPlaceId: escapePlaceId(placeId),
      population: entry.place.pop.toLocaleString("en-us"),
    };
    if (
      entry.add_max?.length ||
      entry.reduce_min?.length ||
      entry.rm_min?.length
    ) {
      revamp.push({
        ...common,
        rmMin: entry.rm_min?.map(processPolicyRecord) || [],
        reduceMin: entry.reduce_min?.map(processPolicyRecord) || [],
        addMax: entry.add_max?.map(processPolicyRecord) || [],
      });
    } else {
      legacy.push({
        ...common,
        ...processPolicyRecord(entry.unifiedPolicy),
        policyChange: entry.unifiedPolicy.policy,
      });
    }
  });

  eleventyConfig.addGlobalData("legacyEntries", legacy);
  eleventyConfig.addGlobalData("entries", revamp);

  return {
    dir: {
      input: "scripts/11ty",
      output: "city_detail",
    },
  };
}
