-- Create aa_meet_recordings table for storing meeting transcripts and summaries
CREATE TABLE IF NOT EXISTS aa_meet_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  topic TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  summary JSONB,  -- { title, keyPoints[], actionItems[], decisions[], summary }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only access their own recordings
ALTER TABLE aa_meet_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings"
  ON aa_meet_recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
  ON aa_meet_recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON aa_meet_recordings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings"
  ON aa_meet_recordings FOR DELETE
  USING (auth.uid() = user_id);
