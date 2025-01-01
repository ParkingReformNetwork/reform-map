import { updateItem } from "@directus/sdk";

import { initDirectus, readItemsBatched } from "./lib/directus";

function fixScope(arr: string[]): string[] {
  if (arr.includes("transit-oriented")) {
    return arr.filter((v) => v !== "transit oriented");
  }
  return arr.map((v) => (v === "transit oriented" ? "transit-oriented" : v));
}

async function main(): Promise<void> {
  const client = await initDirectus();

  const legacy = await readItemsBatched(
    client,
    "legacy_reforms",
    ["id", "reform_scope"],
    500,
  );
  const legacyUpdated = legacy
    .filter((entry) => entry.reform_scope.includes("transit oriented"))
    .map((entry) => ({
      id: entry.id,
      reform_scope: fixScope(entry.reform_scope),
    }));
  for (const v of legacyUpdated) {
    await client.request(
      updateItem("legacy_reforms", v.id, { reform_scope: v.reform_scope }),
    );
  }

  const revamped = await readItemsBatched(
    client,
    "policy_records",
    ["id", "reform_scope"],
    500,
  );
  const revampedUpdated = revamped
    .filter((entry) => entry.reform_scope.includes("transit oriented"))
    .map((entry) => ({
      id: entry.id,
      reform_scope: fixScope(entry.reform_scope),
    }));
  for (const v of revampedUpdated) {
    await client.request(
      updateItem("policy_records", v.id, { reform_scope: v.reform_scope }),
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
