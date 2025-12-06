-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  wechat_id text,
  avatar_url text,
  role text default 'client' not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by owner and admin."
  on profiles for select using (
    auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

create policy "Users can insert their own profile."
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile."
  on profiles for update using (auth.uid() = id);

create policy "Admins can update any profile."
  on profiles for update using (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Set up Realtime
-- alter publication supabase_realtime add table profiles;

-- Create a function to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Set default email for existing users if any, or leave null if only future users matter
-- update public.profiles set email = auth.users.email from auth.users where profiles.id = auth.users.id and profiles.email is null;

-- Ensure admin is created with 'admin' role if there's an existing admin user
-- This requires manual update for the existing admin, e.g.:
-- update public.profiles set role = 'admin' where id = '<admin_user_id>';
