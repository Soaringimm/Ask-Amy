-- Update articles table with blog features
-- Run this migration after create_articles_table.sql

-- Add new columns
alter table public.articles add column if not exists slug text unique;
alter table public.articles add column if not exists excerpt text;
alter table public.articles add column if not exists published_at timestamptz;

-- Create index for slug lookup
create index if not exists articles_slug_idx on public.articles(slug);

-- Create index for published articles ordered by date
create index if not exists articles_published_idx on public.articles(published_at desc) where published_at is not null;

-- Update RLS policy for public to see published articles
drop policy if exists "Anyone can view published articles" on public.articles;
create policy "Anyone can view published articles"
  on public.articles for select
  using (published_at is not null);
