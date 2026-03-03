
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('recruiter', 'student');

-- User roles table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Recruiter profiles
CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  recruiter_name TEXT NOT NULL,
  email TEXT NOT NULL,
  designation TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view own profile"
  ON public.recruiters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can insert own profile"
  ON public.recruiters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiters can update own profile"
  ON public.recruiters FOR UPDATE USING (auth.uid() = user_id);

-- Student profiles
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  branch TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
  ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own profile"
  ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own profile"
  ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can view student profiles"
  ON public.students FOR SELECT
  USING (public.has_role(auth.uid(), 'recruiter'));

-- Student extracted profile data
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  leetcode_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  leetcode_data JSONB DEFAULT '{}'::jsonb,
  github_data JSONB DEFAULT '{}'::jsonb,
  linkedin_data JSONB DEFAULT '{}'::jsonb,
  gemini_analysis JSONB DEFAULT '{}'::jsonb,
  last_extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own extracted profile"
  ON public.student_profiles FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can insert own extracted profile"
  ON public.student_profiles FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can update own extracted profile"
  ON public.student_profiles FOR UPDATE USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Recruiters can view student extracted profiles"
  ON public.student_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'recruiter'));

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department TEXT,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL,
  experience_required TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  salary_range TEXT,
  deadline TIMESTAMPTZ,
  num_openings INTEGER DEFAULT 1,
  company_description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  applications_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (status = 'active' OR recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can insert own jobs"
  ON public.jobs FOR INSERT WITH CHECK (
    recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid())
  );
CREATE POLICY "Recruiters can update own jobs"
  ON public.jobs FOR UPDATE USING (
    recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid())
  );

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'shortlisted', 'rejected', 'interview_scheduled')),
  match_analysis JSONB DEFAULT '{}'::jsonb,
  recruiter_feedback TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, student_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own applications"
  ON public.applications FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can insert own applications"
  ON public.applications FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "Recruiters can view applications for their jobs"
  ON public.applications FOR SELECT USING (
    job_id IN (SELECT id FROM public.jobs WHERE recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()))
  );
CREATE POLICY "Recruiters can update applications for their jobs"
  ON public.applications FOR UPDATE USING (
    job_id IN (SELECT id FROM public.jobs WHERE recruiter_id IN (SELECT id FROM public.recruiters WHERE user_id = auth.uid()))
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_recruiters_updated_at BEFORE UPDATE ON public.recruiters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment applications count
CREATE OR REPLACE FUNCTION public.increment_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_application_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.increment_applications_count();

-- Auto-create role on recruiter/student profile creation
CREATE OR REPLACE FUNCTION public.auto_assign_recruiter_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'recruiter') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_assign_student_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_recruiter_created AFTER INSERT ON public.recruiters FOR EACH ROW EXECUTE FUNCTION public.auto_assign_recruiter_role();
CREATE TRIGGER on_student_created AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.auto_assign_student_role();
