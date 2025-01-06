/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */

import {
  createDirectus,
  rest,
  authentication,
  DirectusClient as DirectusClientUntyped,
  RestClient,
  RegularCollections,
  CollectionType,
  ReadItemOutput,
  readItems,
  readFiles,
  ReadFileOutput,
  DirectusFile,
  IfAny,
  QueryFilter,
} from "@directus/sdk";

import {
  PlaceType,
  PolicyType,
  ReformStatus,
} from "../../src/js/model/types.js";

export const CITATIONS_FILES_FOLDER = "f085de08-b747-4251-973d-1752ccc29649";

// ------------------------------------------------------------------------------
// Generic types
// ------------------------------------------------------------------------------

interface Metadata {
  id: number;
  user_created: string;
  date_created: "datetime";
  user_updated: string;
  date_updated: "datetime";
}

interface Coordinates {
  type: "Point";
  coordinates: [number, number];
}

// ------------------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------------------

export interface Schema {
  places: Place[];
  citations: Citation[];
  policy_records: PolicyRecord[];
  citations_files: CitationsFileJunction[];
  policy_records_citations: PolicyRecordCitationJunction[];
}

export type Place = {
  name: string;
  state: string | null;
  country_code: string;
  type: PlaceType;
  population: number;
  complete_minimums_repeal: boolean;
  coordinates: Coordinates | null;
} & Metadata;

type CitationType = "city code" | "media report" | "other";

export type Citation = {
  type: CitationType;
  source_description: string;
  notes: string | null;
  url: string | null;
  attachments: number[];
} & Metadata;

export type PolicyRecord = {
  place: number;
  type: PolicyType;
  last_verified_at: string | null;
  land_uses: string[];
  reform_scope: string[];
  requirements: string[];
  status: ReformStatus;
  summary: string;
  reporter: string | null;
  reform_date: string | null;
  citations: number[];
  archived: boolean;
} & Metadata;

export interface CitationsFileJunction {
  id: number;
  citations_id: number;
  directus_files_id: string;
}

export interface PolicyRecordCitationJunction {
  id: number;
  policy_records_id: number;
  citations_id: number;
}

// ------------------------------------------------------------------------------
// Client
// ------------------------------------------------------------------------------

export type DirectusClient = DirectusClientUntyped<Schema> & RestClient<Schema>;

export async function initDirectus(): Promise<DirectusClient> {
  const email = process.env.DIRECTUS_EMAIL;
  if (!email) throw new Error("Must set the env var DIRECTUS_EMAIL");
  delete process.env.DIRECTUS_EMAIL;

  const password = process.env.DIRECTUS_PASSWORD;
  if (!password) throw new Error("Must set the env var DIRECTUS_PASSWORD");
  delete process.env.DIRECTUS_PASSWORD;

  const client = createDirectus("https://mandates-map.directus.app")
    .with(rest())
    .with(authentication());
  await client.login(email, password);
  return client;
}

export async function readItemsBatched<
  Collection extends RegularCollections<Schema>,
  Fields extends (keyof CollectionType<Schema, Collection> & string)[],
>(
  client: DirectusClient,
  collection: Collection,
  fields: Fields,
  batchSize: number = 100,
  filter:
    | IfAny<
        Schema,
        Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
        QueryFilter<Schema, CollectionType<Schema, Collection>>
      >
    | undefined = undefined,
): Promise<ReadItemOutput<Schema, Collection, { fields: Fields }>[]> {
  const allItems = [];
  let offset = 0;
  while (true) {
    console.log(
      `Getting '${collection}' records ${offset}-${offset + batchSize}`,
    );
    const batch = await client.request(
      readItems(collection, {
        fields,
        limit: batchSize,
        offset,
        ...(filter && { filter }),
      }),
    );

    allItems.push(...batch);
    if (batch.length < batchSize) {
      break;
    } else {
      offset += batchSize;
    }
  }
  return allItems;
}

export async function readCitationsFilesBatched<
  Fields extends (keyof DirectusFile<Schema> & string)[],
>(
  client: DirectusClient,
  fields: Fields,
  batchSize: number = 100,
): Promise<ReadFileOutput<Schema, { fields: Fields }>[]> {
  const allItems = [];
  let offset = 0;
  while (true) {
    console.log(
      `Getting 'directus_files' records ${offset}-${offset + batchSize}`,
    );
    const batch = await client.request(
      readFiles({
        fields,
        filter: { folder: { _eq: CITATIONS_FILES_FOLDER } },
        limit: batchSize,
        offset,
      }),
    );

    allItems.push(...batch);
    if (batch.length < batchSize) {
      break;
    } else {
      offset += batchSize;
    }
  }
  return allItems;
}
