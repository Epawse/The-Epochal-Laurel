-- Enable Row Level Security on all tables
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Saves: anon role can perform all operations (access control is in Server Actions)
CREATE POLICY "anon_manage_saves" ON saves
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Leaderboard: anyone can read, anon can insert
CREATE POLICY "anon_read_leaderboard" ON leaderboard
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_insert_leaderboard" ON leaderboard
  FOR INSERT TO anon
  WITH CHECK (true);
