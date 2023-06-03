/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";
import path from "path";

import fetch from "node-fetch";
import jsdom from "jsdom";

const parseCityNameAndLinks = async (filePath) => {
  const html = await fs.readFile(filePath, "utf8");
  const dom = new jsdom.JSDOM(html);
  const cityName =
    dom.window.document.querySelector("h1.display-3").textContent;
  const citationLinks = Array.from(
    dom.window.document.querySelectorAll("dd.col-12.col-sm-8.col-lg-9 a")
  ).map((a) => a.href);
  return [cityName, citationLinks];
};

const parseCitiesToLinks = async () => {
  const folderEntries = await fs.readdir("city_detail");
  const fileNames = folderEntries.filter(
    (entry) => entry !== "attachment_images" && entry.includes(".html")
  );
  const results = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join("city_detail", fileName);
      return parseCityNameAndLinks(filePath);
    })
  );
  return results.reduce((acc, [cityName, links]) => {
    acc[cityName] = links;
    return acc;
  }, {});
};

const findDeadLinks = async (links) => {
  const results = await Promise.all(
    links.map(async (link) => {
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
  const citiesToLinks = await parseCitiesToLinks();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result = {};
  for (const [cityName, links] of Object.entries(citiesToLinks)) {
    const deadLinks = await findDeadLinks(links);
    if (deadLinks) {
      result[cityName] = deadLinks;
    }
  }

  console.log(result);
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => console.error(error));
}

export { parseCityNameAndLinks };
