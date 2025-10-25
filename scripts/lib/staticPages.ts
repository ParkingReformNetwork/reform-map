import { determineAllPolicyTypes } from "../../src/js/model/data";
import type { PlaceId, ProcessedCoreEntry } from "../../src/js/model/types";

interface SEO {
  title: string;
  description: string;
}

export function generateSEO(placeId: PlaceId, entry: ProcessedCoreEntry): SEO {
  const adopted = determineAllPolicyTypes(entry, "adopted");
  const proposed = determineAllPolicyTypes(entry, "proposed");
  const repealed = determineAllPolicyTypes(entry, "repealed");

  const listFormatter = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
  let policyDescription: string;
  if (adopted.length) {
    policyDescription = listFormatter.format(
      adopted.map(
        (v) =>
          ({
            "add parking maximums": "added parking maximums",
            "parking benefit district": "created a parking benefit district",
            "remove parking minimums": "removed parking minimums",
            "reduce parking minimums": "reduced parking minimums",
          })[v],
      ),
    );
  } else if (proposed.length) {
    const mapped = proposed.map(
      (v) =>
        ({
          "add parking maximums": "adding parking maximums",
          "parking benefit district": "creating a parking benefit district",
          "remove parking minimums": "removing parking minimums",
          "reduce parking minimums": "reducing parking minimums",
        })[v],
    );
    policyDescription = `proposed ${listFormatter.format(mapped)}`;
  } else if (repealed.length) {
    policyDescription = listFormatter.format(
      repealed.map(
        (v) =>
          ({
            "add parking maximums": "removed parking maximums",
            "parking benefit district":
              "removed their parking benefit district",
            "remove parking minimums": "reinstated parking minimums",
            "reduce parking minimums": "reversed parking minimum reductions",
          })[v],
      ),
    );
  } else {
    throw new Error(`No reforms found for ${placeId}`);
  }

  const description = `${entry.place.name} ${policyDescription}. View zoning code and implementation details.`;
  return {
    title: `Parking reforms in ${placeId} | Parking Reform Network`,
    description,
  };
}
