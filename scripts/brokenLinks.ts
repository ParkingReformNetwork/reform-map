/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";
import path from "path";

import fetch from "node-fetch";
import jsdom from "jsdom";

async function parseCitationLinks(filePath: string): Promise<string[]> {
  const html = await fs.readFile(filePath, "utf8");
  const dom = new jsdom.JSDOM(html);
  return Array.from(
    dom.window.document.querySelectorAll<HTMLAnchorElement>(
      "dd.col-12.col-sm-8.col-lg-9 a",
    ),
  ).map((a: HTMLAnchorElement) => a.href);
}

async function mapCityUrlsToCitationLinks(): Promise<Record<string, string[]>> {
  const folderEntries = await fs.readdir("city_detail");
  const fileNames = folderEntries.filter(
    (entry) => entry !== "attachment_images" && entry.includes(".html"),
  );
  const results = await Promise.all(
    fileNames.map(async (fileName): Promise<[string, string[]]> => {
      const filePath = path.join("city_detail", fileName);
      const cityUrl = `https://parkingreform.org/mandates-map/city_detail/${fileName}`;
      const citationLinks = await parseCitationLinks(filePath);
      return [cityUrl, citationLinks];
    }),
  );
  return results.reduce((acc: Record<string, string[]>, [cityUrl, links]) => {
    acc[cityUrl] = links;
    return acc;
  }, {});
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
  const cityUrlsToCitationLinks = await mapCityUrlsToCitationLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result: Record<string, Array<[string, number]>> = {};
  for (const [cityUrl, links] of Object.entries(cityUrlsToCitationLinks)) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks) {
      result[cityUrl] = deadLinks;
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

export { parseCitationLinks };
