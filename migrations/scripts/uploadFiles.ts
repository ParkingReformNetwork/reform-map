import fs from "fs/promises";

import {
  initDirectus,
  getUploadedFiles,
  uploadFile,
} from "../../scripts/lib/directus";
import { readExtendedData } from "../../scripts/lib/data";

async function main(): Promise<void> {
  const imagePaths = await fs.readdir("city_detail/attachment_images");

  const client = await initDirectus();
  const fileNameToDirectusIds = await getUploadedFiles(client);
  const alreadyUploadedFileNames = new Set(Object.keys(fileNameToDirectusIds));
  console.log(`${alreadyUploadedFileNames.size} files previously uploaded`);

  const toUploadFileNames = imagePaths.filter(
    (fileName) => !alreadyUploadedFileNames.has(fileName),
  );
  console.log(`Starting upload of ${toUploadFileNames.length} files`);
  for (const fileName of toUploadFileNames) {
    const blob = await fs.readFile(`city_detail/attachment_images/${fileName}`);
    const id = await uploadFile(client, fileName, blob);
    fileNameToDirectusIds[fileName] = id;
  }
  console.log(`Finished upload of ${toUploadFileNames.length} files`);

  const extendedData = await readExtendedData();
  Object.values(extendedData).forEach((place) =>
    place.citations.forEach((citation) =>
      citation.attachments.forEach(
        (attachment) =>
          (attachment["directusId"] =
            fileNameToDirectusIds[attachment["fileName"]]),
      ),
    ),
  );
  console.log(`Updating data/extended.json`);
  await fs.writeFile(
    "data/extended.json",
    JSON.stringify(extendedData, null, 2),
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
