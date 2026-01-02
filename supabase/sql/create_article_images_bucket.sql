-- Create aa_article_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('aa_article_images', 'aa_article_images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read aa_article_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aa_article_images');

-- Admin upload policy
CREATE POLICY "Admin upload aa_article_images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aa_article_images' AND
    EXISTS (SELECT 1 FROM aa_profiles WHERE aa_profiles.id = auth.uid() AND aa_profiles.role = 'admin')
  );

-- Admin delete policy
CREATE POLICY "Admin delete aa_article_images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'aa_article_images' AND
    EXISTS (SELECT 1 FROM aa_profiles WHERE aa_profiles.id = auth.uid() AND aa_profiles.role = 'admin')
  );
