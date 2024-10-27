/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fetch from "node-fetch";

import { readCompleteData } from "./lib/data";

export async function mapPlaceToCitationLinks(): Promise<
  Record<string, string[]>
> {
  const data = await readCompleteData();
  return Object.fromEntries(
    Object.entries(data).map(([placeId, entry]) => [
      placeId,
      entry.citations
        .map((citation) => citation.url)
        .filter((url): url is string => url !== null),
    ]),
  );
}

async function findDeadLinks(
  links: string[],
): Promise<Array<[string, number]>> {
  const results = await Promise.all(
    links.map(async (link): Promise<[string, number] | null> => {
      try {
        const response = await fetch(link, {
          method: "HEAD",
          headers: { "User-Agent": "prn-broken-links-finder" },
        });
        if (response.status >= 300) {
          return [link, response.status];
        }
      } catch (error) {
        console.error(`Failed to fetch ${link}: ${(error as Error).message}`);
        return [link, -1];
      }
      return null;
    }),
  );

  return results.filter((x): x is [string, number] => x !== null);
}

async function main(): Promise<void> {
  const placeToCitationLinks = await mapPlaceToCitationLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result: Record<string, Array<[string, number]>> = {};
  for (const [place, links] of Object.entries(placeToCitationLinks)) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks) {
      result[place] = deadLinks;
    }
  }

  console.log(result);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
