
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to notify student on shortlist
CREATE OR REPLACE FUNCTION public.notify_student_on_shortlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_user_id uuid;
  v_job_title text;
  v_company text;
BEGIN
  IF NEW.status = 'shortlisted' AND (OLD.status IS NULL OR OLD.status != 'shortlisted') THEN
    SELECT s.user_id INTO v_student_user_id
    FROM students s WHERE s.id = NEW.student_id;

    SELECT j.title INTO v_job_title
    FROM jobs j WHERE j.id = NEW.job_id;

    SELECT r.company_name INTO v_company
    FROM recruiters r
    JOIN jobs j ON j.recruiter_id = r.id
    WHERE j.id = NEW.job_id;

    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_student_user_id,
        'You''ve been shortlisted!',
        'Congratulations! You have been shortlisted for ' || COALESCE(v_job_title, 'a position') || ' at ' || COALESCE(v_company, 'a company') || '.',
        'shortlisted',
        '/student/applications'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to notify student on interview scheduled
CREATE OR REPLACE FUNCTION public.notify_student_on_interview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_user_id uuid;
  v_job_title text;
  v_company text;
BEGIN
  SELECT s.user_id INTO v_student_user_id
  FROM students s WHERE s.id = NEW.student_id;

  SELECT j.title INTO v_job_title
  FROM jobs j WHERE j.id = NEW.job_id;

  SELECT r.company_name INTO v_company
  FROM recruiters r WHERE r.id = NEW.recruiter_id;

  IF v_student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_student_user_id,
      'Interview Scheduled',
      'An interview for ' || COALESCE(v_job_title, 'a position') || ' at ' || COALESCE(v_company, 'a company') || ' has been scheduled on ' || to_char(NEW.scheduled_at, 'Mon DD, YYYY at HH12:MI AM') || '.',
      'interview',
      '/student/interviews'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER on_application_shortlisted
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_student_on_shortlist();

CREATE TRIGGER on_interview_created
  AFTER INSERT ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_student_on_interview();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
