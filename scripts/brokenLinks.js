/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import fs from "fs/promises";
import path from "path";

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

const findDeadLinks = async (links) => {};

const main = async () => {
  const citiesToLinks = await parseCitiesToLinks();
  //  const citiesToDeadLinks
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => console.error(error));
}

export { parseCityNameAndLinks };
