/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";
import path from "path";

import fetch from "node-fetch";
import jsdom from "jsdom";

const parseCitationLinks = async (filePath) => {
  const html = await fs.readFile(filePath, "utf8");
  const dom = new jsdom.JSDOM(html);
  return Array.from(
    dom.window.document.querySelectorAll("dd.col-12.col-sm-8.col-lg-9 a")
  ).map((a) => a.href);
};

const mapCityUrlsToCitationLinks = async () => {
  const folderEntries = await fs.readdir("city_detail");
  const fileNames = folderEntries.filter(
    (entry) => entry !== "attachment_images" && entry.includes(".html")
  );
  const results = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join("city_detail", fileName);
      const cityUrl = `https://parkingreform.org/mandates-map/city_detail/${fileName}`;
      const citationLinks = await parseCitationLinks(filePath);
      return [cityUrl, citationLinks];
    })
  );
  return results.reduce((acc, [cityUrl, links]) => {
    acc[cityUrl] = links;
    return acc;
  }, {});
};

const findDeadLinks = async (links) => {
  const results = await Promise.all(
    links.map(async (link) => {
      // Don't fetch empty links, but still report them.
      if (!link) {
        return [link, -1];
      }
      try {
        const response = await fetch(link, {
          headers: { "User-Agent": "prn-broken-links-finder" },
        });
        if (response.status >= 300) {
          return [link, response.status];
        }
      } catch (error) {
        throw new Error(`Failed to fetch ${link}: ${error.message}`);
      }
      return null;
    })
  );

  return results.filter(Boolean);
};

const main = async () => {
  const cityUrlsToCitationLinks = await mapCityUrlsToCitationLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result = {};
  for (const [cityUrl, links] of Object.entries(cityUrlsToCitationLinks)) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks) {
      result[cityUrl] = deadLinks;
    }
  }

  console.log(result);
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => console.error(error));
}

export { parseCitationLinks };
