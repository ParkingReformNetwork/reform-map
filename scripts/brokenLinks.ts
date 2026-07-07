import fetch from "node-fetch";

import {
  type ExtendedEntry,
  getCitations,
  readRawExtendedData,
} from "./lib/data";
import { DIRECTUS_BASE_URL } from "./lib/paths";
import { runScript } from "./lib/runScript";

// A real browser User-Agent, unlike lib/geocoder.ts's "prn-update-map-data" fetch
// UA, because many sites reject non-browser UAs and would otherwise show up as
// false-positive dead links.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function extractCitationIdAndLinks(
  data: Record<string, ExtendedEntry>,
): Array<[number, string]> {
  return Object.values(data).flatMap((entry) =>
    getCitations(entry)
      .map((citation) => [citation.id, citation.url])
      .filter((pair): pair is [number, string] => pair[1] !== null),
  );
}

export async function readCitationIdAndLinks(): Promise<
  Array<[number, string]>
> {
  const data = await readRawExtendedData();
  return extractCitationIdAndLinks(data);
}

async function findDeadLink(link: string): Promise<number | null> {
  try {
    const response = await fetch(link, {
      method: "HEAD",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
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
  } catch {
    return -1;
  }
  return null;
}

async function main(): Promise<void> {
  const citationIdAndLinks = await readCitationIdAndLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  for (const [i, [id, link]] of citationIdAndLinks.entries()) {
    const deadLinkStatus = await findDeadLink(link);
    if (deadLinkStatus !== null) {
      const directusEntry = `${DIRECTUS_BASE_URL}/admin/content/citations/${id}`;
      console.log(`[${deadLinkStatus}] ${link} (${directusEntry})`);
    }

    if ((i + 1) % 10 === 0) {
      console.error(`Checked ${i + 1}/${citationIdAndLinks.length} citations`);
    }
  }
}

runScript(main);
