import { deleteFiles } from "@directus/sdk";

import { initDirectus, readItemsBatched, readCitationsFilesBatched } from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();

  const files = await readCitationsFilesBatched(client, ["id"], 400);
  const allIds = files.map(({ id }) => id);

  const junctionRecords = await readItemsBatched(
    client,
    "citations_files",
    ["directus_files_id"],
    500,
  );
  const usedIds = new Set(
    junctionRecords.map(({ directus_files_id }) => directus_files_id),
  );

  const unusedIds = allIds.filter((id) => !usedIds.has(id));
  await client.request(deleteFiles(unusedIds))

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
