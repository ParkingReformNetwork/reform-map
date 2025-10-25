/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fetch from "node-fetch";

import { readRawExtendedData, getCitations } from "./lib/data";
import type { PlaceId } from "../src/js/model/types";

export async function mapPlaceToCitationLinks(): Promise<
  Array<[PlaceId, string[]]>
> {
  const data = await readRawExtendedData();
  return Object.entries(data).map(([placeId, entry]) => [
    placeId,
    getCitations(entry)
      .map((citation) => citation.url)
      .filter((url): url is string => url !== null),
  ]);
}

async function findDeadLinks(
  links: string[],
): Promise<Array<[string, number]>> {
  const results = await Promise.all(
    links.map(async (link): Promise<[string, number] | null> => {
      try {
        const response = await fetch(link, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            DNT: "1",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(5_000),
        });
        // We skip 403 forbidden because they are noisy. The link could be broken, but
        // we have too many false positives to be worth it.
        if (response.status >= 300 && response.status !== 403) {
          return [link, response.status];
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
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
  for (const [i, [place, links]] of placeToCitationLinks.entries()) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks.length) {
      const formatted = deadLinks
        .map(([link, code]) => `${link} (${code})`)
        .join("\n");
      console.log(`${place}:\n${formatted}\n\n`);
    }

    if ((i + 1) % 10 === 0) {
      console.error(`Checked ${i + 1}/${placeToCitationLinks.length} places`);
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
