import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../config.js";
import {
  SOLVE_RATE_LIMIT,
  HEALTH_RATE_LIMIT,
} from "./rate-limit.constants.js";

test("SOLVE_RATE_LIMIT.max equals config.rateLimitMax", () => {
  assert.equal(SOLVE_RATE_LIMIT.max, config.rateLimitMax);
});

test("SOLVE_RATE_LIMIT.timeWindow equals config.rateLimitWindow", () => {
  assert.equal(SOLVE_RATE_LIMIT.timeWindow, config.rateLimitWindow);
});

test("HEALTH_RATE_LIMIT.max equals config.healthRateLimitMax", () => {
  assert.equal(HEALTH_RATE_LIMIT.max, config.healthRateLimitMax);
});

test("HEALTH_RATE_LIMIT.timeWindow equals config.healthRateLimitWindow", () => {
  assert.equal(HEALTH_RATE_LIMIT.timeWindow, config.healthRateLimitWindow);
});

test("SOLVE_RATE_LIMIT is truly frozen — mutation attempt throws and value is unchanged", () => {
  assert.throws(
    () => {
      SOLVE_RATE_LIMIT.max = 999;
    },
    TypeError,
    "Expected TypeError when mutating a frozen object in strict mode",
  );
  assert.equal(
    SOLVE_RATE_LIMIT.max,
    config.rateLimitMax,
    "SOLVE_RATE_LIMIT.max must remain unchanged after mutation attempt",
  );
});

test("HEALTH_RATE_LIMIT is truly frozen — mutation attempt throws and value is unchanged", () => {
  assert.throws(
    () => {
      HEALTH_RATE_LIMIT.max = 999;
    },
    TypeError,
    "Expected TypeError when mutating a frozen object in strict mode",
  );
  assert.equal(
    HEALTH_RATE_LIMIT.max,
    config.healthRateLimitMax,
    "HEALTH_RATE_LIMIT.max must remain unchanged after mutation attempt",
  );
});
