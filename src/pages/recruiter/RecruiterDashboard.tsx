import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, Users, Clock, Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_JOBS = [
  { id: '1', title: 'Senior Full Stack Developer', location: 'Bangalore', jobType: 'Full-time', status: 'active', applications: 24, created: '2 days ago' },
  { id: '2', title: 'ML Engineer', location: 'Remote', jobType: 'Full-time', status: 'active', applications: 18, created: '5 days ago' },
  { id: '3', title: 'Frontend Developer (React)', location: 'Hyderabad', jobType: 'Full-time', status: 'closed', applications: 42, created: '2 weeks ago' },
];

const RecruiterDashboard: React.FC = () => {
  const { recruiterProfile } = useAuth();

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {recruiterProfile?.recruiterName || 'Recruiter'}!</h1>
            <p className="text-muted-foreground mt-1">
              <Building2 className="w-4 h-4 inline mr-1" />
              {recruiterProfile?.companyName || 'Your Company'}
            </p>
          </div>
          <Link to="/recruiter/post-job">
            <Button className="btn-primary gap-2">
              <Plus className="w-5 h-5" /> Post New Job
            </Button>
          </Link>
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
                  <p className="text-2xl font-bold">{DEMO_JOBS.length}</p>
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
                  <p className="text-2xl font-bold">{DEMO_JOBS.reduce((sum, j) => sum + j.applications, 0)}</p>
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
                  <p className="text-2xl font-bold">{DEMO_JOBS.filter(j => j.status === 'active').length}</p>
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
            <div className="space-y-4">
              {DEMO_JOBS.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.jobType}</span>
                      <span>•</span>
                      <span>{job.created}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={job.status === 'active' ? 'badge-success' : 'badge-muted'}>
                      {job.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{job.applications} applicants</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
