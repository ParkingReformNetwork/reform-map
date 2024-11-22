/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */

import {
  createDirectus,
  rest,
  authentication,
  DirectusClient as DirectusClientUntyped,
  RestClient,
  readFiles,
  uploadFiles,
} from "@directus/sdk";

import { ReformStatus } from "../../src/js/types.js";
import { CitationType } from "../../scripts/lib/data.js";

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
  last_verified_at: "datetime" | null;
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

// ------------------------------------------------------------------------------
// Files migration
// ------------------------------------------------------------------------------

export const CITATIONS_FILES_FOLDER = "f085de08-b747-4251-973d-1752ccc29649";

/** Return mapping of filename -> Directus ID. */
export async function getUploadedFiles(
  client: DirectusClient,
): Promise<Record<string, string>> {
  const result = await client.request(
    readFiles({
      filter: { folder: { _eq: CITATIONS_FILES_FOLDER } },
      fields: ["id", "title"],
      limit: -1,
    }),
  );
  return Object.fromEntries(result.map((entry) => [entry.title, entry.id]));
}

export async function uploadFile(
  client: DirectusClient,
  fileName: string,
  blob: Buffer,
): Promise<string> {
  const formData = new FormData();
  const fileExtension = fileName.split(".").at(-1)!;
  const mime = {
    jpg: "image/jpeg",
    png: "image/png",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pdf: "application/pdf",
  }[fileExtension];
  if (!mime)
    throw new Error(`The file ${fileName} had an unexpected file extension`);
  formData.append("title", fileName);
  formData.append("filename_download", fileName);
  formData.append("folder", CITATIONS_FILES_FOLDER);
  formData.append("file", new Blob([blob], { type: mime }));
  const result = await client.request(
    uploadFiles(formData, { fields: ["id"] }),
  );
  return result.id;
}
