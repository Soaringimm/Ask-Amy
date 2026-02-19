-- Meet playlists: store playlist metadata (audio files live in IndexedDB)
CREATE TABLE IF NOT EXISTS aa_meet_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'local' CHECK (type IN ('local', 'youtube')),
  songs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_aa_meet_playlists_user_id ON aa_meet_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_meet_playlists_user_type ON aa_meet_playlists(user_id, type);

-- RLS: users can only access their own playlists
ALTER TABLE aa_meet_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists"
  ON aa_meet_playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON aa_meet_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON aa_meet_playlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON aa_meet_playlists FOR DELETE
  USING (auth.uid() = user_id);
