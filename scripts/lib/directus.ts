/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

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
} from "@directus/sdk";

import { ReformStatus } from "../../src/js/types.js";
import { CitationType } from "../../scripts/lib/data.js";

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
  legacy_reforms: LegacyReform[];
  citations_files: CitationsFileJunction[];
  legacy_reforms_citations: LegacyReformCitationJunction[];
}

export type PlaceType = "city" | "county" | "state" | "country";

export type Place = {
  name: string;
  state: string | null;
  country_code: string;
  type: PlaceType;
  population: number;
  complete_minimums_repeal: boolean;
  coordinates: Coordinates | null;
} & Metadata;

export type Citation = {
  type: CitationType;
  source_description: string;
  notes: string | null;
  url: string | null;
  attachments: number[];
} & Metadata;

export type LegacyReform = {
  place: number;
  last_verified_at: string | null;
  policy_changes: string[];
  land_uses: string[];
  reform_scope: string[];
  requirements: string[];
  status: ReformStatus;
  summary: string;
  reporter: string | null;
  reform_date: string | null;
  citations: number[];
} & Metadata;

export interface CitationsFileJunction {
  id: number;
  citations_id: number;
  directus_files_id: string;
}

export interface LegacyReformCitationJunction {
  id: number;
  legacy_reforms_id: number;
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
): Promise<ReadItemOutput<Schema, Collection, { fields: Fields }>[]> {
  const allItems = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    console.log(
      `Getting '${collection}' records ${offset}-${offset + batchSize}`,
    );
    const batch = await client.request(
      readItems(collection, {
        fields,
        limit: batchSize,
        offset,
      }),
    );

    if (Array.isArray(batch)) {
      allItems.push(...batch);
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    } else {
      hasMore = false;
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
  let hasMore = true;
  while (hasMore) {
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

    if (Array.isArray(batch)) {
      allItems.push(...batch);
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    } else {
      hasMore = false;
    }
  }
  return allItems;
}
