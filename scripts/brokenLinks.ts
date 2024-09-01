/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fetch from "node-fetch";

import { readCompleteData } from "./lib/data";

export async function mapPageToCitationLinks(): Promise<
  Record<string, string[]>
> {
  const data = await readCompleteData();
  return Object.fromEntries(
    Object.values(data).map((entry) => [
      entry.url.split("/").pop(),
      entry.citations.map((citation) => citation.url),
    ]),
  );
}

async function findDeadLinks(
  links: string[],
): Promise<Array<[string, number]>> {
  const results = await Promise.all(
    links.map(async (link): Promise<[string, number] | null> => {
      // Don't fetch empty links, but still report them.
      if (!link) {
        return [link, 0];
      }
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
  const pageToCitationLinks = await mapPageToCitationLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result: Record<string, Array<[string, number]>> = {};
  for (const [page, links] of Object.entries(pageToCitationLinks)) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks) {
      result[page] = deadLinks;
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
