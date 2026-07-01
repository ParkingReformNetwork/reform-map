/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type CDPSession } from "playwright";

const PORT = process.env.PORT || "8080";
const BASE_URL = `http://127.0.0.1:${PORT}`;

const MAP_COUNTER = "#map-counter";
const TABLE_COUNTER = "#table-counter";
const TABLE_TOGGLE = ".header-table-icon-container";

// The counters start empty and are populated with text beginning "Showing"
// once the app finishes rendering. See src/js/filter-features/counters.ts.
const COUNTER_READY = (selector: string): boolean => {
  const el = document.querySelector(selector);
  return !!el && (el.textContent ?? "").trim().startsWith("Showing");
};

interface Args {
  runs: number;
  headed: boolean;
  out: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    runs: 5,
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
        `Start it first, e.g.:\n  npm run build\n  npm run serve-dist\n` +
        `(Override the port with the PORT env var.)`,
    );
    process.exit(1);
  }
}

interface RunResult {
  initialLoadMs: number;
  tableLoadMs: number;
  totalBytes: number;
  numPlaces: number;
  // URL -> bytes transferred, for reporting the largest resources.
  resources: Record<string, number>;
}

async function runOnce(browser: Browser): Promise<RunResult> {
  // A fresh context is an isolated, incognito-like session. We also disable the
  // browser cache via CDP so every run is a true cold load -- bundle size counts.
  const context = await browser.newContext();
  const page = await context.newPage();
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
    // `waitUntil: "commit"` returns as soon as navigation commits so our timer
    // spans the full download + parse + render, not just the load event.
    const startInitial = performance.now();
    await page.goto(BASE_URL, { waitUntil: "commit" });
    await page.waitForFunction(COUNTER_READY, MAP_COUNTER, { timeout: 60_000 });
    const initialLoadMs = performance.now() - startInitial;

    const counterText = (await page.locator(MAP_COUNTER).innerText()).trim();
    const match = counterText.match(/\d+/);
    const numPlaces = match ? parseInt(match[0], 10) : 0;

    const startTable = performance.now();
    await page.locator(TABLE_TOGGLE).click();
    await page.waitForFunction(COUNTER_READY, TABLE_COUNTER, {
      timeout: 60_000,
    });
    const tableLoadMs = performance.now() - startTable;

    const totalBytes = Object.values(resources).reduce((a, b) => a + b, 0);

    return { initialLoadMs, tableLoadMs, totalBytes, numPlaces, resources };
  } finally {
    await context.close();
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function summarize(values: number[]): {
  median: number;
  min: number;
  max: number;
} {
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
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
          result.initialLoadMs,
        )}, table ${fmtMs(result.tableLoadMs)}, transfer ${fmtMb(
          result.totalBytes,
        )}`,
      );
    }
  } finally {
    await browser.close();
  }

  const { numPlaces } = runs[0];
  const initial = summarize(runs.map((r) => r.initialLoadMs));
  const table = summarize(runs.map((r) => r.tableLoadMs));
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
  console.log(`Places shown:  ${numPlaces}`);
  console.log(
    `Initial load:  median ${fmtMs(initial.median)} (min ${fmtMs(
      initial.min,
    )}, max ${fmtMs(initial.max)})`,
  );
  console.log(
    `Table load:    median ${fmtMs(table.median)} (min ${fmtMs(
      table.min,
    )}, max ${fmtMs(table.max)})`,
  );
  console.log(
    `Transfer:      median ${fmtMb(transfer.median)} (min ${fmtMb(
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
    summary: {
      initialLoadMs: initial,
      tableLoadMs: table,
      totalBytes: transfer,
    },
    runs: runs.map((r) => ({
      initialLoadMs: r.initialLoadMs,
      tableLoadMs: r.tableLoadMs,
      totalBytes: r.totalBytes,
    })),
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
