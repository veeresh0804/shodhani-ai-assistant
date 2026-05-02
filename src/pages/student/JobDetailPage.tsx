import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Clock, CheckCircle2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JobDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_required: string | null;
  required_skills: string[];
  preferred_skills: string[] | null;
  salary_range: string | null;
  recruiters: { company_name: string } | null;
}

const JobDetailPage: React.FC = () => {
  const { jobId } = useParams();
  const { studentProfile } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, description, location, job_type, experience_required, required_skills, preferred_skills, salary_range, recruiters(company_name)')
        .eq('id', jobId)
        .single();
      setJob(data as any);
      setIsLoading(false);
    };
    fetchJob();

    // Check if already applied
    if (studentProfile?.id) {
      supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('student_id', studentProfile.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setHasApplied(true);
        });
    }
  }, [jobId, studentProfile?.id]);

  const handleApply = async () => {
    if (!studentProfile?.id || !jobId) {
      toast({ title: 'Please complete your profile first', variant: 'destructive' });
      return;
    }
    if (!studentProfile.profile_complete) {
      toast({ title: 'Incomplete profile', description: 'Please complete your profile before applying.', variant: 'destructive' });
      return;
    }
    setIsApplying(true);
    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      student_id: studentProfile.id,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already applied to this job' });
      } else {
        toast({ title: 'Error applying', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Application submitted!', description: 'You can track it in My Applications.' });
      setHasApplied(true);
    }
    setIsApplying(false);
  };

  if (isLoading) {
    return <div className="min-h-screen pt-20 pb-12 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!job) {
    return <div className="min-h-screen pt-20 pb-12 flex items-center justify-center text-muted-foreground">Job not found</div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/student/jobs">
          <Button variant="ghost" className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs</Button>
        </Link>

        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="space-y-3">
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.recruiters?.company_name || 'Company'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                {job.experience_required && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{job.experience_required}</span>}
                <Badge variant="secondary">{job.job_type}</Badge>
              </div>
              {job.salary_range && <p className="text-muted-foreground">💰 {job.salary_range}</p>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Job Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(job.required_skills ?? []).map((skill: string) => (
                  <Badge key={skill} className="badge-primary">{skill}</Badge>
                ))}
              </div>
            </div>

            {job.preferred_skills && job.preferred_skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.preferred_skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button className="btn-primary gap-2" onClick={handleApply} disabled={isApplying || hasApplied}>
                <CheckCircle2 className="w-4 h-4" />
                {hasApplied ? 'Already Applied' : isApplying ? 'Applying...' : 'Apply Now'}
              </Button>
              <Link to={`/student/jobs/${jobId}/eligibility`}>
                <Button variant="outline" className="gap-2">
                  <Target className="w-4 h-4" /> Check Eligibility
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetailPage;
