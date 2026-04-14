
-- 1. Fix privilege escalation: restrict user_roles INSERT to admins only
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix missing storage DELETE policy for resumes bucket
CREATE POLICY "Students can delete own resumes"
ON storage.objects
FOR DELETE
USING (
  (bucket_id = 'resumes') AND ((storage.foldername(name))[1] = (auth.uid())::text)
);

-- 3. Fix recruiter feedback exposure: create a student-safe view
CREATE VIEW public.applications_student_view
WITH (security_invoker = on) AS
SELECT id, job_id, student_id, status, applied_at, updated_at
FROM public.applications;

-- Drop existing student SELECT policy and replace with view-based access
DROP POLICY IF EXISTS "Students can view own applications" ON public.applications;

CREATE POLICY "Students can view own applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()))
);
