import { expect, test, type APIRequestContext } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "path";
import { createRequire } from "node:module";

// Load better-sqlite3 from the astrosolve server's own node_modules so the
// test can read/write the same DB file the live server uses without adding a
// new root-level dependency.
const serverRequire = createRequire(
  path.resolve(__dirname, "../tools/astrosolve/server/src/index.js"),
);

interface SqliteStatement {
  run(...params: unknown[]): void;
  get(...params: unknown[]): unknown;
}

interface SqliteDb {
  prepare(sql: string): SqliteStatement;
  close(): void;
}

const Database = serverRequire("better-sqlite3") as {
  new (filePath: string): SqliteDb;
};

const DB_PATH = path.resolve(
  __dirname,
  "../tools/astrosolve/server/data/astrosolve.sqlite",
);

const ROSETTE_IMAGE = path.resolve(
  __dirname,
  "../tools/astrogram/public/assets/img/rosette.jpg",
);

const ASTROSOLVE_URL = "http://localhost:3001";

function hashKey(plainKey: string): string {
  return crypto.createHash("sha256").update(plainKey).digest("hex");
}

test.describe("astrosolve: use_count tracking", () => {
  // Tests share a live server and the same DB file — run serially to avoid
  // request ordering surprises and to stay within the server's rate limit
  // (5 req/min).
  test.describe.configure({ mode: "serial" });

  let db: SqliteDb;

  test.beforeAll(() => {
    db = new Database(DB_PATH);
  });

  test.afterAll(() => {
    db.close();
  });

  /** Inserts a fresh key row and returns the plain-text token. */
  function insertTestKey(username: string): string {
    const plainKey = crypto.randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO solve_api_access_keys (username, key_hash) VALUES (?, ?)",
    ).run(username, hashKey(plainKey));
    return plainKey;
  }

  /** Reads use_count directly from the DB for the given username. */
  function queryUseCount(username: string): number {
    const row = db
      .prepare(
        "SELECT use_count FROM solve_api_access_keys WHERE username = ?",
      )
      .get(username) as { use_count: number } | undefined;
    return row?.use_count ?? 0;
  }

  /** Removes the test key row so each test leaves a clean slate. */
  function removeTestKey(username: string): void {
    db.prepare(
      "DELETE FROM solve_api_access_keys WHERE username = ?",
    ).run(username);
  }

  /**
   * POSTs a real JPEG to the solve endpoint.
   * Passes the given key in x-access-key, or omits the header when key is null.
   * Returns the HTTP status code.
   */
  async function postSolve(
    request: APIRequestContext,
    key: string | null,
  ): Promise<number> {
    const headers: Record<string, string> = {};
    if (key !== null) {
      headers["x-access-key"] = key;
    }
    const response = await request.post(`${ASTROSOLVE_URL}/api/v1/solve`, {
      headers,
      multipart: {
        image: {
          name: "rosette.jpg",
          mimeType: "image/jpeg",
          buffer: fs.readFileSync(ROSETTE_IMAGE),
        },
      },
    });
    return response.status();
  }

  test("use_count increments by 1 after a single successful authenticated request", async ({
    request,
  }) => {
    const username = `e2e-use-count-single-${Date.now()}`;
    const plainKey = insertTestKey(username);

    try {
      expect(queryUseCount(username)).toBe(0);

      await postSolve(request, plainKey);

      // use_count must be 1 regardless of whether the underlying solve
      // succeeded — the auth hook increments it before the solve handler runs.
      expect(queryUseCount(username)).toBe(1);
    } finally {
      removeTestKey(username);
    }
  });

  test("use_count accumulates correctly across multiple successful authenticated requests", async ({
    request,
  }) => {
    const username = `e2e-use-count-multi-${Date.now()}`;
    const plainKey = insertTestKey(username);

    try {
      expect(queryUseCount(username)).toBe(0);

      await postSolve(request, plainKey);
      await postSolve(request, plainKey);

      expect(queryUseCount(username)).toBe(2);
    } finally {
      removeTestKey(username);
    }
  });

  test("use_count does not change when the request carries no access key", async ({
    request,
  }) => {
    const username = `e2e-use-count-nokey-${Date.now()}`;
    insertTestKey(username);

    try {
      expect(queryUseCount(username)).toBe(0);

      const status = await postSolve(request, null);

      expect(status).toBe(401);
      expect(queryUseCount(username)).toBe(0);
    } finally {
      removeTestKey(username);
    }
  });

  test("use_count does not change when the request carries an invalid access key", async ({
    request,
  }) => {
    const username = `e2e-use-count-badkey-${Date.now()}`;
    insertTestKey(username);

    try {
      expect(queryUseCount(username)).toBe(0);

      const status = await postSolve(request, "not-a-real-key-xyz-999");

      expect(status).toBe(401);
      expect(queryUseCount(username)).toBe(0);
    } finally {
      removeTestKey(username);
    }
  });
});
