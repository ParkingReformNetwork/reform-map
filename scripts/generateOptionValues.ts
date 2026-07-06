/**
 * This script regenerate option-values.json by using the data in core.json.
 *
 * This already happens automatically in syncDirectus.ts, the main script. This
 * one is only meant to help with iterating on the code so that you can generate
 * the file without having to use Directus.
 */

import { readRawCoreData } from "./lib/data";
import { saveOptionValues } from "./lib/optionValues";
import { runScript } from "./lib/runScript";

async function main(): Promise<void> {
  const coreData = await readRawCoreData();
  await saveOptionValues(Object.values(coreData));
  process.exit(0);
}

runScript(main);
