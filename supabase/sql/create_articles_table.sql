-- Create articles table if it doesn't exist
create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  author_id uuid references auth.users(id) on delete set null,
  is_published boolean default false
);

-- Enable RLS
alter table public.articles enable row level security;

-- Policies

-- 1. Everyone can view published articles (for future public integration)
create policy "Anyone can view published articles"
  on public.articles for select
  using (is_published = true);

-- 2. Admins can view all articles
create policy "Admins can view all articles"
  on public.articles for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 3. Admins can insert/update/delete articles
create policy "Admins can manage articles"
  on public.articles for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
