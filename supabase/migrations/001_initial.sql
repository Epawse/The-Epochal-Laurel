-- Initial schema for saves and leaderboard

create table saves (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  state jsonb not null,
  updated_at timestamptz default now()
);

create table leaderboard (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  family_name text not null,
  tier text not null,
  highest_title text not null,
  generations int not null,
  score int not null,
  created_at timestamptz default now()
);

-- Index for fast session lookups
create index idx_saves_session_id on saves(session_id);
create index idx_leaderboard_score on leaderboard(score desc);
