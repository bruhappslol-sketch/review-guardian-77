CREATE TABLE public.visitor_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 100),
  visitor_id text NOT NULL CHECK (char_length(visitor_id) <= 64),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.visitor_signatures TO anon, authenticated;
GRANT SELECT, DELETE ON public.visitor_signatures TO authenticated;
GRANT ALL ON public.visitor_signatures TO service_role;
ALTER TABLE public.visitor_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can sign" ON public.visitor_signatures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read signatures" ON public.visitor_signatures FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Admins delete signatures" ON public.visitor_signatures FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE INDEX visitor_signatures_created_idx ON public.visitor_signatures (created_at desc);