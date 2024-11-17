import fs from "fs/promises";

import { expect, test } from "@playwright/test";

import { normalizeAttachments } from "../../scripts/syncExtendedData";
import { readExtendedData } from "../../scripts/lib/data";

test("normalizeAttachments() converts string entries into objects", () => {
  expect(normalizeAttachments("", 1, "My City, AZ")).toEqual([]);

  expect(
    normalizeAttachments("https://prn.org/photo1.png", 1, "My City, AZ"),
  ).toEqual([
    {
      url: "https://prn.org/photo1.png",
      fileName: "MyCity_AZ_1_1.png",
      isDoc: false,
      directusId: "TODO",
    },
  ]);

  expect(
    normalizeAttachments(
      "https://prn.org/doc1.pdf https://prn.org/img2.jpg",
      2,
      "My City, AZ",
    ),
  ).toEqual([
    {
      url: "https://prn.org/doc1.pdf",
      fileName: "MyCity_AZ_2_1.pdf",
      isDoc: true,
      directusId: "TODO",
    },
    {
      url: "https://prn.org/img2.jpg",
      fileName: "MyCity_AZ_2_2.jpg",
      isDoc: false,
      directusId: "TODO",
    },
  ]);
});

test("every attachment file exists", async () => {
  const extendedData = await readExtendedData();
  const attachmentFileNames = Object.values(extendedData).flatMap((entry) =>
    entry.citations.flatMap((citation) =>
      citation.attachments.map((attachment) => attachment.fileName),
    ),
  );
  const dirEntries = await fs.readdir("city_detail/attachment_images");
  const dirEntriesSet = new Set(dirEntries);
  const missingFiles = attachmentFileNames.filter(
    (fp) => !dirEntriesSet.has(fp),
  );
  expect(missingFiles).toEqual([]);
});
