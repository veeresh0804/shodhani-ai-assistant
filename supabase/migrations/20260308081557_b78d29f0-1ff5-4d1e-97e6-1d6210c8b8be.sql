
-- Add resume_url to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resume_url text;

-- Create interviews table
CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  recruiter_id uuid REFERENCES public.recruiters(id) ON DELETE CASCADE NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  meeting_link text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view own interviews" ON public.interviews
  FOR SELECT TO authenticated
  USING (recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can insert own interviews" ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can update own interviews" ON public.interviews
  FOR UPDATE TO authenticated
  USING (recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can delete own interviews" ON public.interviews
  FOR DELETE TO authenticated
  USING (recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()));

CREATE POLICY "Students can view own interviews" ON public.interviews
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all students" ON public.students
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all recruiters" ON public.recruiters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all interviews" ON public.interviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Students can upload own resume" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students can view own resume" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students can update own resume" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Recruiters can view resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Admins can view resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
