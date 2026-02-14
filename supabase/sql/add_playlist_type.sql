-- Add type column to aa_meet_playlists to distinguish local vs youtube playlists
ALTER TABLE aa_meet_playlists ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'local';
