import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DEMO_JOBS = [
  { id: '1', title: 'Senior Full Stack Developer', company: 'TechCorp AI', location: 'Bangalore', type: 'Full-time', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], salary: '15-25 LPA', posted: '2 days ago' },
  { id: '2', title: 'ML Engineer', company: 'DataVerse Inc.', location: 'Remote', type: 'Full-time', skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps'], salary: '18-30 LPA', posted: '5 days ago' },
  { id: '3', title: 'Frontend Developer (React)', company: 'DesignLab', location: 'Hyderabad', type: 'Full-time', skills: ['React', 'TypeScript', 'Tailwind CSS'], salary: '10-18 LPA', posted: '1 week ago' },
  { id: '4', title: 'Backend Developer', company: 'CloudNine', location: 'Mumbai', type: 'Contract', skills: ['Java', 'Spring Boot', 'AWS', 'Microservices'], salary: '12-20 LPA', posted: '3 days ago' },
  { id: '5', title: 'DevOps Engineer', company: 'ScaleUp Tech', location: 'Pune', type: 'Full-time', skills: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform'], salary: '14-22 LPA', posted: '1 day ago' },
];

const JobListingsPage: React.FC = () => {
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

        <div className="space-y-4">
          {DEMO_JOBS.map((job) => (
            <Card key={job.id} className="glass-card-hover">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xl font-semibold">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{job.posted}</span>
                      <Badge variant="secondary">{job.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.skills.map((skill) => (
                        <Badge key={skill} className="badge-primary">{skill}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">💰 {job.salary}</p>
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
      </div>
    </div>
  );
};

export default JobListingsPage;
