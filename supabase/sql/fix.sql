ALTER TABLE public.consultations 
ADD COLUMN IF NOT EXISTS quote_amount decimal(10,2),
ADD COLUMN IF NOT EXISTS quote_currency text default 'CAD',
ADD COLUMN IF NOT EXISTS deadline date;

ALTER TABLE public.consultations 
DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE public.consultations 
ADD CONSTRAINT consultations_status_check 
CHECK (status IN ('pending', 'quoted', 'paid', 'completed', 'archived'));

DROP POLICY IF EXISTS "Anyone can create consultations" ON public.consultations;
CREATE POLICY "Anyone can create consultations"
  ON public.consultations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own consultations" ON public.consultations;
CREATE POLICY "Users can view own consultations"
  ON public.consultations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all consultations" ON public.consultations;
CREATE POLICY "Admins can view all consultations"
  ON public.consultations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );