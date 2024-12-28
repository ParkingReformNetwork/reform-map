import { expect, test } from "@playwright/test";

import { createAttachments } from "../../scripts/syncDirectus";

test("createAttachments()", () => {
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

  const simplest = createAttachments(filesByAttachmentJunctionId, [1, 4], {
    placeId: "Chicago, IL",
    policyType: "add parking maximums",
    hasDistinctPolicyTypes: false,
    policyRecordIdx: null,
    citationIdx: null,
  });
  expect(simplest).toEqual({
    attachments: [{ fileName: "chicago-il-attachment.pdf", directusId: "a" }],
    screenshots: [{ fileName: "chicago-il-screenshot.png", directusId: "d" }],
  });

  const multipleCitations = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      policyType: "add parking maximums",
      hasDistinctPolicyTypes: false,
      policyRecordIdx: null,
      citationIdx: 1,
    },
  );
  expect(multipleCitations).toEqual({
    attachments: [
      { fileName: "chicago-il-citation2-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-citation2-screenshot.png", directusId: "d" },
    ],
  });

  const multipleAttachments = createAttachments(
    filesByAttachmentJunctionId,
    [2, 3, 5, 6],
    {
      placeId: "Chicago, IL",
      policyType: "add parking maximums",
      hasDistinctPolicyTypes: false,
      policyRecordIdx: null,
      citationIdx: null,
    },
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

  const distinctPolicyTypes = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      policyType: "add parking maximums",
      hasDistinctPolicyTypes: true,
      policyRecordIdx: null,
      citationIdx: null,
    },
  );
  expect(distinctPolicyTypes).toEqual({
    attachments: [
      { fileName: "chicago-il-add-max-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-add-max-screenshot.png", directusId: "d" },
    ],
  });

  const multiplePolicyRecords = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      policyType: "reduce parking minimums",
      hasDistinctPolicyTypes: false,
      policyRecordIdx: 1,
      citationIdx: null,
    },
  );
  expect(multiplePolicyRecords).toEqual({
    attachments: [
      { fileName: "chicago-il-reduce-min2-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-reduce-min2-screenshot.png", directusId: "d" },
    ],
  });

  const mostComplex = createAttachments(
    filesByAttachmentJunctionId,
    [2, 3, 5, 6],
    {
      placeId: "Chicago, IL",
      policyType: "remove parking minimums",
      hasDistinctPolicyTypes: true,
      policyRecordIdx: 1,
      citationIdx: 0,
    },
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
