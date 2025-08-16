/* eslint-disable no-console */

import * as fs from "fs/promises";
import * as path from "path";

const REDIRECTS = {
  NewZealand_NZ: "NewZealand",
} as const;

const BASE_URL = "https://parkingreform.org/mandates-map/city_detail/";
const OUTPUT_DIR = "city_detail";

function createRedirectHTML(targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=${targetUrl}">
    <link rel="canonical" href="${targetUrl}">
    <title>Redirecting...</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5; 
        }
        .redirect-message { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
    </style>
</head>
<body>
    <div class="redirect-message">
        <h1>Redirecting...</h1>
        <p>You are being redirected to: <a href="${targetUrl}">${targetUrl}</a></p>
        <p>If you are not redirected automatically, please click the link above.</p>
    </div>
    <script>
        // Immediate redirect
        window.location.replace("${targetUrl}");
    </script>
</body>
</html>`;
}

async function main(): Promise<void> {
  let successCount = 0;
  let errorCount = 0;
  await Promise.all(
    Object.entries(REDIRECTS).map(async ([oldPath, newPath]) => {
      const targetUrl = `${BASE_URL}${newPath}.html`;
      const htmlContent = createRedirectHTML(targetUrl);
      const filePath = path.join(OUTPUT_DIR, `${oldPath}.html`);

      try {
        await fs.writeFile(filePath, htmlContent, "utf8");
        successCount += 1;
      } catch (error) {
        console.error(`❌ Failed to create redirect for ${oldPath}:`, error);
        errorCount += 1;
      }
    }),
  );

  console.log("\n📊 Summary:");
  console.log(`✅ Successfully created: ${successCount} redirects`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} redirects`);
  }

  if (successCount > 0) {
    console.log(`\n📁 Files written to: ${path.resolve(OUTPUT_DIR)}`);
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
