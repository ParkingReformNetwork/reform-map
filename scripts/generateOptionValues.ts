/* eslint-disable no-console */

/// This script regenerate option-values.json by using the data in core.json.
///
/// This already happens automatically in syncDirectus.ts, the main script. This
/// one is only meant to help with iterating on the code so that you can generate
/// the file without having to use Directus.

import { readRawCoreData } from "./lib/data";
import { saveOptionValues } from "./lib/optionValues";

async function main(): Promise<void> {
  const coreData = await readRawCoreData();
  await saveOptionValues(Object.values(coreData));
  process.exit(0);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
