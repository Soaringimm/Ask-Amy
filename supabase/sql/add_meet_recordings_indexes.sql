-- Improve meet recordings list query performance
CREATE INDEX IF NOT EXISTS idx_aa_meet_recordings_user_created_at
  ON aa_meet_recordings(user_id, created_at DESC);
