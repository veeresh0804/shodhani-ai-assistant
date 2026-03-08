
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- recruiters
DROP POLICY IF EXISTS "Recruiters can insert own profile" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can update own profile" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can view own profile" ON public.recruiters;

CREATE POLICY "Recruiters can view own profile" ON public.recruiters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can insert own profile" ON public.recruiters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiters can update own profile" ON public.recruiters FOR UPDATE USING (auth.uid() = user_id);

-- students
DROP POLICY IF EXISTS "Students can insert own profile" ON public.students;
DROP POLICY IF EXISTS "Students can update own profile" ON public.students;
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Recruiters can view student profiles" ON public.students;

CREATE POLICY "Students can view own profile" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own profile" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own profile" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can view student profiles" ON public.students FOR SELECT USING (has_role(auth.uid(), 'recruiter'));

-- student_profiles
DROP POLICY IF EXISTS "Students can view own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can insert own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Recruiters can view student extracted profiles" ON public.student_profiles;

CREATE POLICY "Students can view own extracted profile" ON public.student_profiles FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can insert own extracted profile" ON public.student_profiles FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can update own extracted profile" ON public.student_profiles FOR UPDATE USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can view student extracted profiles" ON public.student_profiles FOR SELECT USING (has_role(auth.uid(), 'recruiter'));

-- jobs
DROP POLICY IF EXISTS "Anyone authenticated can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update own jobs" ON public.jobs;

CREATE POLICY "Anyone authenticated can view active jobs" ON public.jobs FOR SELECT USING (
  status = 'active' OR recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())
);
CREATE POLICY "Recruiters can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (
  recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())
);
CREATE POLICY "Recruiters can update own jobs" ON public.jobs FOR UPDATE USING (
  recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())
);

-- applications
DROP POLICY IF EXISTS "Students can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Students can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update applications for their jobs" ON public.applications;

CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Students can insert own applications" ON public.applications FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Recruiters can view applications for their jobs" ON public.applications FOR SELECT USING (
  job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()))
);
CREATE POLICY "Recruiters can update applications for their jobs" ON public.applications FOR UPDATE USING (
  job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()))
);

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
