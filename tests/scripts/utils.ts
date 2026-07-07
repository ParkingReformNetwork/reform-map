import type { ProcessedCompleteEntry } from "../../scripts/lib/data";
import type { AttachmentFileNameArgs } from "../../scripts/syncDirectus";
import type { RawCoreEntry, RawPlace } from "../../src/js/model/types";
import { makePlace } from "../utils";

export {
  makeEntry,
  makePlace,
  useOsIndependentSnapshots,
} from "../utils";

export function makeRawPlace(overrides: Partial<RawPlace> = {}): RawPlace {
  const { url: _url, ...place } = makePlace();
  return { ...place, ...overrides };
}

export function makeRawCoreEntry(
  overrides: Partial<RawCoreEntry> = {},
): RawCoreEntry {
  return {
    place: makeRawPlace(),
    ...overrides,
  };
}

export function makeCompleteEntry(
  overrides: Partial<ProcessedCompleteEntry> = {},
): ProcessedCompleteEntry {
  return {
    place: makePlace(),
    ...overrides,
  };
}

export function makeAttachmentFileNameArgs(
  overrides: Partial<AttachmentFileNameArgs> = {},
): AttachmentFileNameArgs {
  return {
    placeId: "Chicago, IL",
    policyType: "add parking maximums",
    hasDistinctPolicyTypes: false,
    policyRecordIdx: null,
    citationIdx: null,
    ...overrides,
  };
}

/** Normalize CRLF to LF so snapshots of generated file content are OS-independent. */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}