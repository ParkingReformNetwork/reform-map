import { test, expect } from "@playwright/test";

import { createUrl } from "../../src/js/layout/share";

test("createUrl()", () => {
  global.window = {
    location: { href: "https://parkingreform.org/path?old=param#hash" },
  } as any;
  expect(createUrl(new URLSearchParams("foo=bar"))).toBe(
    "https://parkingreform.org/path?foo=bar#hash",
  );
  expect(createUrl(new URLSearchParams())).toBe(
    "https://parkingreform.org/path#hash",
  );
});
