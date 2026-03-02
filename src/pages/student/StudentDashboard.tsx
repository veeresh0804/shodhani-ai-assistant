import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, FileSearch, CheckCircle2, Clock, TrendingUp,
  ArrowRight, Building2, MapPin, Star, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

const DEMO_JOBS = [
  { id: '1', title: 'Senior Full Stack Developer', company: 'TechCorp AI', location: 'Bangalore', type: 'Full-time', skills: ['React', 'Node.js', 'TypeScript'] },
  { id: '2', title: 'ML Engineer', company: 'DataVerse Inc.', location: 'Remote', type: 'Full-time', skills: ['Python', 'TensorFlow', 'PyTorch'] },
  { id: '3', title: 'Frontend Developer', company: 'DesignLab', location: 'Hyderabad', type: 'Full-time', skills: ['React', 'CSS', 'JavaScript'] },
  { id: '4', title: 'Backend Developer', company: 'CloudNine', location: 'Mumbai', type: 'Contract', skills: ['Java', 'Spring Boot', 'AWS'] },
];

const StudentDashboard: React.FC = () => {
  const { studentProfile } = useAuth();
  const profileStrength = studentProfile?.profileComplete ? 85 : 35;

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
                  <p className="text-2xl font-bold">0</p>
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
                  <p className="text-2xl font-bold">0</p>
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
                  <p className="text-2xl font-bold">0</p>
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
                {!studentProfile?.profileComplete && (
                  <Link to="/student/profile" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Complete your profile
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/student/profile">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Set Up Your Profile</h3>
                  <p className="text-sm text-muted-foreground">Add your LeetCode, GitHub, LinkedIn links</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/student/jobs">
            <Card className="glass-card-hover cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Check Job Eligibility</h3>
                  <p className="text-sm text-muted-foreground">See if your skills match open positions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
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
            <div className="space-y-4">
              {DEMO_JOBS.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {job.skills.map((skill) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
