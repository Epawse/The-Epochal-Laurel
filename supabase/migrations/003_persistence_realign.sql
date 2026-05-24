-- Realign saves table to spec: keyed by id (UUID PK), no session_id.
-- Demo data is disposable; clean recreate.

DROP TABLE IF EXISTS saves;

CREATE TABLE saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL DEFAULT 'default',
  state jsonb NOT NULL,
  turn_number integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saves_slot_idx ON saves(slot);

-- Enable RLS (re-apply after recreate)
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_manage_saves" ON saves
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Leaderboard: drop session_id (no longer have session identity)
ALTER TABLE leaderboard DROP COLUMN IF EXISTS session_id;
