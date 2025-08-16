/** Config for Eleventy to generate the details pages. */

// @ts-ignore
import CleanCSS from "clean-css";
import { compileString as compileStringSass } from "sass";
import { capitalize } from "lodash-es";

import {
  Citation,
  ProcessedCompleteBenefitDistrict,
  ProcessedCompleteLandUsePolicy,
  readProcessedCompleteData,
} from "./scripts/lib/data.js";
import {
  determinesupplementalPlaceInfo,
  escapePlaceId,
} from "./src/js/model/placeId.js";
import { ReformStatus } from "./src/js/model/types.js";

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
