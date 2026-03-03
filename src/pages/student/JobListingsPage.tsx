import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface JobWithRecruiter {
  id: string;
  title: string;
  location: string;
  job_type: string;
  required_skills: string[];
  salary_range: string | null;
  created_at: string;
  recruiters: { company_name: string } | null;
}

const JobListingsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobWithRecruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, location, job_type, required_skills, salary_range, created_at, recruiters(company_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setJobs((data as any) || []);
      setIsLoading(false);
    };
    fetchJobs();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            Job Openings
          </h1>
          <p className="text-muted-foreground mt-2">Browse available positions and check your eligibility</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No jobs available at the moment.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="glass-card-hover">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.recruiters?.company_name || 'Company'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{timeAgo(job.created_at)}</span>
                        <Badge variant="secondary">{job.job_type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <Badge key={skill} className="badge-primary">{skill}</Badge>
                        ))}
                      </div>
                      {job.salary_range && <p className="text-sm text-muted-foreground">💰 {job.salary_range}</p>}
                    </div>
                    <Link to={`/student/jobs/${job.id}`}>
                      <Button className="btn-primary gap-2">
                        View Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListingsPage;
