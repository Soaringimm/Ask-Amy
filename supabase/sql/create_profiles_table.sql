-- Create aa_profiles table
CREATE TABLE aa_profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  wechat_id text,
  avatar_url text,
  role text DEFAULT 'client' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE aa_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON aa_profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM aa_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert own profile"
  ON aa_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON aa_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON aa_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM aa_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Auto-create profile on user signup
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.aa_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
