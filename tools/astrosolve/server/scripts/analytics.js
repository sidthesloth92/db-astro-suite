import fs from "fs";
import { SqliteSolveEventDao } from "../src/dao/sqlite-solve-event.dao.js";
import {
  summarize,
  byUser,
  queueSaturationStats,
  recentEvents,
  recentFailures,
  eventsInLastDays,
} from "../src/services/solve-event.service.js";

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

try {
  switch (command) {
    case "summary": {
      const days = flags.days ?? 7;
      const rows = eventsInLastDays(dao, days);
      const s = summarize(rows);
      console.log(`Summary — last ${days} day(s)`);
      console.log(`  total requests:       ${s.total}`);
      console.log(`  success rate:         ${fmtPct(s.successRate)}`);
      console.log(`  by outcome:`);
      for (const [outcome, count] of Object.entries(s.byOutcome)) {
        console.log(`    ${outcome.padEnd(20)} ${count}`);
      }
      console.log(`  solve duration:       mean ${fmtMs(s.solveDurationMs.mean)}  p50 ${fmtMs(s.solveDurationMs.p50)}  p95 ${fmtMs(s.solveDurationMs.p95)}`);
      console.log(`  total request time:   mean ${fmtMs(s.totalDurationMs.mean)}  p50 ${fmtMs(s.totalDurationMs.p50)}  p95 ${fmtMs(s.totalDurationMs.p95)}`);
      console.log(`  file size:            mean ${fmtBytes(s.fileSizeBytes.mean)}  p50 ${fmtBytes(s.fileSizeBytes.p50)}  p95 ${fmtBytes(s.fileSizeBytes.p95)}`);
      console.log(`  top users:`);
      for (const u of s.topUsers) {
        console.log(`    key_id=${u.keyId}\t${u.count} req`);
      }
      break;
    }
    case "recent": {
      const limit = flags.limit ?? 20;
      const rows = recentEvents(dao, limit);
      console.log("created_at\tkey_id\toutcome\thttp\ttotal_ms\tsolve_ms\tfile_size");
      for (const r of rows) {
        console.log(
          [
            r.created_at,
            r.key_id ?? "—",
            r.outcome,
            r.http_status,
            r.total_duration_ms,
            r.solve_duration_ms ?? "—",
            r.file_size_bytes ?? "—",
          ].join("\t"),
        );
      }
      break;
    }
    case "by-user": {
      const days = flags.days ?? 7;
      const rows = eventsInLastDays(dao, days);
      const grouped = byUser(rows);
      console.log(`Per-user — last ${days} day(s)`);
      console.log("key_id\ttotal\tsuccess_rate\tmean_solve_ms\tmean_file_size");
      for (const u of grouped) {
        console.log(
          [
            u.keyId,
            u.total,
            fmtPct(u.successRate),
            fmtMs(u.meanSolveDurationMs),
            fmtBytes(u.meanFileSizeBytes),
          ].join("\t"),
        );
      }
      break;
    }
    case "failures": {
      const limit = flags.limit ?? 20;
      const rows = recentFailures(dao, limit);
      console.log("created_at\tkey_id\toutcome\thttp\terror_message");
      for (const r of rows) {
        console.log(
          [
            r.created_at,
            r.key_id ?? "—",
            r.outcome,
            r.http_status,
            r.error_message ?? "",
          ].join("\t"),
        );
      }
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
}
