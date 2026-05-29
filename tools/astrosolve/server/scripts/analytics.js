// This is a CLI script. Operator-facing output uses `console.log` /
// `console.error` deliberately — the no-console rule in
// `.claude/rules/node.md` applies to server / library code that should
// route through Fastify's structured logger, not to one-shot CLI tools
// whose entire purpose is to print to stdout / stderr.
import fs from "fs";
import { SqliteSolveEventDao } from "../src/dao/sqlite-solve-event.dao.js";
import { SqliteAccessKeyDao } from "../src/dao/sqlite-access-key.dao.js";
import {
  summarize,
  byUser,
  queueSaturationStats,
  recentEvents,
  recentFailures,
  eventsInLastDays,
} from "../src/services/solve-event.service.js";
import { listKeys } from "../src/services/access-key.service.js";

const USAGE = `Usage: node scripts/analytics.js <command> [options]

Commands:
  summary  [--days N]          Aggregate stats over the last N days (default 7)
  recent   [--limit N]         Last N events newest first (default 20)
  by-user  [--days N]          Per-user breakdown over the last N days (default 7)
  failures [--limit N]         Last N non-success events (default 20)
  queue    [--days N]          Queue saturation stats over the last N days (default 7)
  export   <file.csv>          Dump all rows to CSV
`;

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--days" || a === "--limit") {
      flags[a.slice(2)] = parseInt(argv[++i], 10);
    }
  }
  return flags;
}

function printTable(headers, rows) {
  const allRows = [headers, ...rows];
  const widths = headers.map((_, i) =>
    Math.max(...allRows.map((r) => String(r[i] ?? "").length)),
  );
  const bar = widths.map((w) => "─".repeat(w)).join("─┼─");
  const fmt = (row) =>
    row.map((v, i) => String(v ?? "").padEnd(widths[i])).join(" │ ");
  console.log(fmt(headers));
  console.log(bar);
  for (const row of rows) console.log(fmt(row));
}

function fmtMs(v) {
  if (v == null) return "—";
  return `${Math.round(v)}ms`;
}

function fmtPct(v) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtBytes(v) {
  if (v == null) return "—";
  if (v < 1024) return `${v}B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)}KB`;
  return `${(v / (1024 * 1024)).toFixed(2)}MB`;
}

const [, , command, ...rest] = process.argv;
const flags = parseFlags(rest);

const dao = SqliteSolveEventDao.create();
const accessKeyDao = SqliteAccessKeyDao.create();

const usernameByKeyId = new Map(
  listKeys(accessKeyDao).map((k) => [k.id, k.username]),
);
const userLabel = (keyId) => usernameByKeyId.get(keyId) ?? "—";

try {
  switch (command) {
    case "summary": {
      const days = flags.days ?? 7;
      const rows = eventsInLastDays(dao, days);
      const s = summarize(rows);

      const formatCounts = new Map();
      const widths = [];
      const heights = [];
      for (const row of rows) {
        const ext = row.file_extension ?? "(unknown)";
        formatCounts.set(ext, (formatCounts.get(ext) ?? 0) + 1);
        if (row.image_width_px != null) widths.push(row.image_width_px);
        if (row.image_height_px != null) heights.push(row.image_height_px);
      }
      widths.sort((a, b) => a - b);
      heights.sort((a, b) => a - b);

      const meanInt = (arr) => arr.length === 0 ? null : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
      const p50Int = (arr) => arr.length === 0 ? null : arr[Math.floor(arr.length * 0.5)];

      const fmtPx = (v) => v == null ? "—" : `${v}px`;

      console.log(`Summary — last ${days} day(s)`);
      console.log(`  total requests:       ${s.total}`);
      console.log(`  success rate:         ${fmtPct(s.successRate)}`);
      console.log(`\nOutcomes:`);
      printTable(
        ["outcome", "count"],
        Object.entries(s.byOutcome).map(([outcome, count]) => [outcome, count]),
      );
      console.log(`\nTimings:`);
      printTable(
        ["metric", "mean", "p50", "p95"],
        [
          ["solve_duration",   fmtMs(s.solveDurationMs.mean),    fmtMs(s.solveDurationMs.p50),    fmtMs(s.solveDurationMs.p95)],
          ["total_duration",   fmtMs(s.totalDurationMs.mean),    fmtMs(s.totalDurationMs.p50),    fmtMs(s.totalDurationMs.p95)],
          ["file_size",        fmtBytes(s.fileSizeBytes.mean),   fmtBytes(s.fileSizeBytes.p50),   fmtBytes(s.fileSizeBytes.p95)],
          ["image_width",      fmtPx(meanInt(widths)),           fmtPx(p50Int(widths)),           "—"],
          ["image_height",     fmtPx(meanInt(heights)),          fmtPx(p50Int(heights)),          "—"],
        ],
      );
      console.log(`\nFormats:`);
      printTable(
        ["format", "count"],
        [...formatCounts.entries()].sort((a, b) => b[1] - a[1]).map(([ext, count]) => [ext, count]),
      );
      console.log(`\nTop users:`);
      printTable(
        ["key_id", "user", "requests"],
        s.topUsers.map((u) => [u.keyId, userLabel(u.keyId), u.count]),
      );
      break;
    }
    case "recent": {
      const limit = flags.limit ?? 20;
      const rows = recentEvents(dao, limit);
      printTable(
        ["created_at", "key_id", "user", "outcome", "http", "total_ms", "solve_ms", "file_size", "format", "width", "height", "browser", "browser_ver", "os", "os_ver", "device"],
        rows.map((r) => [
          r.created_at,
          r.key_id ?? "—",
          userLabel(r.key_id),
          r.outcome,
          r.http_status,
          r.total_duration_ms,
          r.solve_duration_ms ?? "—",
          fmtBytes(r.file_size_bytes),
          r.file_extension ?? "—",
          r.image_width_px ?? "—",
          r.image_height_px ?? "—",
          r.browser_name ?? "—",
          r.browser_version ?? "—",
          r.os_name ?? "—",
          r.os_version ?? "—",
          r.device_type ?? "—",
        ]),
      );
      break;
    }
    case "by-user": {
      const days = flags.days ?? 7;
      const rows = eventsInLastDays(dao, days);
      const grouped = byUser(rows);

      const userDimensions = new Map();
      for (const row of rows) {
        const key = row.key_id == null ? "(no key)" : String(row.key_id);
        if (!userDimensions.has(key)) userDimensions.set(key, { widths: [], heights: [] });
        const d = userDimensions.get(key);
        if (row.image_width_px != null) d.widths.push(row.image_width_px);
        if (row.image_height_px != null) d.heights.push(row.image_height_px);
      }
      const meanInt = (arr) => arr.length === 0 ? null : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
      const fmtPx = (v) => v == null ? "—" : `${v}px`;

      console.log(`Per-user — last ${days} day(s)`);
      printTable(
        ["key_id", "user", "total", "success_rate", "mean_solve_ms", "mean_file_size", "mean_width", "mean_height"],
        grouped.map((u) => {
          const keyIdNum = Number(u.keyId);
          const dims = userDimensions.get(u.keyId) ?? { widths: [], heights: [] };
          return [
            u.keyId,
            Number.isFinite(keyIdNum) ? userLabel(keyIdNum) : "—",
            u.total,
            fmtPct(u.successRate),
            fmtMs(u.meanSolveDurationMs),
            fmtBytes(u.meanFileSizeBytes),
            fmtPx(meanInt(dims.widths)),
            fmtPx(meanInt(dims.heights)),
          ];
        }),
      );
      break;
    }
    case "failures": {
      const limit = flags.limit ?? 20;
      const rows = recentFailures(dao, limit);
      printTable(
        ["created_at", "key_id", "user", "outcome", "http", "error_message", "file_size", "format", "width", "height", "browser", "browser_ver", "os", "os_ver", "device"],
        rows.map((r) => [
          r.created_at,
          r.key_id ?? "—",
          userLabel(r.key_id),
          r.outcome,
          r.http_status,
          r.error_message ?? "",
          fmtBytes(r.file_size_bytes),
          r.file_extension ?? "—",
          r.image_width_px ?? "—",
          r.image_height_px ?? "—",
          r.browser_name ?? "—",
          r.browser_version ?? "—",
          r.os_name ?? "—",
          r.os_version ?? "—",
          r.device_type ?? "—",
        ]),
      );
      break;
    }
    case "queue": {
      const days = flags.days ?? 7;
      const rows = eventsInLastDays(dao, days);
      const q = queueSaturationStats(rows);
      console.log(`Queue — last ${days} day(s)`);
      console.log(`  queue_full rejections:    ${q.queueFullRejections}`);
      console.log(`  queue wait (p50/p95):     ${fmtMs(q.queueWaitMs.p50)} / ${fmtMs(q.queueWaitMs.p95)}`);
      console.log(`  max queue depth seen:     ${q.maxQueueDepthOnEnqueue ?? "—"}`);
      break;
    }
    case "export": {
      const target = rest[0] && !rest[0].startsWith("--") ? rest[0] : null;
      if (!target) {
        console.error("Usage: node scripts/analytics.js export <file.csv>");
        process.exit(1);
      }
      const iter = dao.iterateAll();
      let header = null;
      const out = fs.createWriteStream(target);
      for (const row of iter) {
        if (!header) {
          header = Object.keys(row);
          out.write(header.join(",") + "\n");
        }
        out.write(
          header
            .map((k) => {
              const v = row[k];
              if (v == null) return "";
              const s = String(v);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",") + "\n",
        );
      }
      out.end();
      console.log(`Exported to ${target}`);
      break;
    }
    default:
      console.error(USAGE);
      process.exit(1);
  }
} catch (err) {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
} finally {
  dao.close();
  accessKeyDao.close();
}
