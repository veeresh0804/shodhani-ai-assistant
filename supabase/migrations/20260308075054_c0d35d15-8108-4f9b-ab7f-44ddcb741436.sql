
-- Fix all RLS policies to be PERMISSIVE instead of RESTRICTIVE

-- RECRUITERS
DROP POLICY IF EXISTS "Recruiters can view own profile" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can insert own profile" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can update own profile" ON public.recruiters;

CREATE POLICY "Recruiters can view own profile" ON public.recruiters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can insert own profile" ON public.recruiters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiters can update own profile" ON public.recruiters FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- STUDENTS
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Students can insert own profile" ON public.students;
DROP POLICY IF EXISTS "Students can update own profile" ON public.students;
DROP POLICY IF EXISTS "Recruiters can view student profiles" ON public.students;

CREATE POLICY "Students can view own profile" ON public.students FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own profile" ON public.students FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own profile" ON public.students FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Recruiters can view student profiles" ON public.students FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'));

-- JOBS
DROP POLICY IF EXISTS "Anyone authenticated can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update own jobs" ON public.jobs;

CREATE POLICY "Anyone authenticated can view active jobs" ON public.jobs FOR SELECT TO authenticated USING (status = 'active' OR recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

-- APPLICATIONS
DROP POLICY IF EXISTS "Students can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Students can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update applications for their jobs" ON public.applications;

CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can insert own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can view applications for their jobs" ON public.applications FOR SELECT TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())));
CREATE POLICY "Recruiters can update applications for their jobs" ON public.applications FOR UPDATE TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())));

-- STUDENT_PROFILES
DROP POLICY IF EXISTS "Students can view own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can insert own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own extracted profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Recruiters can view student extracted profiles" ON public.student_profiles;

CREATE POLICY "Students can view own extracted profile" ON public.student_profiles FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can insert own extracted profile" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can update own extracted profile" ON public.student_profiles FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Recruiters can view student extracted profiles" ON public.student_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- TRIGGERS
CREATE OR REPLACE TRIGGER on_recruiter_created AFTER INSERT ON public.recruiters FOR EACH ROW EXECUTE FUNCTION auto_assign_recruiter_role();
CREATE OR REPLACE TRIGGER on_student_created AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION auto_assign_student_role();
CREATE OR REPLACE TRIGGER on_application_created AFTER INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION increment_applications_count();
CREATE OR REPLACE TRIGGER update_recruiters_updated_at BEFORE UPDATE ON public.recruiters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
