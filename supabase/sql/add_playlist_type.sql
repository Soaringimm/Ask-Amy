-- Add type column to aa_meet_playlists to distinguish local vs youtube playlists
ALTER TABLE aa_meet_playlists ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'local';
UPDATE aa_meet_playlists SET type = 'local' WHERE type IS NULL;
ALTER TABLE aa_meet_playlists ALTER COLUMN type SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'aa_meet_playlists_type_check'
  ) THEN
    ALTER TABLE aa_meet_playlists
      ADD CONSTRAINT aa_meet_playlists_type_check CHECK (type IN ('local', 'youtube'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aa_meet_playlists_user_type ON aa_meet_playlists(user_id, type);
