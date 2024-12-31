import { updateItems } from "@directus/sdk";

import { initDirectus, readItemsBatched } from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();

  const legacyImplemented = await readItemsBatched(
    client,
    "legacy_reforms",
    ["id"],
    500,
    { status: { _eq: "implemented" } },
  );
  await client.request(
    updateItems(
      "legacy_reforms",
      legacyImplemented.map(({ id }) => id),
      { status: "passed" },
    ),
  );

  const legacyPlanned = await readItemsBatched(
    client,
    "legacy_reforms",
    ["id"],
    500,
    { status: { _eq: "planned" } },
  );
  await client.request(
    updateItems(
      "legacy_reforms",
      legacyPlanned.map(({ id }) => id),
      { status: "proposed" },
    ),
  );

  const newImplemented = await readItemsBatched(
    client,
    "policy_records",
    ["id"],
    500,
    { status: { _eq: "implemented" } },
  );
  await client.request(
    updateItems(
      "policy_records",
      newImplemented.map(({ id }) => id),
      { status: "passed" },
    ),
  );

  const newPlanned = await readItemsBatched(
    client,
    "policy_records",
    ["id"],
    500,
    { status: { _eq: "planned" } },
  );
  await client.request(
    updateItems(
      "policy_records",
      newPlanned.map(({ id }) => id),
      { status: "proposed" },
    ),
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
