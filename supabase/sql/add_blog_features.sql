-- Blog feature enhancements for production-ready community blog
-- Run this migration after create_articles_table.sql

-- ============================================
-- 1. Tags System
-- ============================================

-- Create tags table
CREATE TABLE IF NOT EXISTS aa_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create article-tag junction table
CREATE TABLE IF NOT EXISTS aa_article_tags (
  article_id uuid REFERENCES aa_articles(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES aa_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Enable RLS on tags
ALTER TABLE aa_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE aa_article_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Anyone can view tags"
  ON aa_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON aa_tags FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Article-tags policies
CREATE POLICY "Anyone can view article tags"
  ON aa_article_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage article tags"
  ON aa_article_tags FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for faster tag lookups
CREATE INDEX IF NOT EXISTS aa_tags_slug_idx ON aa_tags(slug);
CREATE INDEX IF NOT EXISTS aa_article_tags_article_idx ON aa_article_tags(article_id);
CREATE INDEX IF NOT EXISTS aa_article_tags_tag_idx ON aa_article_tags(tag_id);


-- ============================================
-- 2. View Count Tracking
-- ============================================

-- Add view_count column to articles
ALTER TABLE aa_articles ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create index for popular articles
CREATE INDEX IF NOT EXISTS aa_articles_view_count_idx ON aa_articles(view_count DESC);

-- Function to increment view count (can be called by anyone via RPC)
CREATE OR REPLACE FUNCTION increment_article_view(article_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE aa_articles
  SET view_count = view_count + 1
  WHERE slug = article_slug AND published_at IS NOT NULL;
END;
$$;


-- ============================================
-- 3. Comments System
-- ============================================

-- Create comments table
CREATE TABLE IF NOT EXISTS aa_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES aa_articles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES aa_comments(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  content text NOT NULL,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on comments
ALTER TABLE aa_comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can view approved comments"
  ON aa_comments FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Admins can view all comments"
  ON aa_comments FOR SELECT
  USING (is_admin());

CREATE POLICY "Anyone can create comments"
  ON aa_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage comments"
  ON aa_comments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Indexes for comments
CREATE INDEX IF NOT EXISTS aa_comments_article_idx ON aa_comments(article_id);
CREATE INDEX IF NOT EXISTS aa_comments_parent_idx ON aa_comments(parent_id);
CREATE INDEX IF NOT EXISTS aa_comments_approved_idx ON aa_comments(is_approved, created_at DESC);


-- ============================================
-- 4. Featured/Pinned Articles
-- ============================================

-- Add featured flag
ALTER TABLE aa_articles ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Index for featured articles
CREATE INDEX IF NOT EXISTS aa_articles_featured_idx ON aa_articles(is_featured) WHERE is_featured = true;


-- ============================================
-- 5. Reading Time Estimate
-- ============================================

-- Add reading_time column (in minutes)
ALTER TABLE aa_articles ADD COLUMN IF NOT EXISTS reading_time integer;

-- Function to calculate reading time (average 200 words per minute for Chinese, 250 for English)
CREATE OR REPLACE FUNCTION calculate_reading_time(content_text text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  word_count integer;
  chinese_count integer;
BEGIN
  -- Count Chinese characters
  chinese_count := length(regexp_replace(content_text, '[^\u4e00-\u9fff]', '', 'g'));
  -- Estimate word count (Chinese chars / 2 + English words)
  word_count := chinese_count / 2 + array_length(regexp_split_to_array(
    regexp_replace(content_text, '[\u4e00-\u9fff]', ' ', 'g'),
    '\s+'
  ), 1);
  -- Return reading time in minutes (minimum 1 minute)
  RETURN GREATEST(1, CEIL(word_count::numeric / 200));
END;
$$;

-- Trigger to auto-update reading time
CREATE OR REPLACE FUNCTION update_article_reading_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.reading_time := calculate_reading_time(NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS article_reading_time_trigger ON aa_articles;
CREATE TRIGGER article_reading_time_trigger
  BEFORE INSERT OR UPDATE OF content ON aa_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_article_reading_time();


-- ============================================
-- 6. Cover Image Support
-- ============================================

-- Add cover_image column
ALTER TABLE aa_articles ADD COLUMN IF NOT EXISTS cover_image text;
