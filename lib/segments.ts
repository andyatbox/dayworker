/**
 * A segment is a saved contact filter. The same filter drives the contacts
 * table, list counts, and campaign enrolment, so what you see is what sends.
 */
export type Filter = {
  q?: string;
  region?: string;
  borough?: string;
  source?: string;
  stage?: string;
  verify?: string;
  tag?: string;
  trade?: string;
  lang?: string;
  minFit?: string;
  hasEmail?: string;
};

export const FILTER_KEYS: (keyof Filter)[] = ["q", "region", "borough", "source", "stage", "verify", "tag", "trade", "lang", "minFit", "hasEmail"];

export function cleanFilter(input: Record<string, unknown>): Filter {
  const f: Filter = {};
  for (const k of FILTER_KEYS) {
    const v = input[k];
    if (typeof v === "string" && v.trim()) f[k] = v.trim();
  }
  return f;
}

/** SQL for a filter over `contacts c`. Pushes values onto `params`. */
export function whereFor(f: Filter, params: unknown[]): string {
  const w: string[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (f.q) {
    const x = p(`%${f.q.toLowerCase()}%`);
    w.push(`(lower(coalesce(c.email,'')) like ${x} or lower(coalesce(c.business_name,'')) like ${x}
      or lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) like ${x} or coalesce(c.zip,'') like ${x})`);
  }
  if (f.region) w.push(`c.region = ${p(f.region)}`);
  if (f.borough) w.push(`c.borough = ${p(f.borough)}`);
  if (f.source) w.push(`c.source = ${p(f.source)}`);
  if (f.stage) w.push(`c.stage = ${p(f.stage)}`);
  if (f.verify) w.push(`c.verify_status = ${p(f.verify)}`);
  if (f.tag) w.push(`${p(f.tag)} = any(c.tags)`);
  if (f.trade) w.push(`${p(f.trade)} = any(c.trades)`);
  if (f.lang) w.push(`c.lang = ${p(f.lang)}`);
  if (f.minFit && /^-?\d+$/.test(f.minFit)) w.push(`c.fit_score >= ${p(Number(f.minFit))}`);
  if (f.hasEmail === "yes") w.push(`c.email is not null`);
  if (f.hasEmail === "no") w.push(`c.email is null`);
  return w.length ? w.join(" and ") : "true";
}

/** Who a campaign may email: everything the filter says, plus the safety rules. */
export const SENDABLE = `c.email is not null
  and c.verify_status in ('valid', 'risky')
  and c.stage = 'new'
  and not exists (select 1 from suppressions s where s.email = c.email)
  and not exists (select 1 from sends x where x.contact_id = c.id)`;
