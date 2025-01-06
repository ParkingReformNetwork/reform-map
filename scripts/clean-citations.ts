import { deleteItems } from "@directus/sdk";

import { initDirectus, readItemsBatched } from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();

  const citations = await readItemsBatched(client, "citations", ["id"], 500);
  const allIds = citations.map(({ id }) => id);

  const junctionRecords = await readItemsBatched(
    client,
    "policy_records_citations",
    ["citations_id"],
    500,
  );
  const usedIds = new Set(
    junctionRecords.map(({ citations_id }) => citations_id),
  );

  const unusedIds = allIds.filter((id) => !usedIds.has(id));
  await client.request(deleteItems("citations", unusedIds))

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
