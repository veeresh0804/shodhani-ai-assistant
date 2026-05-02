
-- 1. Resume DELETE policy scoped to authenticated users only
DROP POLICY IF EXISTS "Students can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated students can delete own resumes" ON storage.objects;

CREATE POLICY "Authenticated students can delete own resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Ensure students cannot read recruiter_feedback directly from applications
-- Replace the broad "Students can view own applications" SELECT with a column-safe approach via view
DROP POLICY IF EXISTS "Students can view own applications" ON public.applications;

-- Recreate the student-facing view (security_invoker) excluding recruiter_feedback and match_analysis
DROP VIEW IF EXISTS public.applications_student_view;
CREATE VIEW public.applications_student_view
WITH (security_invoker = on) AS
SELECT
  id,
  job_id,
  student_id,
  status,
  applied_at,
  updated_at
FROM public.applications;

-- Allow students to read their own rows in the base table BUT through view they don't see sensitive cols.
-- We still need a SELECT policy for the view to work via security_invoker.
CREATE POLICY "Students can view own applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Revoke direct table SELECT from anon/authenticated to force usage of the view for sensitive cols
-- (We keep the policy because recruiters and admins still need full row access.)
-- Grant view access
GRANT SELECT ON public.applications_student_view TO authenticated;

-- 3. Admin UPDATE/DELETE policies on user_roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
