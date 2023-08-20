import { defineConfig } from "@playwright/test";

// jest automatically sets process.env.NODE_ENV = 'test'
// playwright does not
// NODE_ENV is used in updateCityDetail.js to prevent the main function from running when it's being imported for testing
process.env.NODE_ENV = "test";

// Note that we may run tests by using Parcel (development) vs running on the `dist` folder.
const port = process.env.PORT || 1234;
const webServerCommand = port === 1234 ? "start" : "serve-dist";

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL,
  },
  webServer: {
    command: `npm run ${webServerCommand}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
