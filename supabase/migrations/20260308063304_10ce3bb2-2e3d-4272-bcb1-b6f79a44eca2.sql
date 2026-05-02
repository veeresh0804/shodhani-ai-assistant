
-- Create triggers that were missing

-- Auto-assign recruiter role on recruiter profile creation
CREATE TRIGGER trigger_auto_assign_recruiter_role
AFTER INSERT ON public.recruiters
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_recruiter_role();

-- Auto-assign student role on student profile creation
CREATE TRIGGER trigger_auto_assign_student_role
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_student_role();

-- Updated_at triggers
CREATE TRIGGER trigger_update_recruiters_updated_at
BEFORE UPDATE ON public.recruiters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Increment applications count trigger
CREATE TRIGGER trigger_increment_applications_count
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.increment_applications_count();
