-- Create aa_articles table
CREATE TABLE aa_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published boolean DEFAULT false,
  slug text UNIQUE,
  excerpt text,
  published_at timestamptz
);

-- Enable RLS
ALTER TABLE aa_articles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX aa_articles_slug_idx ON aa_articles(slug);
CREATE INDEX aa_articles_published_idx ON aa_articles(published_at DESC) WHERE published_at IS NOT NULL;

-- Policies
CREATE POLICY "Anyone can view published articles"
  ON aa_articles FOR SELECT
  USING (published_at IS NOT NULL);

CREATE POLICY "Admins can view all articles"
  ON aa_articles FOR SELECT
  USING (EXISTS (SELECT 1 FROM aa_profiles WHERE aa_profiles.id = auth.uid() AND aa_profiles.role = 'admin'));

CREATE POLICY "Admins can manage articles"
  ON aa_articles FOR ALL
  USING (EXISTS (SELECT 1 FROM aa_profiles WHERE aa_profiles.id = auth.uid() AND aa_profiles.role = 'admin'));
