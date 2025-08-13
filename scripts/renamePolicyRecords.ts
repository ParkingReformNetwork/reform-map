import { createItems } from "@directus/sdk";

import {
  DirectusClient,
  initDirectus,
  LandUseRecord,
  readItemsBatched,
} from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();

  const legacyRecords = await readLegacyRecords(client);
  const citationIdsByLegacyJunctionId =
    await readCitationIdsByLegacyJunctionId(client);

  // Normally, legacyRecords stores in the `citations` values the junction IDs from the table
  // policy_records_citations. Instead, here, we replace those junction IDs with the actual IDs
  // of the citations. This will be helpful later for us to set up the land_use_citations
  // junction table.
  const legacyRecordsWithCitationIds = legacyRecords.map((record) => ({
    ...record,
    citations:
      record.citations?.map(
        (junctionId) => citationIdsByLegacyJunctionId[junctionId],
      ) ?? [],
  }));

  await populate(client, legacyRecordsWithCitationIds);
  process.exit(0);
}

async function readLegacyRecords(
  client: DirectusClient,
): Promise<Array<Partial<LandUseRecord>>> {
  return readItemsBatched(
    client,
    "policy_records",
    [
      "id",
      "place",
      "archived",
      "last_verified_at",
      "type",
      "land_uses",
      "reform_scope",
      "requirements",
      "status",
      "summary",
      "reporter",
      "reform_date",
      "citations",
    ],
    100,
  );
}

async function readCitationIdsByLegacyJunctionId(
  client: DirectusClient,
): Promise<Record<number, number>> {
  const junctionRecords = await readItemsBatched(
    client,
    "policy_records_citations",
    ["id", "citations_id"],
    300,
  );
  return Object.fromEntries(
    junctionRecords.map((record) => [record.id, record.citations_id]),
  );
}

async function populate(
  client: DirectusClient,
  legacyRecordsWithCitationIds: Array<Partial<LandUseRecord>>,
): Promise<void> {
  const result = await client.request(
    createItems(
      "land_use",
      // We turn off citations for this first step because the junction table will
      // still be empty.
      legacyRecordsWithCitationIds.map((row) => ({ ...row, citations: [] })),
      { fields: ["id"] },
    ),
  );

  // Now, associate the land_use IDs with the citation IDs so that we can populate
  // the junction table land_use_citations. Note that we rely on Directus returning the
  // IDs in the insertion order we used for the request.
  const landUseIds = result.map((row) => row.id);
  const idPairs = legacyRecordsWithCitationIds.flatMap((legacy, idx) =>
    (legacy.citations ?? []).map((citationId) => ({
      citations_id: citationId,
      land_use_id: landUseIds.at(idx)!,
    })),
  );
  await client.request(
    createItems("land_use_citations", idPairs, { fields: [] }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
