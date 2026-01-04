-- =============================================================================
-- User Authentication & Management Features Migration
-- =============================================================================
-- This migration adds:
-- 1. User profile extensions (is_active, last_login_at)
-- 2. Favorites table for article bookmarking
-- 3. Comments table user_id column for logged-in user comments
-- 4. Updated RLS policies for admin user management
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend aa_profiles table
-- -----------------------------------------------------------------------------

-- Add is_active column for account enable/disable
ALTER TABLE aa_profiles ADD COLUMN IF NOT EXISTS
  is_active boolean DEFAULT true NOT NULL;

-- Add last_login_at for tracking user activity
ALTER TABLE aa_profiles ADD COLUMN IF NOT EXISTS
  last_login_at timestamptz;

-- -----------------------------------------------------------------------------
-- 2. Create aa_favorites table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aa_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id uuid REFERENCES aa_articles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, article_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_aa_favorites_user_id ON aa_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_favorites_article_id ON aa_favorites(article_id);

-- Enable RLS
ALTER TABLE aa_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aa_favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON aa_favorites;
CREATE POLICY "Users can view own favorites"
ON aa_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON aa_favorites;
CREATE POLICY "Users can insert own favorites"
ON aa_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON aa_favorites;
CREATE POLICY "Users can delete own favorites"
ON aa_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Extend aa_comments table for logged-in users
-- -----------------------------------------------------------------------------

-- Add user_id column (NULL allowed for guest comments)
ALTER TABLE aa_comments ADD COLUMN IF NOT EXISTS
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user comments lookup
CREATE INDEX IF NOT EXISTS idx_aa_comments_user_id ON aa_comments(user_id);

-- -----------------------------------------------------------------------------
-- 4. Update aa_profiles RLS policies for admin management
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all profiles" ON aa_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON aa_profiles;
DROP POLICY IF EXISTS "Admins can delete users" ON aa_profiles;

-- Admin can view all user profiles
CREATE POLICY "Admins can view all profiles"
ON aa_profiles FOR SELECT
TO authenticated
USING (is_admin());

-- Admin can update any user profile (role, is_active, etc.)
CREATE POLICY "Admins can update user profiles"
ON aa_profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Admin can delete users
CREATE POLICY "Admins can delete users"
ON aa_profiles FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 5. Helper function: Get user's favorite count
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_favorites_count(user_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM aa_favorites
  WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 6. Helper function: Get user's comments count
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_comments_count(user_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM aa_comments
  WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. Helper function: Check if article is favorited by user
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_article_favorited(article_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM aa_favorites
    WHERE article_id = article_uuid AND user_id = user_uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 8. Helper function: Get article favorites count
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_article_favorites_count(article_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM aa_favorites
  WHERE article_id = article_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 9. Update last_login_at on sign in (trigger function)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE aa_profiles
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be on auth.users, but Supabase manages that table.
-- Instead, we'll update last_login_at from the client side after successful login.

-- =============================================================================
-- Migration Complete
-- =============================================================================
