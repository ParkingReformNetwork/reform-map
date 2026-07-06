/**
 * Runs `main` unless imported under a test environment, where the test file
 * is expected to call `main` itself.
 */
export function runScript(main: () => Promise<void>): void {
  if (process.env.NODE_ENV !== "test") {
    main().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}
