/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fetch from "node-fetch";

import { readRawExtendedData, getCitations } from "./lib/data";

export async function readCitationIdAndLinks(): Promise<
  Array<[number, string]>
> {
  const data = await readRawExtendedData();
  return Object.values(data).flatMap((entry) =>
    getCitations(entry)
      .map((citation) => [citation.id, citation.url])
      .filter((pair): pair is [number, string] => pair[1] !== null),
  );
}

async function findDeadLink(link: string): Promise<number | null> {
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
    if (response.status >= 400 && response.status !== 403) {
      return response.status;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return -1;
  }
  return null;
}

async function main(): Promise<void> {
  const citationIdAndLinks = await readCitationIdAndLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  for (const [i, [id, link]] of citationIdAndLinks.entries()) {
    const deadLink = await findDeadLink(link);
    if (deadLink !== null) {
      const directusEntry = `https://mandates-map.directus.app/admin/content/citations/${id}`;
      console.log(`${directusEntry}: ${link}`);
    }

    if ((i + 1) % 10 === 0) {
      console.error(`Checked ${i + 1}/${citationIdAndLinks.length} citations`);
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
