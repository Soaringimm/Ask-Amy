-- =============================================================================
-- Feedback System Tables Migration
-- =============================================================================
-- This migration creates:
-- 1. aa_feedback - Main feedback table for feature requests, bug reports, tips
-- 2. aa_feedback_images - Image attachments for feedback
-- 3. RLS policies for admin-only access
-- 4. Storage bucket for feedback images
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create aa_feedback table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aa_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('feature_request', 'bug_report', 'knowledge_tip')),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  admin_comment text,
  admin_comment_at timestamptz,
  resolution_summary text,
  submitter_name text,
  submitter_email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. Create aa_feedback_images table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aa_feedback_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id uuid REFERENCES aa_feedback(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. Create indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_aa_feedback_status ON aa_feedback(status);
CREATE INDEX IF NOT EXISTS idx_aa_feedback_type ON aa_feedback(type);
CREATE INDEX IF NOT EXISTS idx_aa_feedback_priority ON aa_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_aa_feedback_created_at ON aa_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aa_feedback_images_feedback_id ON aa_feedback_images(feedback_id);

-- -----------------------------------------------------------------------------
-- 4. Enable RLS and create policies (admin-only access)
-- -----------------------------------------------------------------------------

ALTER TABLE aa_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE aa_feedback_images ENABLE ROW LEVEL SECURITY;

-- Feedback table policies
DROP POLICY IF EXISTS "Admin access aa_feedback" ON aa_feedback;
CREATE POLICY "Admin access aa_feedback"
  ON aa_feedback FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Feedback images table policies
DROP POLICY IF EXISTS "Admin access aa_feedback_images" ON aa_feedback_images;
CREATE POLICY "Admin access aa_feedback_images"
  ON aa_feedback_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- 5. Create trigger function for auto-updating updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_aa_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS aa_feedback_updated_at ON aa_feedback;
CREATE TRIGGER aa_feedback_updated_at
  BEFORE UPDATE ON aa_feedback
  FOR EACH ROW EXECUTE FUNCTION update_aa_feedback_updated_at();

-- =============================================================================
-- Storage Bucket Setup (run in Supabase Dashboard or via API)
-- =============================================================================
-- Create bucket: aa_feedback_images
-- Public: false (private)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--
-- Storage policies:
-- INSERT: Authenticated users with is_admin()
-- SELECT: Authenticated users with is_admin()
-- DELETE: Authenticated users with is_admin()
-- =============================================================================

-- Note: Storage bucket creation requires Supabase Dashboard or API
-- The following is the SQL equivalent for reference:

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'aa_feedback_images',
--   'aa_feedback_images',
--   false,
--   5242880, -- 5MB in bytes
--   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (need to be created via Dashboard or API):
-- CREATE POLICY "Admin can upload feedback images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'aa_feedback_images' AND is_admin());
--
-- CREATE POLICY "Admin can view feedback images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'aa_feedback_images' AND is_admin());
--
-- CREATE POLICY "Admin can delete feedback images"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'aa_feedback_images' AND is_admin());

-- =============================================================================
-- Migration Complete
-- =============================================================================
