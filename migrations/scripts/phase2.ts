import { createItems, deleteItems } from "@directus/sdk";
import { zip } from "lodash-es";

import {
  DirectusClient,
  initDirectus,
  LegacyReform,
  PolicyRecord,
  PolicyRecordCitationJunction,
  readItemsBatched,
  Schema,
} from "../../scripts/lib/directus";

const RESET_POLICY_RECORDS = false;
const CREATE_POLICY_RECORDS = false;
const DELETE_LEGACY = true;

async function main(): Promise<void> {
  const client = await initDirectus();

  if (RESET_POLICY_RECORDS) {
    await purge(client, "policy_records_citations");
    await purge(client, "policy_records");
  }

  const legacyReforms = await readLegacyReforms(client);

  if (CREATE_POLICY_RECORDS) {
    await createPolicyRecords(client, legacyReforms);
  }

  if (DELETE_LEGACY) {
    await deleteSinglePolicyLegacyReforms(client, legacyReforms);
  }

  process.exit(0);
}

// These are the citation IDs, not junction IDs.
type LegacyReformWithCitations = Partial<LegacyReform> & {
  citationIds: number[];
};

async function purge(
  client: DirectusClient,
  table: keyof Schema,
): Promise<void> {
  const ids = await readItemsBatched(client, table, ["id"], 500);
  if (!ids.length) return;
  await client.request(
    deleteItems(
      table,
      ids.map((entry) => entry.id),
    ),
  );
  console.log(`purged the table '${table}'`);
}

async function readLegacyReforms(
  client: DirectusClient,
): Promise<LegacyReformWithCitations[]> {
  const reforms = await readItemsBatched(
    client,
    "legacy_reforms",
    [
      "id",
      "place",
      "last_verified_at",
      "policy_changes",
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
  const junctionRecords = await readItemsBatched(
    client,
    "legacy_reforms_citations",
    ["id", "citations_id"],
    300,
  );
  const citationIdsByJunctionIds = Object.fromEntries(
    junctionRecords.map((record) => [record.id, record.citations_id]),
  );
  return reforms.map((entry) => ({
    ...entry,
    citationIds: entry.citations!.map(
      (junctionId) => citationIdsByJunctionIds[junctionId],
    ),
  }));
}

async function createPolicyRecords(
  client: DirectusClient,
  legacyReforms: LegacyReformWithCitations[],
): Promise<void> {
  const policyRecordsToCreate: Array<Partial<PolicyRecord>> =
    legacyReforms.flatMap((entry) => {
      // If >1 policy per place, set lastVerifiedAt to null.
      const lastVerifiedAt =
        entry.policy_changes!.length > 1 ? null : entry.last_verified_at!;
      return entry.policy_changes!.map((policy) => ({
        place: entry.place!,
        last_verified_at: lastVerifiedAt,
        type: policy,
        land_uses: entry.land_uses!,
        reform_scope: entry.reform_scope!,
        requirements: entry.requirements!,
        status: entry.status!,
        summary: entry.summary!,
        reporter: entry.reporter!,
        reform_date: entry.reform_date!,
        citations: [],
      }));
    });
  const policyRecordResult = await client.request(
    createItems("policy_records", policyRecordsToCreate, { fields: ["id"] }),
  );
  console.log("populated policy_records");

  const junctionsToCreate: Array<Partial<PolicyRecordCitationJunction>> = zip(
    legacyReforms.flatMap((legacy) =>
      legacy.policy_changes!.map(() => legacy.citationIds),
    ),
    policyRecordResult,
  ).flatMap(([citationIds, policyRecord]) => {
    if (!citationIds || !policyRecord) throw new Error("zip() failed");
    return citationIds.map((citationId) => ({
      citations_id: citationId,
      policy_records_id: policyRecord.id,
    }));
  });
  await client.request(
    createItems("policy_records_citations", junctionsToCreate, { fields: [] }),
  );
  console.log("populated policy_records_citations");
}

async function deleteSinglePolicyLegacyReforms(
  client: DirectusClient,
  legacyReforms: Array<Partial<LegacyReform>>,
): Promise<void> {
  const singlePolicy = legacyReforms.filter(
    (entry) => entry.policy_changes!.length === 1,
  );
  const reformIds = singlePolicy.map((entry) => entry.id!);
  const junctionIds = singlePolicy.flatMap((entry) => entry.citations!);

  await client.request(deleteItems("legacy_reforms_citations", junctionIds));
  console.log("deleted legacy_reforms_citations for single-policy places");

  await client.request(deleteItems("legacy_reforms", reformIds));
  console.log("deleted legacy_reforms for single-policy places");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
