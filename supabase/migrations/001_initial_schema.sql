-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── COURSES ────────────────────────────────────────────────────────────────

create table courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  created_at  timestamptz not null default now()
);

-- ─── LAYOUTS ────────────────────────────────────────────────────────────────

create table layouts (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  name        text not null,  -- e.g. "Pro", "Recreational"
  created_at  timestamptz not null default now()
);

-- ─── HOLES ──────────────────────────────────────────────────────────────────

create table holes (
  id              uuid primary key default gen_random_uuid(),
  layout_id       uuid not null references layouts(id) on delete cascade,
  hole_number     integer not null,
  par             integer not null,
  distance_meters integer,
  -- Mux asset played between this hole and the next
  mux_asset_id    text,
  mux_playback_id text,
  created_at      timestamptz not null default now(),
  unique(layout_id, hole_number)
);

-- ─── ROUNDS ─────────────────────────────────────────────────────────────────

create table rounds (
  id          uuid primary key default gen_random_uuid(),
  layout_id   uuid not null references layouts(id),
  name        text,           -- e.g. "Round 1 - Semifinal"
  status      text not null default 'pending',  -- pending | active | completed
  created_at  timestamptz not null default now()
);

-- ─── PLAYERS ────────────────────────────────────────────────────────────────

create table players (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  name        text not null,
  pdga_number text,
  position    integer not null check (position between 1 and 4),
  created_at  timestamptz not null default now(),
  unique(round_id, position)
);

-- ─── SCORES ─────────────────────────────────────────────────────────────────

create table scores (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  hole_number integer not null,
  strokes     integer,        -- null until hole is completed
  created_at  timestamptz not null default now(),
  unique(player_id, hole_number)
);

-- ─── STREAM STATE ───────────────────────────────────────────────────────────
-- Single-row table — always upsert with id = 'singleton'

create table stream_state (
  id                  text primary key default 'singleton',
  round_id            uuid references rounds(id),
  mode                text not null default 'idle',
  -- idle | live | transition | hole_media
  active_mux_input_id text,       -- which Mux live stream input is active
  current_hole        integer not null default 1,
  current_player_id   uuid references players(id),
  shot_count          integer not null default 0,
  -- overlay visibility flags
  show_player_overlay boolean not null default true,
  show_leaderboard    boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- Seed the singleton row
insert into stream_state (id) values ('singleton');

-- ─── CAMERA OPERATORS ───────────────────────────────────────────────────────

create table operators (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- Mux live stream input assigned to this operator
  mux_stream_key  text,
  mux_stream_id   text,
  mux_playback_id text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── VOTES ──────────────────────────────────────────────────────────────────

create table votes (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,  -- 'take_feed' | 'hole_done' | 'ready_to_stream'
  requested_by    uuid references operators(id),
  -- context for take_feed votes
  target_operator_id uuid references operators(id),
  status          text not null default 'pending',  -- pending | approved | rejected
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create table vote_objections (
  id          uuid primary key default gen_random_uuid(),
  vote_id     uuid not null references votes(id) on delete cascade,
  operator_id uuid not null references operators(id),
  created_at  timestamptz not null default now(),
  unique(vote_id, operator_id)
);

-- ─── REALTIME ───────────────────────────────────────────────────────────────

alter publication supabase_realtime add table stream_state;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table vote_objections;
alter publication supabase_realtime add table scores;

-- ─── RLS (allow all for now — tighten before prod) ─────────────────────────

alter table courses            enable row level security;
alter table layouts            enable row level security;
alter table holes              enable row level security;
alter table rounds             enable row level security;
alter table players            enable row level security;
alter table scores             enable row level security;
alter table stream_state       enable row level security;
alter table operators          enable row level security;
alter table votes              enable row level security;
alter table vote_objections    enable row level security;

-- Public read/write for all tables (tournament is a closed local event)
do $$
declare
  t text;
begin
  foreach t in array array[
    'courses','layouts','holes','rounds','players',
    'scores','stream_state','operators','votes','vote_objections'
  ]
  loop
    execute format('create policy "public_all" on %I for all using (true) with check (true)', t);
  end loop;
end$$;
