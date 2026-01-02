-- Create consultations table if it doesn't exist
create table if not exists public.consultations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  question text not null,
  deadline date,
  status text default 'pending' check (status in ('pending', 'quoted', 'paid', 'completed', 'archived')),
  quote_amount decimal(10,2),
  quote_currency text default 'CAD'
);

-- Enable RLS
alter table public.consultations enable row level security;

-- Policies

-- 1. Anyone can create consultations (Guest or User)
create policy "Anyone can create consultations"
  on public.consultations for insert
  with check (true);

-- 2. Users can view their own consultations
create policy "Users can view own consultations"
  on public.consultations for select
  using (auth.uid() = user_id);

-- 3. Admins can view/edit all consultations
-- This assumes a 'profiles' table exists with a 'role' column.
-- If circular dependency issues arise, this might need adjustment.
create policy "Admins can view all consultations"
  on public.consultations for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
