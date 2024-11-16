# Schemas

## Phase 1: drop Google Tables

The goal is to migrate to Directus without data loss. Changes should be minimal and automated.

### `places` table

| column       | type                          | migrate from            | notes                                 |
| ------------ | ----------------------------- | ----------------------- | ------------------------------------- |
| id           | int                           | n/a                     | automatic                             |
| name         | string                        | `city`                  |                                       |
| state        | string?                       | `state/province`        | required unless `type == country`     |
| country_code | string                        | `country`               | 2 letters                             |
| type         | \{city,county,state,country\} | set in migration script |                                       |
| population   | int                           | `population`            |                                       |
| coordinates  | point                         | JSON data               | todo: figure out how to auto-populate |

Dropped fields from Google Tables `cities` table:

- `assigned to`
- `recent`
- `notable`
- `description`
- `strongtowns category`
- `strongtowns summary`

### `legacy_reforms` table

| column                   | type        | migrate from                                              | notes                               |
| ------------------------ | ----------- | --------------------------------------------------------- | ----------------------------------- |
| id                       | int         | n/a                                                       | automatic                           |
| place_id                 | foreign key | set in migration script                                   | must be 1 unique place              |
| last_reviewed_at         | date?       | n/a                                                       | set to `null` for unverified        |
| policy_changes           | enum[]      | `type`                                                    |                                     |
| land_uses                | enum[]      | `uses`                                                    |                                     |
| reform_scope             | enum[]      | `magnitude`                                               |                                     |
| requirements             | enum[]      | `requirements`                                            |                                     |
| status                   | enum        | `status`                                                  |                                     |
| reform_date              | string?     | `date of reform`                                          | `yyyy` or `yyyy-mm` or `yyyy-mm-dd` |
| reporter                 | string      | the person's name; full Contacts table not used in Tables |
| complete_minimums_repeal | boolean     | `highlights`                                              |                                     |
| summary                  | string      | `summary`                                                 |                                     |
| citations                | citation[]  | set in migration script                                   |                                     |

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

For now, the expectation is that a place only has up to one of each reform type. That means we cannot yet track pending reforms, for example. This is to simplify the implementation in the app.

### `policies` table

This is the same as `legacy_reforms`, other than `policy_changes: enum[]` now being `type: enum`.

We use a single table for the three land use reform types to keep things simple. The metadata about each reform is the same, so it's not necessary to have distinct tables. If we need to make major divergences, we can migrate to new tables.

### Migration plan

2400/3200 of our records can be cleanly migrated from `legacy_reforms` to `policies`.

The other 800 have multiple reforms, so they will need to have a distinct `policies` record for each reform type. We will automatically create these records, but set their `review_status` as `todo`. Then, someone will manually clean up each record and switch its `review_status` to `reviewed`.

- We do need some type of way to track where a record is at. Probably talk to Sam about how to model. Right now it's hard to say that a record isn't yet ready to go live to the map. Only necessary on policies/legacy_reforms
- double check deletion polices for M2M

## Phase 3: multiple of the same reform types per place

It's now possible to have multiple of each reform type corresponding to a specific place. For example, there may be an existing minimum removals record along with a pending one. We need to track the status of the policy, like `historical | current | proposed`. We should probably reuse the `status` field.

This phase can begin before phase 2 is entirely complete. The main blocker is updating the Mandates Map and Places Details pages.

## Post-migration: parking lot map

Store scorecard data for the Parking Lot Map in Directus so that we can connect Mandates Map, Parking Lot Map, and Place Details pages. (GeoJSON stays in PLM repo)

Place Details pages should embed the Parking Lot Map when relevant.

## Post-migration: parking benefit districts

Start tracking this data and figure out how to surface it in the Mandates Map & Place Details pages.

We'll probably use the `policies` table, but we can define a new table if needed.
