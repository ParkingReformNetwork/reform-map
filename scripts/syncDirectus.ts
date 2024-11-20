/* eslint-disable no-console */

import { readItems, readFiles } from "@directus/sdk";

import { Attachment, Citation } from "./lib/data";
import {
  CITATIONS_FILES_FOLDER,
  initDirectus,
  Citation as DirectusCitation,
} from "./lib/directus";

async function main(): Promise<void> {
  const client = await initDirectus();
  // Idea: map
  //   1. placeStringId -> record
  //   2. id (number) -> placeStringId
  const places = await client.request(
    readItems("places", {
      fields: [
        "id",
        "name",
        "state",
        "country_code",
        "population",
        "coordinates",
      ],
      limit: -1,
    }),
  );
  const legacyReforms = await client.request(
    readItems("legacy_reforms", {
      fields: [
        "id",
        "place",
        "policy_changes",
        "land_uses",
        "reform_scope",
        "requirements",
        "status",
        "summary",
        "reporter",
        "reform_date",
        "complete_minimums_repeal",
        "citations",
      ],
      limit: -1,
    }),
  );
  const citations = await client.request(
    readItems("citations", {
      fields: [
        "id",
        "type",
        "source_description",
        "notes",
        "url",
        "attachments",
      ],
      limit: -1,
    }),
  );

  const rawFiles = await client.request(
    readFiles({
      filter: { folder: { _eq: CITATIONS_FILES_FOLDER } },
      fields: ["id", "type"],
      limit: -1,
    }),
  );
  const fileTypesById = Object.fromEntries(
    rawFiles.map((record) => [record.id, record.type]),
  );

  const legacyReformsCitationsJunctions = await client.request(
    readItems("legacy_reforms_citations", {
      fields: ["id", "citations_id"],
      limit: -1,
    }),
  );

  const rawCitationFileJunctions = await client.request(
    readItems("citations_files", {
      fields: ["id", "directus_files_id"],
      limit: -1,
    }),
  );
  const fileIdsByCitationJunctionId = Object.fromEntries(
    rawCitationFileJunctions.map((record) => [
      record.id,
      record.directus_files_id,
    ]),
  );

  const normalizedCitations = computeCitations(
    citations,
    fileIdsByCitationJunctionId,
    fileTypesById,
  );

  // TODO: maybe invert this because we need the place ID to compute attachment filename
  // 1. Set up every citation by populating attachment data
  // 2. Associate citations to legacyReforms
  // 3. Associate legacyReforms to Places
  // 4. Record the CompleteEntry with PlaceId as the key

  // TODO: deal with missing coordinates. Set up geocoder.ts file to compute coordinates.
  // Get every Place and if the value is missing, update Directus one-by-one (log it)

  console.log(JSON.stringify(normalizedCitations));
  process.exit(0);
}

function computeCitations(
  citations: Array<Partial<DirectusCitation>>,
  fileIdsByCitationJunctionId: Record<number, string>,
  fileTypesById: Record<string, string | null>,
): Record<number, Citation> {
  return Object.fromEntries(
    citations.map((citation) => {
      const attachments: Attachment[] = citation.attachments!.map(
        (citationsFileJunction) => {
          const fileId = fileIdsByCitationJunctionId[citationsFileJunction];
          return {
            directusId: fileId,
            // TODO by using fileTypesById
            isDoc: false,
            // TODO: can't actually compute this without the place ID
            fileName: "TODO",
          };
        },
      );
      return [
        citation.id!,
        {
          description: citation.source_description!,
          type: citation.type!,
          url: citation.url!,
          notes: citation.notes!,
          attachments: attachments,
        },
      ];
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
