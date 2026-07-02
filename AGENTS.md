# AGENTS.md

## Project Overview

This is the **Parking Reform Map**, an interactive web application for the Parking Reform Network (https://parkingreform.org/mandates-map/). It displays parking reform policies across the globe with search, filtering, sorting, a table view, and dedicated HTML pages with details.

The database is stored in Directus and synced nightly to JSON files (`data/*.json`) that the app consumes.

## Tech Stack

- **No frameworks** — vanilla TypeScript for simplicity (not React, Svelte, or Vue)
- **Bundler**: Parcel 2
- **Language**: TypeScript (strict)
- **Styling**: Sass with theme folder
- **Maps**: Leaflet
- **State management**: Reactive stream with custom `Observable` class in src/js/state/Observable.ts
- **Data**: JSON files synced from Directus
- **Static site generation**: 11ty for city detail pages
- **UI components**: Tabulator Tables, Choices.js
- **Testing**: Playwright, including snapshot test
- **Code quality**: ESLint, Prettier, TypeScript compiler

## Key Files & Directories

- `index.html` — Entry point
- `src/js/main.ts` — App initialization, loads JSON data and sets up reactivity
- `src/css/` — Stylesheets (Sass)
- `src/js/layout/` — UI components (icons, popups, headers)
- `src/js/map/` — Map and Leaflet logic
- `src/js/state/` — Reactive state management
- `data/*.json` — Map data
- `scripts/` — Build and data scripts
- `scripts/11ty` - 11ty scripts and templates to build static details pages
- `tests/` — Playwright end-to-end tests

## Development Workflow

### Code quality

- **Format code**: `npm run fmt`
- **Fix issues**: `npm run fix` — Auto-fix linting and format issues
- **Lint**: `npm run lint` — ESLint + Prettier checks
- **Type check**: `npm run check`
- **Test**: `npx playwright test` — Playwright tests

All PRs require passing lint, type checks, and tests.

### Testing

- Usually run with `npx playwright test` because it's faster than `npm test`. Only use `npm test` if you changed the 11ty template or `data/*.json` files so need to regenerate the HTML detail pages.
- Playwright tests start the server. If there are issues starting the server, try `rm -rf .parcel-cache` and retry
- UI features should be manually tested in the browser before merging (dev server at `npm run start`)

## Icons

Refer to README.me for how to use and add icons.

## Styling

- Sass stylesheets in `src/css/`
- Use CSS variables from the theme
- Keep media queries organized for mobile-first design

## Performance

When making changes that majorly impact performance, refer to README.md for how to run the benchmark suite. Use the argument `--out benchmark-results/<file-name>.json` with a useful file name.
