import React, { useEffect, useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import {
  Briefcase, FileSearch, CheckCircle2, Clock, TrendingUp,
  ArrowRight, Building2, MapPin, Star, AlertCircle, Calendar, XCircle, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { APPLICATION_STATUS } from '@/lib/constants';

/** Joined shapes returned by Supabase .select() with nested relations */
interface AppWithJob {
  id: string;
  status: string;
  applied_at: string;
  jobs: { title: string; recruiters: { company_name: string } | null } | null;
}

interface InterviewWithJob {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  status: string;
  jobs: { title: string; recruiters: { company_name: string } | null } | null;
}

interface JobWithRecruiter {
  id: string;
  title: string;
  location: string;
  job_type: string;
  required_skills: string[];
  recruiters: { company_name: string } | null;
}

const StudentDashboard: React.FC = () => {
  const { studentProfile } = useAuth();
  const profileStrength = studentProfile?.profile_complete ? 85 : 35;

type Job = Database['public']['Tables']['jobs']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];

  const [stats, setStats] = useState({ total: 0, pending: 0, shortlisted: 0, rejected: 0, interview: 0 });
  const [recentJobs, setRecentJobs] = useState<JobWithRecruiter[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<InterviewWithJob[]>([]);
  const [recentApps, setRecentApps] = useState<AppWithJob[]>([]);

  useEffect(() => {
    if (!studentProfile?.id) return;

    // Fetch application stats
    supabase
      .from('applications')
      .select('id, status, applied_at, jobs(title, recruiters(company_name))')
      .eq('student_id', studentProfile.id)
      .order('applied_at', { ascending: false })
      .then(({ data }) => {
        const apps = (data ?? []) as unknown as AppWithJob[];
        setStats({
          total: apps.length,
          pending: apps.filter(a => a.status === APPLICATION_STATUS.PENDING || a.status === APPLICATION_STATUS.UNDER_REVIEW).length,
          shortlisted: apps.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED).length,
          rejected: apps.filter(a => a.status === APPLICATION_STATUS.REJECTED).length,
          interview: apps.filter(a => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length,
        });
        setRecentApps(apps.slice(0, 5));
      });

    // Fetch upcoming interviews
    supabase
      .from('interviews')
      .select('id, scheduled_at, duration_minutes, meeting_link, status, jobs(title, recruiters(company_name))')
      .eq('student_id', studentProfile.id)
      .gte('scheduled_at', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(3)
      .then(({ data }) => setUpcomingInterviews((data ?? []) as unknown as InterviewWithJob[]));

    // Fetch recent jobs
    supabase
      .from('jobs')
      .select('id, title, location, job_type, required_skills, recruiters(company_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setRecentJobs((data ?? []) as unknown as JobWithRecruiter[]));
  }, [studentProfile?.id]);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {studentProfile?.name || 'Student'}!</h1>
            <p className="text-muted-foreground mt-1">{studentProfile?.institution || 'University'} • {studentProfile?.degree} {studentProfile?.branch}</p>
          </div>
          <Link to="/student/jobs">
            <Button className="btn-primary gap-2">
              <Briefcase className="w-5 h-5" /> Browse Jobs
            </Button>
          </Link>
        </div>

        {/* Stats & Profile Strength */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileSearch className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Applications</p>
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
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.shortlisted}</p>
                  <p className="text-sm text-muted-foreground">Shortlisted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Profile Strength</span>
                  <span className="text-sm font-bold">{profileStrength}%</span>
                </div>
                <Progress value={profileStrength} className="h-2" />
                {!studentProfile?.profile_complete && (
                  <Link to="/student/profile" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Complete your profile
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/student/profile">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Set Up Profile</h3>
                  <p className="text-sm text-muted-foreground">Add your platform links</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/student/career-path">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Career Path</h3>
                  <p className="text-sm text-muted-foreground">AI-powered career roadmap</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/student/portfolio">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">AI Portfolio</h3>
                  <p className="text-sm text-muted-foreground">Build your portfolio</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/student/interview-sim">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Mock Interview</h3>
                  <p className="text-sm text-muted-foreground">Practice with AI</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upcoming Interviews & Application Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Interviews */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Interviews
                </span>
                <Link to="/student/interviews">
                  <Button variant="ghost" size="sm" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No upcoming interviews scheduled.</div>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews.map((interview) => {
                    const date = new Date(interview.scheduled_at);
                    return (
                      <div key={interview.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                          <span className="text-xs font-semibold">{date.toLocaleDateString('en', { month: 'short' })}</span>
                          <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{interview.jobs?.title || 'Interview'}</h4>
                          <p className="text-xs text-muted-foreground">{interview.jobs?.recruiters?.company_name || 'Company'} • {date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {interview.meeting_link && (
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1"><Video className="w-3 h-3" /> Join</Button>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Status Summary */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-primary" />
                  Application Tracker
                </span>
                <Link to="/student/applications">
                  <Button variant="ghost" size="sm" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <Clock className="w-4 h-4 text-warning" />
                  <div><p className="text-lg font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <div><p className="text-lg font-bold">{stats.shortlisted}</p><p className="text-xs text-muted-foreground">Shortlisted</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div><p className="text-lg font-bold">{stats.interview}</p><p className="text-xs text-muted-foreground">Interviews</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <div><p className="text-lg font-bold">{stats.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
                </div>
              </div>
              {recentApps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                  {recentApps.slice(0, 3).map((app) => (
                    <div key={app.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <span className="truncate font-medium">{app.jobs?.title || 'Job'}</span>
                      <Badge variant={app.status === 'shortlisted' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs capitalize">{app.status?.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Latest Job Openings
              </span>
              <Link to="/student/jobs">
                <Button variant="ghost" size="sm" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No jobs available yet.</div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.recruiters?.company_name || 'Company'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {job.required_skills?.slice(0, 3).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <Link to={`/student/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
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

export default StudentDashboard;
