/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type CDPSession, type Page } from "playwright";

const PORT = process.env.PORT || "8080";
const BASE_URL = `http://127.0.0.1:${PORT}`;

const TABLE_COUNTER = "#table-counter";
const TABLE_TOGGLE = ".header-table-icon-container";
const MAP_TOGGLE = ".header-map-icon-container";
const FILTER_TOGGLE = ".header-filter-icon-container";
const SEARCH_TOGGLE = ".header-search-icon-container";
const POLICY_DROPDOWN = "#filter-policy-type-dropdown";

// The counters start empty and are populated with text beginning "Showing"
// once the app finishes rendering. See src/js/filter-features/counters.ts.
const COUNTER_READY = (selector: string): boolean => {
  const el = document.querySelector(selector);
  return !!el && (el.textContent ?? "").trim().startsWith("Showing");
};

// Instrumentation installed BEFORE the app runs so we can capture two
// app-specific moments on the browser's own clock (relative to navigation
// start, same base as Navigation/Paint/Resource Timing):
//   - counterReady: the counter text turns to "Showing ..." -- i.e. the app's
//     synchronous filter+build work is done and markers have been inserted into
//     the DOM (but not yet painted).
//   - markersPainted: the frame containing those markers has actually painted,
//     which is what the user perceives as "the map is ready". We detect the
//     counter in a requestAnimationFrame (runs before that frame's paint) and
//     then post a MessageChannel task (runs just after that frame's paint).
// Passed to addInitScript as a raw string so tsx/esbuild never transpiles it
// (which would reintroduce the browser-undefined `__name` helper).
const INIT_LOAD_INSTRUMENTATION = `
  window.__bench = { counterReady: null, markersPainted: null };
  (function () {
    function poll() {
      var c = document.querySelector("#map-counter");
      if (c && (c.textContent || "").trim().indexOf("Showing") === 0) {
        window.__bench.counterReady = performance.now();
        var ch = new MessageChannel();
        ch.port1.onmessage = function () {
          window.__bench.markersPainted = performance.now();
        };
        ch.port2.postMessage(0);
        return;
      }
      requestAnimationFrame(poll);
    }
    requestAnimationFrame(poll);
  })();
`;

interface InitialLoadMarks {
  // Cumulative milliseconds from navigation start.
  responseEndMs: number;
  fcpMs: number;
  dataFetchedMs: number;
  dataUrl: string;
  counterReadyMs: number;
  paintedMs: number;
  numPlaces: number;
}

interface Args {
  runs: number;
  headed: boolean;
  out: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    runs: 15,
    headed: false,
    out: path.join("benchmark-results", "latest.json"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--runs") {
      args.runs = parseInt(argv[(i += 1)], 10);
    } else if (arg === "--headed") {
      args.headed = true;
    } else if (arg === "--out") {
      args.out = argv[(i += 1)];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.runs) || args.runs < 1) {
    throw new Error(`--runs must be a positive integer, got: ${args.runs}`);
  }
  return args;
}

async function assertServerReachable(): Promise<void> {
  try {
    const response = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
  } catch (error) {
    console.error(
      `Server not reachable at ${BASE_URL} (${(error as Error).message}).\n` +
        `Start it first, e.g.:\n  pnpm build\n  pnpm serve-dist\n` +
        `(Override the port with the PORT env var.)`,
    );
    process.exit(1);
  }
}

interface RunResult {
  // Initial load broken into cumulative marks from navigation start, so a
  // regression can be attributed to network, first paint, the (dominant) data
  // download, JS build, or marker paint -- rather than a single opaque number.
  initialResponseEndMs: number;
  initialFcpMs: number;
  initialDataFetchedMs: number;
  initialCounterReadyMs: number;
  initialPaintedMs: number;
  tableLoadMs: number;
  // "Ms" fields are time-to-paint (felt latency); "JsMs" fields are the
  // synchronous JS portion only, kept to show how much of the cost is paint.
  filterReduceMinMs: number;
  filterReduceMinJsMs: number;
  filterResetMs: number;
  filterResetJsMs: number;
  searchInitMs: number;
  searchInitJsMs: number;
  totalBytes: number;
  numPlaces: number;
  // URL -> bytes transferred, for reporting the largest resources.
  resources: Record<string, number>;
}

// Change the policy-type dropdown and time how long until the browser has
// actually PAINTED the new dataset -- i.e. what the user perceives.
//
// Runs in-page so the timing isn't polluted by CDP round-trips, and dispatches
// a real `change` event so the app's own listener
// (src/js/filter-features/options.ts) does the work. Observable.notify() runs
// every filter subscriber synchronously, so when `dispatchEvent` returns, all
// the JS is done: markers have been added/removed (Leaflet inserts/removes SVG
// <path> nodes synchronously) and the counter's innerHTML is updated. BUT the
// browser has not yet laid out and painted those thousands of markers -- that
// happens on the next frame. Measuring only to end-of-JS badly understates the
// felt latency. So we wait for the next animation frame (which runs just before
// paint) and then for a macrotask scheduled from within it (which runs just
// after that frame is painted), and stop the clock there.
async function timePolicyChange(
  page: Page,
  targetValue: string,
): Promise<{ jsMs: number; paintedMs: number; newNum: number }> {
  return page.evaluate(
    ({ target, selector }) =>
      new Promise<{ jsMs: number; paintedMs: number; newNum: number }>(
        (resolve) => {
          const counter = document.querySelector("#map-counter")!;
          const select = document.querySelector<HTMLSelectElement>(selector)!;
          const readNum = (): number => {
            const m = (counter.textContent ?? "").match(/\d+/);
            return m ? parseInt(m[0], 10) : 0;
          };

          const start = performance.now();
          select.value = target;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          // All filter subscribers have now run synchronously.
          const jsMs = performance.now() - start;

          requestAnimationFrame(() => {
            // rAF fires before the paint of the frame containing our changes. A
            // MessageChannel task posted from here runs after that paint lands.
            const channel = new MessageChannel();
            channel.port1.onmessage = () => {
              resolve({
                jsMs,
                paintedMs: performance.now() - start,
                newNum: readNum(),
              });
            };
            channel.port2.postMessage(undefined);
          });
        },
      ),
    { target: targetValue, selector: POLICY_DROPDOWN },
  );
}

// Click the search icon and time how long until the Choices.js widget is built
// and PAINTED. Search is initialized lazily (see src/js/search.ts): clicking the
// icon synchronously constructs `new Choices(...)` from ~6,000 places -- the
// single most expensive piece of app JS -- which is why it's kept off the
// initial-load critical path. This measures that deferred cost directly.
//
// Runs in-page (like timePolicyChange) so timing isn't polluted by CDP
// round-trips. `icon.click()` runs the real handler, whose `new Choices(...)`
// builds the widget's DOM synchronously (the `.choices__inner` container), so
// when click() returns all the JS is done. But the browser hasn't laid out and
// painted that DOM yet -- that's the next frame. So, as elsewhere, we wait for
// the next animation frame and then a macrotask posted from within it (which
// runs just after that frame paints) and stop the clock there.
async function timeSearchInit(
  page: Page,
): Promise<{ jsMs: number; paintedMs: number }> {
  return page.evaluate(
    (selector) =>
      new Promise<{ jsMs: number; paintedMs: number }>((resolve, reject) => {
        const icon = document.querySelector<HTMLElement>(selector);
        if (!icon) {
          reject(new Error(`search icon not found: ${selector}`));
          return;
        }

        const start = performance.now();
        icon.click();
        // The click handler has synchronously built Choices.js.
        const jsMs = performance.now() - start;

        if (!document.querySelector(".choices__inner")) {
          reject(new Error("search widget (.choices__inner) was not built"));
          return;
        }

        requestAnimationFrame(() => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            resolve({ jsMs, paintedMs: performance.now() - start });
          };
          channel.port2.postMessage(undefined);
        });
      }),
    SEARCH_TOGGLE,
  );
}

async function runOnce(browser: Browser): Promise<RunResult> {
  // A fresh context is an isolated, incognito-like session. We also disable the
  // browser cache via CDP so every run is a true cold load -- bundle size counts.
  const context = await browser.newContext();
  const page = await context.newPage();

  // tsx transpiles `page.evaluate` callbacks with esbuild's `--keep-names`,
  // which wraps named inner functions in a `__name` helper that only exists at
  // module scope in Node, not in the browser -- so serialized callbacks throw
  // "__name is not defined". Provide a no-op on the page. Passed as a raw string
  // so it isn't itself transpiled (and thus can't reintroduce the reference).
  await page.addInitScript(
    "globalThis.__name = globalThis.__name || function (f) { return f; };",
  );
  await page.addInitScript(INIT_LOAD_INSTRUMENTATION);

  const client: CDPSession = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.clearBrowserCache");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });

  // Accumulate transfer size per resource. `encodedDataLength` is the number of
  // bytes actually received over the wire (post-compression), which is what we
  // care about for load performance.
  const resources: Record<string, number> = {};
  const requestUrls = new Map<string, string>();
  client.on("Network.responseReceived", (event) => {
    requestUrls.set(event.requestId, event.response.url);
  });
  client.on("Network.loadingFinished", (event) => {
    const url = requestUrls.get(event.requestId) ?? event.requestId;
    resources[url] = (resources[url] ?? 0) + event.encodedDataLength;
  });

  try {
    // `waitUntil: "commit"` returns as soon as navigation commits; the in-page
    // instrumentation (installed above, before any app code) records the load
    // marks on the browser's own clock, so we don't measure across the
    // Node<->browser boundary. Wait until the map has actually painted.
    await page.goto(BASE_URL, { waitUntil: "commit" });
    await page.waitForFunction(
      () => {
        const w = window as unknown as {
          __bench: { markersPainted: number | null };
        };
        // eslint-disable-next-line no-underscore-dangle
        return w.__bench.markersPainted != null;
      },
      undefined,
      { timeout: 60_000 },
    );

    // Collect the initial-load marks. Navigation/Paint/Resource Timing and
    // performance.now() all share the same origin (navigation start), so these
    // are directly comparable cumulative offsets. "data fetched" uses the
    // largest resource by transfer size -- the ~3 MB data payload -- without
    // hard-coding its hashed URL.
    const initial: InitialLoadMarks = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const fcp = performance
        .getEntriesByType("paint")
        .find((entry) => entry.name === "first-contentful-paint");
      let largest: PerformanceResourceTiming | undefined;
      for (const entry of performance.getEntriesByType(
        "resource",
      ) as PerformanceResourceTiming[]) {
        if (!largest || entry.transferSize > largest.transferSize) {
          largest = entry;
        }
      }
      const counter = document.querySelector("#map-counter");
      const digits = (counter?.textContent ?? "").match(/\d+/);
      const w = window as unknown as {
        __bench: { counterReady: number; markersPainted: number };
      };
      // eslint-disable-next-line no-underscore-dangle
      const bench = w.__bench;
      return {
        responseEndMs: nav ? nav.responseEnd : 0,
        fcpMs: fcp ? fcp.startTime : 0,
        dataFetchedMs: largest ? largest.responseEnd : 0,
        dataUrl: largest ? largest.name : "",
        counterReadyMs: bench.counterReady,
        paintedMs: bench.markersPainted,
        numPlaces: digits ? parseInt(digits[0], 10) : 0,
      };
    });
    const { numPlaces } = initial;

    const startTable = performance.now();
    await page.locator(TABLE_TOGGLE).click();
    await page.waitForFunction(COUNTER_READY, TABLE_COUNTER, {
      timeout: 60_000,
    });
    const tableLoadMs = performance.now() - startTable;

    // Go back to the map, open the filter, and measure the cost of a filter
    // change: flipping the policy-type dropdown re-filters every place and
    // re-renders all map markers. This isolates the data-change hot path from
    // the noise of the initial resource load.
    await page.locator(MAP_TOGGLE).click();
    await page.locator(FILTER_TOGGLE).click();
    const forward = await timePolicyChange(page, "reduce parking minimums");
    const back = await timePolicyChange(page, "any parking reform");

    // Time the lazily-built search widget (first click constructs Choices.js).
    const search = await timeSearchInit(page);

    const totalBytes = Object.values(resources).reduce((a, b) => a + b, 0);

    return {
      initialResponseEndMs: initial.responseEndMs,
      initialFcpMs: initial.fcpMs,
      initialDataFetchedMs: initial.dataFetchedMs,
      initialCounterReadyMs: initial.counterReadyMs,
      initialPaintedMs: initial.paintedMs,
      tableLoadMs,
      filterReduceMinMs: forward.paintedMs,
      filterReduceMinJsMs: forward.jsMs,
      filterResetMs: back.paintedMs,
      filterResetJsMs: back.jsMs,
      searchInitMs: search.paintedMs,
      searchInitJsMs: search.jsMs,
      totalBytes,
      numPlaces,
      resources,
    };
  } finally {
    await context.close();
  }
}

interface Stat {
  median: number;
  min: number;
  max: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function summarize(values: number[]): Stat {
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

// A high-level task is reported as one overall time plus granular stages that
// sum to it. Rather than repeat a `summarize(runs.map(...))` per metric, we
// describe each task once (how to read its total and each stage from a raw
// RunResult) and drive the JSON, the console summary, and the per-run output off
// this single list.
interface StageDescriptor {
  key: string;
  label: string;
  note?: string;
  value: (r: RunResult) => number;
}

interface TaskDescriptor {
  key: string;
  label: string;
  note?: string;
  total: (r: RunResult) => number;
  stages: StageDescriptor[];
}

interface TaskStat {
  total: Stat;
  stages: Record<string, Stat>;
}

// For the initial load the stages are the wall-clock gaps between consecutive
// milestones (responseEnd -> fcp -> dataFetched -> counterReady -> painted).
// Those milestones are captured as absolute marks on the browser's clock and
// differenced here, so the stages add up exactly to `painted` (the total). The
// interaction tasks split their felt time-to-paint into the synchronous JS
// portion and the remaining paint.
const TASKS: TaskDescriptor[] = [
  {
    key: "initialLoad",
    label: "Initial page load",
    total: (r) => r.initialPaintedMs,
    stages: [
      {
        key: "network",
        label: "network",
        note: "HTML downloaded",
        value: (r) => r.initialResponseEndMs,
      },
      {
        key: "firstPaint",
        label: "first paint",
        note: "first pixels",
        value: (r) => r.initialFcpMs - r.initialResponseEndMs,
      },
      {
        key: "dataFetch",
        label: "data fetch",
        note: "largest resource",
        value: (r) => r.initialDataFetchedMs - r.initialFcpMs,
      },
      {
        key: "jsBuild",
        label: "JS build",
        note: "filter/build",
        value: (r) => r.initialCounterReadyMs - r.initialDataFetchedMs,
      },
      {
        key: "markerPaint",
        label: "marker paint",
        note: "map visible",
        value: (r) => r.initialPaintedMs - r.initialCounterReadyMs,
      },
    ],
  },
  {
    key: "tableView",
    label: "Table view",
    total: (r) => r.tableLoadMs,
    stages: [],
  },
  {
    key: "filterReduceMin",
    label: "Filter → reduce min",
    total: (r) => r.filterReduceMinMs,
    stages: [
      { key: "js", label: "JS", value: (r) => r.filterReduceMinJsMs },
      {
        key: "paint",
        label: "paint",
        value: (r) => r.filterReduceMinMs - r.filterReduceMinJsMs,
      },
    ],
  },
  {
    key: "filterReset",
    label: "Filter → any reform",
    total: (r) => r.filterResetMs,
    stages: [
      { key: "js", label: "JS", value: (r) => r.filterResetJsMs },
      {
        key: "paint",
        label: "paint",
        value: (r) => r.filterResetMs - r.filterResetJsMs,
      },
    ],
  },
  {
    key: "loadSearch",
    label: "Load search",
    note: "first click builds Choices.js",
    total: (r) => r.searchInitMs,
    stages: [
      { key: "js", label: "JS", value: (r) => r.searchInitJsMs },
      {
        key: "paint",
        label: "paint",
        value: (r) => r.searchInitMs - r.searchInitJsMs,
      },
    ],
  },
];

function summarizeTask(task: TaskDescriptor, runs: RunResult[]): TaskStat {
  return {
    total: summarize(runs.map(task.total)),
    stages: Object.fromEntries(
      task.stages.map((stage) => [stage.key, summarize(runs.map(stage.value))]),
    ),
  };
}

// One run reshaped into the same nested { total, stages } shape as the summary.
function runToNested(r: RunResult): Record<string, unknown> {
  const tasks = Object.fromEntries(
    TASKS.map((task) => [
      task.key,
      {
        total: task.total(r),
        stages: Object.fromEntries(
          task.stages.map((stage) => [stage.key, stage.value(r)]),
        ),
      },
    ]),
  );
  return { ...tasks, totalBytes: r.totalBytes };
}

const fmtMs = (ms: number): string => `${ms.toFixed(0)} ms`;
const fmtMb = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  await assertServerReachable();

  console.log(`Benchmarking ${BASE_URL} over ${args.runs} run(s)...\n`);

  const browser = await chromium.launch({ headless: !args.headed });
  const runs: RunResult[] = [];
  try {
    for (let i = 0; i < args.runs; i += 1) {
      const result = await runOnce(browser);
      runs.push(result);
      console.log(
        `Run ${i + 1}/${args.runs}: initial ${fmtMs(
          result.initialPaintedMs,
        )} painted, table ${fmtMs(result.tableLoadMs)}, transfer ${fmtMb(
          result.totalBytes,
        )}`,
      );
    }
  } finally {
    await browser.close();
  }

  const { numPlaces } = runs[0];
  const tasks = Object.fromEntries(
    TASKS.map((task) => [task.key, summarizeTask(task, runs)]),
  );
  const transfer = summarize(runs.map((r) => r.totalBytes));

  // Largest resources, using the run with the median total transfer as
  // representative (it's stable across cold loads).
  const representative = [...runs].sort((a, b) => a.totalBytes - b.totalBytes)[
    Math.floor(runs.length / 2)
  ];
  const largest = Object.entries(representative.resources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(`\n===== Summary =====`);
  console.log(`Places shown: ${numPlaces}\n`);

  // One line per task with its overall time, then its granular stages indented
  // underneath (stages sum to the total).
  for (const task of TASKS) {
    const stat = tasks[task.key];
    const note = task.note ? `  ${task.note}` : "";
    console.log(
      `${task.label.padEnd(20)} median ${fmtMs(stat.total.median)} (min ${fmtMs(
        stat.total.min,
      )}, max ${fmtMs(stat.total.max)})${note}`,
    );
    for (const stage of task.stages) {
      const s = stat.stages[stage.key];
      const stageNote = stage.note ? `  ${stage.note}` : "";
      console.log(
        `  ${stage.label.padEnd(14)}${fmtMs(s.median).padStart(7)}${stageNote}`,
      );
    }
  }

  console.log(
    `\n${"Transfer".padEnd(20)} median ${fmtMb(transfer.median)} (min ${fmtMb(
      transfer.min,
    )}, max ${fmtMb(transfer.max)})`,
  );
  console.log(`\nLargest resources (cold load):`);
  for (const [url, bytes] of largest) {
    const name = url.replace(BASE_URL, "").split("?")[0];
    console.log(`  ${fmtMb(bytes).padStart(9)}  ${name}`);
  }

  const output = {
    timestamp: new Date().toISOString(),
    gitCommit: gitCommit(),
    url: BASE_URL,
    numPlaces,
    tasks,
    transfer,
    runs: runs.map(runToNested),
  };
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\nWrote results to ${args.out}`);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
