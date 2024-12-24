/** Config for Eleventy to generate the details pages. */

import { readProcessedCompleteData } from "./scripts/lib/data.js";
import { escapePlaceId } from "./src/js/data.js";

export default async function (eleventyConfig: any) {
  eleventyConfig.setLiquidOptions({
    jsTruthy: true,
  });

  const completeData = await readProcessedCompleteData();
  eleventyConfig.addGlobalData(
    "entries",
    Object.entries(completeData).map(([placeId, entry]) => ({
      placeId,
      escapedPlaceId: escapePlaceId(placeId),
      summary: entry.unifiedPolicy.summary,
      status: entry.unifiedPolicy.status,
      policyChange: entry.unifiedPolicy.policy.join("; "),
      landUse: entry.unifiedPolicy.land.join("; "),
      scope: entry.unifiedPolicy.scope.join("; "),
      requirements: entry.unifiedPolicy.requirements.join("; "),
      reporter: entry.unifiedPolicy.reporter,
      citations: entry.unifiedPolicy.citations,
    })),
  );

  return {
    dir: {
      input: "scripts/11ty",
      output: "city_detail",
    },
  };
}
