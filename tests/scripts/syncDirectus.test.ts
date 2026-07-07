import { expect, test } from "@playwright/test";

import { createAttachments } from "../../scripts/syncDirectus";
import { makeAttachmentFileNameArgs } from "./utils";

const filesByAttachmentJunctionId = {
  1: { id: "a", mimeType: "application/pdf" },
  2: { id: "b", mimeType: "application/pdf" },
  3: {
    id: "c",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  4: { id: "d", mimeType: "image/png" },
  5: { id: "e", mimeType: "image/png" },
  6: { id: "f", mimeType: "image/jpeg" },
};

test.describe("createAttachments()", () => {
  test("single attachment and screenshot", () => {
    const simplest = createAttachments(
      filesByAttachmentJunctionId,
      [1, 4],
      makeAttachmentFileNameArgs(),
    );
    expect(simplest).toEqual({
      attachments: [{ fileName: "chicago-il-attachment.pdf", directusId: "a" }],
      screenshots: [{ fileName: "chicago-il-screenshot.png", directusId: "d" }],
    });
  });

  test("multiple citations", () => {
    const multipleCitations = createAttachments(
      filesByAttachmentJunctionId,
      [1, 4],
      makeAttachmentFileNameArgs({ citationIdx: 1 }),
    );
    expect(multipleCitations).toEqual({
      attachments: [
        { fileName: "chicago-il-citation2-attachment.pdf", directusId: "a" },
      ],
      screenshots: [
        { fileName: "chicago-il-citation2-screenshot.png", directusId: "d" },
      ],
    });
  });

  test("multiple attachments and screenshots", () => {
    const multipleAttachments = createAttachments(
      filesByAttachmentJunctionId,
      [2, 3, 5, 6],
      makeAttachmentFileNameArgs(),
    );
    expect(multipleAttachments).toEqual({
      attachments: [
        { fileName: "chicago-il-attachment1.pdf", directusId: "b" },
        { fileName: "chicago-il-attachment2.docx", directusId: "c" },
      ],
      screenshots: [
        { fileName: "chicago-il-screenshot1.png", directusId: "e" },
        { fileName: "chicago-il-screenshot2.jpg", directusId: "f" },
      ],
    });
  });

  test("distinct policy types", () => {
    const distinctPolicyTypes = createAttachments(
      filesByAttachmentJunctionId,
      [1, 4],
      makeAttachmentFileNameArgs({ hasDistinctPolicyTypes: true }),
    );
    expect(distinctPolicyTypes).toEqual({
      attachments: [
        { fileName: "chicago-il-add-max-attachment.pdf", directusId: "a" },
      ],
      screenshots: [
        { fileName: "chicago-il-add-max-screenshot.png", directusId: "d" },
      ],
    });
  });

  test("multiple policy records", () => {
    const multiplePolicyRecords = createAttachments(
      filesByAttachmentJunctionId,
      [1, 4],
      makeAttachmentFileNameArgs({
        policyType: "reduce parking minimums",
        policyRecordIdx: 1,
      }),
    );
    expect(multiplePolicyRecords).toEqual({
      attachments: [
        { fileName: "chicago-il-reduce-min2-attachment.pdf", directusId: "a" },
      ],
      screenshots: [
        { fileName: "chicago-il-reduce-min2-screenshot.png", directusId: "d" },
      ],
    });
  });

  test("distinct policy types, multiple policy records, multiple citations, and multiple attachments", () => {
    const mostComplex = createAttachments(
      filesByAttachmentJunctionId,
      [2, 3, 5, 6],
      makeAttachmentFileNameArgs({
        policyType: "remove parking minimums",
        hasDistinctPolicyTypes: true,
        policyRecordIdx: 1,
        citationIdx: 0,
      }),
    );
    expect(mostComplex).toEqual({
      attachments: [
        {
          fileName: "chicago-il-remove-min2-citation1-attachment1.pdf",
          directusId: "b",
        },
        {
          fileName: "chicago-il-remove-min2-citation1-attachment2.docx",
          directusId: "c",
        },
      ],
      screenshots: [
        {
          fileName: "chicago-il-remove-min2-citation1-screenshot1.png",
          directusId: "e",
        },
        {
          fileName: "chicago-il-remove-min2-citation1-screenshot2.jpg",
          directusId: "f",
        },
      ],
    });
  });
});
