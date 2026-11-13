/**
 * The whole CRM in one idempotent script. Runs on every cold start, against
 * the embedded PGlite database locally and against Supabase/Neon in
 * production, so there is no separate migration step to forget.
 *
 * Arrays and JSON go in as strings with explicit casts (`$1::text[]`,
 * `$1::jsonb`) so both drivers see the same parameters.
 */
export const SCHEMA = /* sql */ `
create table if not exists contacts (
  id               serial primary key,
  email            text unique,
  -- Email-less rows (phone-only licence records waiting on enrichment) key
  -- on this instead, e.g. 'dcwp:2123918'.
  ext_key          text unique,
  first_name       text,
  last_name        text,
  business_name    text,
  phone            text,
  address          text,
  city             text,
  state            text,
  zip              text,
  region           text,
  borough          text,
  trades           text[] not null default '{}',
  license_type     text,
  license_number   text,
  license_status   text,
  source           text not null,
  lang             text not null default 'en',
  fit_score        int  not null default 0,
  verify_status    text not null default 'unverified',
  verify_reason    text,
  stage            text not null default 'new',
  tags             text[] not null default '{}',
  notes            text,
  last_contacted_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists contacts_stage on contacts(stage);
create index if not exists contacts_source on contacts(source);
create index if not exists contacts_region on contacts(region);

create table if not exists lists (
  id          serial primary key,
  name        text not null,
  description text,
  filter      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists senders (
  id            serial primary key,
  name          text not null,
  email         text not null unique,
  mode          text not null default 'dry_run',
  smtp_host     text,
  smtp_port     int  not null default 465,
  smtp_user     text,
  -- Name of the env var holding the password. Secrets never live in the DB.
  smtp_pass_env text,
  imap_host     text,
  imap_port     int  not null default 993,
  daily_max     int  not null default 40,
  warmup_start  date not null default current_date,
  status        text not null default 'active',
  paused_reason text,
  signature     text,
  created_at    timestamptz not null default now()
);

create table if not exists campaigns (
  id          serial primary key,
  name        text not null,
  code        text not null unique,
  status      text not null default 'draft',
  list_id     int references lists(id) on delete set null,
  sender_ids  int[] not null default '{}',
  daily_cap   int  not null default 100,
  track_opens boolean not null default false,
  steps       jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists sends (
  id          serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  contact_id  int not null references contacts(id) on delete cascade,
  sender_id   int references senders(id) on delete set null,
  step        int not null default 0,
  token       text not null unique,
  status      text not null default 'queued',
  due_at      timestamptz not null default now(),
  sent_at     timestamptz,
  message_id  text,
  thread_ref  text,
  subject     text,
  body        text,
  attempts    int not null default 0,
  error       text,
  opened_at   timestamptz,
  clicked_at  timestamptz,
  replied_at  timestamptz,
  bounced_at  timestamptz,
  unique (campaign_id, contact_id, step)
);
create index if not exists sends_due on sends(status, due_at);
create index if not exists sends_message on sends(message_id);

create table if not exists events (
  id          bigserial primary key,
  type        text not null,
  contact_id  int,
  campaign_id int,
  send_id     int,
  visitor_id  text,
  path        text,
  referrer    text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists events_type_time on events(type, created_at);
create index if not exists events_campaign on events(campaign_id, type);
create index if not exists events_contact on events(contact_id);

create table if not exists registrations (
  id            serial primary key,
  contact_id    int,
  campaign_id   int,
  send_id       int,
  visitor_id    text,
  role          text not null,
  name          text not null,
  business_name text,
  email         text not null,
  phone         text,
  zip           text not null,
  trades        text[] not null default '{}',
  crew_need     text,
  lang          text not null default 'en',
  consent_email boolean not null default false,
  consent_sms   boolean not null default false,
  referred_by   text,
  ref_code      text unique,
  firebase_uid  text,
  status        text not null default 'reserved',
  utm           jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists registrations_email on registrations(email);

create table if not exists suppressions (
  email      text primary key,
  reason     text not null,
  source     text,
  created_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id          serial primary key,
  source      text not null,
  status      text not null default 'running',
  stats       jsonb not null default '{}',
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- Columns added after first deploy. Keep these idempotent.
alter table sends add column if not exists body text;
alter table sends add column if not exists attempts int not null default 0;
alter table campaigns add column if not exists design text not null default 'plain';

create table if not exists kv (
  key   text primary key,
  value jsonb not null
);
`;
