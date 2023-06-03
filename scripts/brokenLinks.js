/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import fs from "fs/promises";
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

export { parseCityNameAndLinks };
