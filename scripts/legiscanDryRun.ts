/**
 * Read-only comparison of the bills our state legislation tracker still lists
 * as open against what LegiScan reports. Writes nothing to Directus.
 *
 * Follows the LegiScan API crash course: every response is cached to disk,
 * each session's master list and each bill is fetched at most once per run,
 * and the run should not be repeated within an hour.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { runScript } from "./lib/runScript";

const API_URL = "https://api.legiscan.com/";
const OUT_DIR = "legiscan-dry-run";
// Crash course: ~2 requests/second sustained.
const DELAY_MS = 600;

// --------------------------------------------------------------------------
// Input: open bills from the State Parking Legislation Tracking sheet
// --------------------------------------------------------------------------

interface TrackedBill {
  state: string;
  /** Companion bills share a row in the tracker, e.g. "S 3605 / A 4984". */
  numbers: string[];
  /** Legislative session year from the tracker. */
  year: number;
  trackerStatus: string;
  trackerUpdated: string;
}

const TRACKED_BILLS: TrackedBill[] = [
  {
    state: "PA",
    numbers: ["HB 2155"],
    year: 2026,
    trackerStatus: "Pending",
    trackerUpdated: "2026-06-17",
  },
  {
    state: "MI",
    numbers: ["HB 5582"],
    year: 2026,
    trackerStatus: "Pending",
    trackerUpdated: "2026-06-17",
  },
  {
    state: "CT",
    numbers: ["HB 7061"],
    year: 2025,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2025-04-02",
  },
  {
    state: "NC",
    numbers: ["H 765"],
    year: 2025,
    trackerStatus: "Pending",
    trackerUpdated: "2025-05-05",
  },
  {
    state: "NC",
    numbers: ["S 205"],
    year: 2025,
    trackerStatus: "Pending",
    trackerUpdated: "2025-06-11",
  },
  {
    state: "NH",
    numbers: ["HB 382"],
    year: 2025,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2025-05-08",
  },
  {
    state: "MN",
    numbers: ["SF 1268", "HF 1309"],
    year: 2025,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2025-03-20",
  },
  {
    state: "FL",
    numbers: ["HB 943", "SB 1730"],
    year: 2025,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2025-04-10",
  },
  {
    state: "MA",
    numbers: ["H 1572", "S 962"],
    year: 2025,
    trackerStatus: "Pending",
    trackerUpdated: "2025-04-10",
  },
  {
    state: "MA",
    numbers: ["S 1346", "H 2154"],
    year: 2025,
    trackerStatus: "Pending",
    trackerUpdated: "2025-07-14",
  },
  {
    state: "IL",
    numbers: ["HB4638"],
    year: 2024,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2024-03-05",
  },
  {
    state: "ME",
    numbers: ["LD 1976"],
    year: 2023,
    trackerStatus: "Awaiting Governor's Action",
    trackerUpdated: "2023-06-26",
  },
  {
    state: "ME",
    numbers: ["LD 1648"],
    year: 2023,
    trackerStatus: "Pending",
    trackerUpdated: "2023-07-26",
  },
  {
    state: "MA",
    numbers: ["S. 858", "H. 1379"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-08-15",
  },
  {
    state: "MA",
    numbers: ["S.904", "H.1296"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-08-15",
  },
  {
    state: "MA",
    numbers: ["S.2222", "H.3276"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-06-10",
  },
  {
    state: "MA",
    numbers: ["H. 3395"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-08-22",
  },
  {
    state: "MA",
    numbers: ["H. 2061"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-05-16",
  },
  {
    state: "NJ",
    numbers: ["S 3605", "A 4984"],
    year: 2023,
    trackerStatus: "Awaiting Governor's action",
    trackerUpdated: "2023-12-21",
  },
  {
    state: "NC",
    numbers: ["HB 409"],
    year: 2023,
    trackerStatus: "Inactive/Stalled",
    trackerUpdated: "2023-04-26",
  },
  {
    state: "WA",
    numbers: ["HB1351"],
    year: 2024,
    trackerStatus: "Pending",
    trackerUpdated: "2024-01-08",
  },
];

// --------------------------------------------------------------------------
// LegiScan API
// --------------------------------------------------------------------------

interface Session {
  session_id: number;
  year_start: number;
  year_end: number;
  special: number;
  sine_die: number;
  session_name: string;
  dataset_hash: string;
}

interface SessionListResponse {
  sessions: Session[];
}

interface MasterListEntry {
  bill_id: number;
  number: string;
  change_hash: string;
}

interface MasterListRawResponse {
  // Key "0" holds the session; the remaining keys are bills.
  masterlist: Record<
    string,
    Partial<MasterListEntry> & Record<string, unknown>
  >;
}

interface HistoryEntry {
  date: string;
  action: string;
  chamber: string;
}

interface Bill {
  bill_id: number;
  change_hash: string;
  number: string;
  title: string;
  url: string;
  status: number;
  status_date: string;
  session: { session_id: number; session_name: string; sine_die: number };
  history: HistoryEntry[];
}

interface BillResponse {
  bill: Bill;
}

// Status codes per the LegiScan API manual.
const STATUS_NAMES: Record<number, string> = {
  1: "Introduced",
  2: "Engrossed",
  3: "Enrolled",
  4: "Passed",
  5: "Vetoed",
  6: "Failed",
  7: "Override",
  8: "Chaptered",
  9: "Refer",
  10: "Report Pass",
  11: "Report DNP",
  12: "Draft",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class LegiScan {
  queries = 0;

  constructor(private readonly key: string) {}

  async call<T>(op: string, params: Record<string, string>): Promise<T> {
    const url = new URL(API_URL);
    url.searchParams.set("key", this.key);
    url.searchParams.set("op", op);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    this.queries += 1;
    // Never log `url`: it carries the key.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `${op} ${JSON.stringify(params)}: HTTP ${response.status}`,
      );
    }
    const json = (await response.json()) as T & {
      status: string;
      alert?: { message?: string };
    };
    if (json.status !== "OK") {
      throw new Error(
        `${op} ${JSON.stringify(params)}: ${json.alert?.message ?? json.status}`,
      );
    }
    const fileName = `${op}-${Object.values(params).join("-")}.json`;
    await fs.writeFile(
      path.join(OUT_DIR, fileName),
      JSON.stringify(json, null, 2),
    );
    await sleep(DELAY_MS);
    return json;
  }
}

// --------------------------------------------------------------------------
// Bill number matching
// --------------------------------------------------------------------------

/** "S. 858" -> "S858", "HB 0943" -> "HB943". */
function canonicalNumber(number: string): string {
  const compact = number.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/^([A-Z]+)0*(\d+)$/);
  return match ? `${match[1]}${match[2]}` : compact;
}

/** Some states (e.g. Florida) drop the "B": HB943 is H943 in LegiScan. */
function numberAliases(canonical: string): string[] {
  const aliases = [canonical];
  const match = canonical.match(/^([HS])B(\d+)$/);
  if (match) aliases.push(`${match[1]}${match[2]}`);
  return aliases;
}

function pickSession(sessions: Session[], year: number): Session | undefined {
  const regular = sessions.filter(
    (s) => s.special === 0 && s.year_start <= year && year <= s.year_end,
  );
  // Prefer the most recent session if more than one matches.
  return regular.sort((a, b) => b.year_start - a.year_start)[0];
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

interface Result {
  tracked: TrackedBill;
  number: string;
  bill: Bill | undefined;
  session: Session | undefined;
  note: string;
}

function lastAction(bill: Bill): HistoryEntry | undefined {
  return [...bill.history].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function describe(result: Result): string {
  const { tracked, number, bill, session } = result;
  const cells = [
    tracked.state,
    number,
    `${tracked.trackerStatus} (${tracked.trackerUpdated})`,
  ];
  if (!bill) {
    cells.push(
      "not found",
      "",
      "",
      session?.session_name ?? "no session",
      result.note,
    );
    return `| ${cells.join(" | ")} |`;
  }
  const action = lastAction(bill);
  cells.push(
    `${bill.status} ${STATUS_NAMES[bill.status] ?? "?"} (${bill.status_date})`,
    action ? `${action.date} ${action.action}` : "",
    bill.session.sine_die ? "yes" : "no",
    bill.session.session_name,
    result.note,
  );
  return `| ${cells.join(" | ")} |`;
}

function noteFor(tracked: TrackedBill, bill: Bill | undefined): string {
  if (!bill) return "check bill number";
  const open = /pend|await/i.test(tracked.trackerStatus);
  if (bill.status >= 4 && bill.status <= 8) {
    return `tracker says open, LegiScan says ${STATUS_NAMES[bill.status]}`;
  }
  if (open && bill.session.sine_die) {
    return "session ended; tracker still open";
  }
  return "";
}

async function main(): Promise<void> {
  const key = process.env.LEGISCAN_API_KEY;
  if (!key) throw new Error("LEGISCAN_API_KEY is not set");
  await fs.mkdir(OUT_DIR, { recursive: true });
  const api = new LegiScan(key);

  // One getSessionList per state (crash course: daily at most).
  const sessionsByState = new Map<string, Session[]>();
  for (const state of new Set(TRACKED_BILLS.map((b) => b.state))) {
    const { sessions } = await api.call<SessionListResponse>("getSessionList", {
      state,
    });
    sessionsByState.set(state, sessions);
  }

  // One getMasterListRaw per session (crash course: hourly at most).
  const masterLists = new Map<number, Map<string, MasterListEntry>>();
  async function masterList(
    session: Session,
  ): Promise<Map<string, MasterListEntry>> {
    const cached = masterLists.get(session.session_id);
    if (cached) return cached;
    const { masterlist } = await api.call<MasterListRawResponse>(
      "getMasterListRaw",
      { id: String(session.session_id) },
    );
    const byNumber = new Map<string, MasterListEntry>();
    for (const entry of Object.values(masterlist)) {
      if (
        typeof entry.bill_id === "number" &&
        typeof entry.number === "string"
      ) {
        byNumber.set(canonicalNumber(entry.number), entry as MasterListEntry);
      }
    }
    masterLists.set(session.session_id, byNumber);
    return byNumber;
  }

  const results: Result[] = [];
  for (const tracked of TRACKED_BILLS) {
    const session = pickSession(
      sessionsByState.get(tracked.state) ?? [],
      tracked.year,
    );
    for (const number of tracked.numbers) {
      let bill: Bill | undefined;
      if (session) {
        const list = await masterList(session);
        const entry = numberAliases(canonicalNumber(number))
          .map((alias) => list.get(alias))
          .find((e) => e !== undefined);
        if (entry) {
          // One getBill per bill (crash course: every 3 hours at most).
          ({ bill } = await api.call<BillResponse>("getBill", {
            id: String(entry.bill_id),
          }));
        }
      }
      results.push({
        tracked,
        number,
        bill,
        session,
        note: noteFor(tracked, bill),
      });
    }
  }

  console.log(
    "| State | Bill | Tracker | LegiScan status | Last action | Sine die | Session | Note |",
  );
  console.log("|---|---|---|---|---|---|---|---|");
  for (const result of results) console.log(describe(result));

  const found = results.filter((r) => r.bill).length;
  console.log(
    `\n${found}/${results.length} bills matched. ${api.queries} LegiScan queries used. Raw responses in ${OUT_DIR}/.`,
  );
}

runScript(main);
