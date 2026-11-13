import { q, one, pgJson } from "../db";
import { syncNycDob, syncNycDcwp } from "./nyc";
import { verifyPending } from "./verify";

export const SOURCES = {
  "nyc-dob": {
    label: "NYC DOB licences (with email)",
    detail: "General contractors, superintendents, master plumbers, electrical firms. NYC Open Data t8hj-ruu2, updated daily.",
    run: syncNycDob,
  },
  "nyc-dcwp": {
    label: "NYC home-improvement contractors (DCWP)",
    detail: "Small residential shops. Phone only — tags matching email contacts `hic`, stores the rest for enrichment. Run after DOB.",
    run: syncNycDcwp,
  },
  verify: {
    label: "Verify emails",
    detail: "Syntax, typo/disposable domains, unmonitored addresses, MX. 3,000 per run.",
    run: () => verifyPending(3000),
  },
} as const;

export type SourceKey = keyof typeof SOURCES;

/** Runs one source, logging it to sync_runs so the admin can show history. */
export async function runSource(key: SourceKey) {
  const run = await one<{ id: number }>(`insert into sync_runs (source) values ($1) returning id`, [key]);
  try {
    const stats = await SOURCES[key].run();
    await q(`update sync_runs set status='done', stats=$2::jsonb, finished_at=now() where id=$1`, [run!.id, pgJson(stats)]);
    return stats;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await q(`update sync_runs set status='failed', error=$2, finished_at=now() where id=$1`, [run!.id, msg]);
    throw err;
  }
}
