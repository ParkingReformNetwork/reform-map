# Tables Schema

https://tables.area120.google.com/u/2/workspace/8NG_95pXoTN4sXMROi9k1b/table/8-3SYQkRuQMcD9ews42_MY

## City table

| column               | type             | notes                                                        |
| -------------------- | ---------------- | ------------------------------------------------------------ |
| id                   | int              | automatic                                                    |
| city                 | string           |                                                              |
| state/province       | string?          | usually 2 letters                                            |
| country              | string           | 2 letters                                                    |
| population           | string           |                                                              |
| reports              | reports->summary | sometimes unset, which means the place is ignored in our app |
| assigned to          | person[]         | only for editors                                             |
| updated              | date             | automatic                                                    |
| recent               | boolean          | unused                                                       |
| notable              | boolean          | unused                                                       |
| description          | string?          | unused                                                       |
| strongtowns category | string?          | unused                                                       |
| strongtowns summary  | string?          | unused                                                       |

## Report table

| column              | type     | notes                        |
| ------------------- | -------- | ---------------------------- |
| ReportId            | int      | automatic                    |
| date of reform      | date?    |                              |
| type                | enum[]   |                              |
| uses                | enum[]   |                              |
| magnitude           | enum[]   |                              |
| requirements        | enum[]?  |                              |
| status              | enum     |                              |
| highlights          | enum?    | only option is "No Mandates" |
| summary             | string   |                              |
| reporter            | string   |                              |
| policy contact      | string?  | unused                       |
| review notes        | string?  | only for editors - unused?   |
| notes               | string?  | only for editors - unused?   |
| verified by         | person[] | only for editors             |
| unverifiable claims | string   | only for editors - unused?   |
| last updated        | date     | automatic                    |
| created time        | date     | automatic                    |
| obsolete            | boolean  | unused                       |

## Citation table

| column             | type                             | notes                    |
| ------------------ | -------------------------------- | ------------------------ |
| CitationId         | int                              | automatic                |
| source description | string?                          | only 2 records are blank |
| type               | \{Media Report,City Code,Other\} |                          |
| notes              | string?                          |                          |
| url                | string?                          |                          |
| attachments        | file[]?                          |                          |

## Contact table

| column       | type    | notes     |
| ------------ | ------- | --------- |
| id           | int     | automatic |
| name         | string  |           |
| email        | string? |           |
| phone        | string? |           |
| organization | string? |           |
| notes        | string? |           |
| city         | string? |           |
| state        | string? |           |
| country      | string? |           |
