import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, Users, Clock, Building2, ChevronRight, Sparkles, BarChart3, Calendar, ShieldCheck, Code2, Kanban, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Job {
  id: string;
  title: string;
  location: string;
  job_type: string;
  status: string;
  applications_count: number;
  created_at: string;
}

const RecruiterDashboard: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, location, job_type, status, applications_count, created_at')
        .eq('recruiter_id', recruiterProfile.id)
        .order('created_at', { ascending: false });
      setJobs(data || []);
      setIsLoading(false);
    };
    fetchJobs();
  }, [recruiterProfile?.id]);

  const totalApps = jobs.reduce((sum, j) => sum + j.applications_count, 0);
  const activeJobs = jobs.filter(j => j.status === 'active').length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {recruiterProfile?.recruiter_name || 'Recruiter'}!</h1>
            <p className="text-muted-foreground mt-1">
              <Building2 className="w-4 h-4 inline mr-1" />
              {recruiterProfile?.company_name || 'Your Company'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/recruiter/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="w-5 h-5" /> Analytics
              </Button>
            </Link>
            <Link to="/recruiter/interviews">
              <Button variant="outline" className="gap-2">
                <Calendar className="w-5 h-5" /> Interviews
              </Button>
            </Link>
            <Link to="/recruiter/post-job">
              <Button className="btn-primary gap-2">
                <Plus className="w-5 h-5" /> Post New Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalApps}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeJobs}</p>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Listings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Your Job Postings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs posted yet. Click "Post New Job" to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.job_type}</span>
                        <span>•</span>
                        <span>{timeAgo(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={job.status === 'active' ? 'badge-success' : 'badge-muted'}>
                        {job.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{job.applications_count} applicants</span>
                      {job.applications_count > 0 && (
                        <Link to={`/recruiter/jobs/${job.id}/candidates`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Sparkles className="w-3 h-3" /> Rank
                          </Button>
                        </Link>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
