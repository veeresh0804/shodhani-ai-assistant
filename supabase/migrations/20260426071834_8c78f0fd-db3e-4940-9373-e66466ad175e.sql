
DROP POLICY IF EXISTS "Recruiters can update applications for their jobs" ON public.applications;

CREATE POLICY "Recruiters can update applications for their jobs"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    WHERE j.recruiter_id IN (SELECT r.id FROM public.recruiters r WHERE r.user_id = auth.uid())
  )
)
WITH CHECK (
  job_id IN (
    SELECT j.id FROM public.jobs j
    WHERE j.recruiter_id IN (SELECT r.id FROM public.recruiters r WHERE r.user_id = auth.uid())
  )
);

-- Trigger to lock immutable fields (student_id, job_id, applied_at) on update
CREATE OR REPLACE FUNCTION public.lock_application_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'student_id is immutable';
  END IF;
  IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'job_id is immutable';
  END IF;
  IF NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
    RAISE EXCEPTION 'applied_at is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_application_identity_trg ON public.applications;
CREATE TRIGGER lock_application_identity_trg
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.lock_application_identity();
