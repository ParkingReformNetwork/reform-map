import { updateItems } from "@directus/sdk";

import { initDirectus, readItemsBatched } from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();

  const legacy = await readItemsBatched(
    client,
    "legacy_reforms",
    ["id"],
    500,
    { status: { _eq: "passed" } },
  );
  await client.request(
    updateItems(
      "legacy_reforms",
      legacy.map(({ id }) => id),
      { status: "adopted" },
    ),
  );

  const policyRecords = await readItemsBatched(
    client,
    "policy_records",
    ["id"],
    500,
    { status: { _eq: "passed" } },
  );
  await client.request(
    updateItems(
      "policy_records",
      policyRecords.map(({ id }) => id),
      { status: "adopted" },
    ),
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});