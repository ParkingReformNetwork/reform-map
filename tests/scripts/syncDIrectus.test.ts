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

  const singleCitationAndFile = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    "Chicago, IL",
    null,
  );
  expect(singleCitationAndFile).toEqual({
    attachments: [{ fileName: "chicago-il-attachment.pdf", directusId: "a" }],
    screenshots: [{ fileName: "chicago-il-screenshot.png", directusId: "d" }],
  });

  const multipleCitations = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    "Chicago, IL",
    1,
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
    "Chicago, IL",
    null,
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
