/* eslint-disable no-console */

import { readItem } from "@directus/sdk";

import { initDirectus } from "../../scripts/lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();
  const result = await client.request(readItem("citations", 1));
  console.log(result);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
