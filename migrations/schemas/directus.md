# Schemas

## Phase 1: drop Google Tables

The goal is to migrate to Directus without data loss. Changes should be minimal and automated.

### `places` table

| column                   | type                          | migrate from                  | notes                                 |
| ------------------------ | ----------------------------- | ----------------------------- | ------------------------------------- |
| id                       | int                           | n/a                           | automatic                             |
| name                     | string                        | `city`                        |                                       |
| state                    | string?                       | `state/province`              | required unless `type == country`     |
| country_code             | string                        | `country`                     | 2 letters                             |
| type                     | \{city,county,state,country\} | set in migration script       |                                       |
| population               | int                           | `population`                  |                                       |
| complete_minimums_repeal | boolean                       | `highlights` (from `reports`) |                                       |
| coordinates              | point                         | JSON data                     | todo: figure out how to auto-populate |

Dropped fields from Google Tables `cities` table:

- `assigned to`
- `recent`
- `notable`
- `description`
- `strongtowns category`
- `strongtowns summary`

### `legacy_reforms` table

| column           | type        | migrate from                                              | notes                               |
| ---------------- | ----------- | --------------------------------------------------------- | ----------------------------------- |
| id               | int         | n/a                                                       | automatic                           |
| place_id         | foreign key | set in migration script                                   | must be 1 unique place              |
| last_reviewed_at | date?       | n/a                                                       | set to `null` for unverified        |
| policy_changes   | enum[]      | `type`                                                    |                                     |
| land_uses        | enum[]      | `uses`                                                    |                                     |
| reform_scope     | enum[]      | `magnitude`                                               |                                     |
| requirements     | enum[]      | `requirements`                                            |                                     |
| status           | enum        | `status`                                                  |                                     |
| reform_date      | string?     | `date of reform`                                          | `yyyy` or `yyyy-mm` or `yyyy-mm-dd` |
| reporter         | string?     | the person's name; full Contacts table not used in Tables |
| summary          | string      | `summary`                                                 |                                     |
| citations        | citation[]  | set in migration script                                   |                                     |

Dropped fields from Google Tables `reports` table:

- `review notes`
- `notes`
- `verified by`
- `unverifiable claims`
- `obsolete`

### `citations` table

This table will be used by all the reform types because they have the same format of citations. If this proves infeasible over time, we can migrate to other tables.

| column             | type                             |
| ------------------ | -------------------------------- |
| id                 | int                              |
| source_description | string                           |
| type               | \{media report,city code,other\} |
| notes              | string?                          |
| url                | string?                          |
| attachments        | file[]?                          |

No fields dropped from Google Tables.

## Phase 2: distinct reform types

We'll incrementally migrate from `legacy_reforms` to a `policies` table.

A place may have >1 of a specific `policy`, which is necessary to reflect reality accurately. See https://github.com/ParkingReformNetwork/reform-map/issues/552 for how this impacts the web app.

### `policies` table

This is the same as `legacy_reforms`, other than `policy_changes: enum[]` now being `type: enum`.

We use a single table for the three land use reform types to keep things simple. The metadata about each reform is the same, so it's not necessary to have distinct tables. If we need to make major divergences, we can migrate to new tables.

We also add `archived: boolean` so that we can track historical policy records that are no longer active. `sync-directus` ignores these records for now because we don't have a useful way to integrate them in the app; we only want to preserve the metadata so we can possibly do something later with it.

### Migration plan

2400/3200 of our records can be cleanly migrated from `legacy_reforms` to `policies`.

The other 800 have multiple reform types, so they will need to have a distinct `policies` record for each reform type. We will automatically create these records, but set their `last_reviewed_at` as `null`. Then, someone will manually clean up each record and set its `last_reviewed_at`.

During the migration, the app & details pages will only show the places with a single policy or otherwise use the `legacy_reforms`, so that we can still have the assumption that one place == one policy. This means for the 800 places with multiple reforms, their information will be duplicated across `legacy_reforms` and `policies`.

Technically, our 2400/3200 single-policy-type places may actually need >1 `policies` record because there may be >1 of the same reform type, such as two minimum reduction policies. This data should be cleaned up after completely finishing the migration from `legacy_reforms` and the web app can properly support >1 reform per place.

## Post-migration: parking lot map

Store scorecard data for the Parking Lot Map in Directus so that we can connect Mandates Map, Parking Lot Map, and Place Details pages. (GeoJSON stays in PLM repo)

Place Details pages should embed the Parking Lot Map when relevant.

## Post-migration: parking benefit districts

Start tracking this data and figure out how to surface it in the Mandates Map & Place Details pages.

We'll probably use the `policies` table, but we can define a new table if needed.
