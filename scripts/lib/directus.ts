/* eslint-disable no-use-before-define */

import {
  createDirectus,
  rest,
  authentication,
  DirectusClient,
  RestClient,
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

interface Schema {
  places: Place[];
  citations: Citation[];
  legacy_reforms: LegacyReform[];
  citations_files: CitationsFileJunction[];
  legacy_reforms_citations: LegacyReformCitationJunction[];
}

type Place = {
  name: string;
  state: string | null;
  country_code: string;
  type: "city" | "county" | "state" | "country";
  population: number;
  coordinates: Coordinates | null;
} & Metadata;

type Citation = {
  type: CitationType;
  source_description: string;
  notes: string | null;
  url: string | null;
  attachments: number[] | CitationsFileJunction[];
} & Metadata;

type LegacyReform = {
  place: number | Place;
  last_verified_at: "datetime" | null;
  policy_changes: string[];
  land_uses: string[];
  reform_scope: string[];
  requirements: string[];
  status: ReformStatus;
  summary: string;
  reporter: string;
  reform_date: string | null;
  complete_minimums_repeal: boolean;
  citations: number[] | LegacyReformCitationJunction[];
} & Metadata;

interface CitationsFileJunction {
  id: number;
  citations_id: number | Citation;
  directus_files_id: string;
}

interface LegacyReformCitationJunction {
  id: number;
  legacy_reforms_id: number | LegacyReform;
  citations_id: number | Citation;
}

// ------------------------------------------------------------------------------
// Client
// ------------------------------------------------------------------------------

export async function initDirectus(): Promise<
  DirectusClient<Schema> & RestClient<Schema>
> {
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
