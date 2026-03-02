import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Clock, Briefcase, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const JOB_DATA: Record<string, any> = {
  '1': { title: 'Senior Full Stack Developer', company: 'TechCorp AI', location: 'Bangalore', type: 'Full-time', salary: '15-25 LPA', experience: '2-5 years',
    description: 'We are looking for a Senior Full Stack Developer to join our AI-powered recruitment platform team. You will work on building scalable web applications using React, Node.js, and TypeScript.',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    preferredSkills: ['GraphQL', 'Docker', 'AWS'],
  },
  '2': { title: 'ML Engineer', company: 'DataVerse Inc.', location: 'Remote', type: 'Full-time', salary: '18-30 LPA', experience: '3+ years',
    description: 'Join our ML team to build and deploy production machine learning models. Experience with NLP, deep learning, and MLOps required.',
    requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps'],
    preferredSkills: ['NLP', 'Computer Vision', 'Kubeflow'],
  },
};

const JobDetailPage: React.FC = () => {
  const { jobId } = useParams();
  const job = JOB_DATA[jobId || '1'] || JOB_DATA['1'];

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
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.company}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{job.experience}</span>
                <Badge variant="secondary">{job.type}</Badge>
              </div>
              <p className="text-muted-foreground">💰 {job.salary}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Job Description</h3>
              <p className="text-muted-foreground">{job.description}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill: string) => (
                  <Badge key={skill} className="badge-primary">{skill}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Preferred Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.preferredSkills.map((skill: string) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button className="btn-primary gap-2">
                <CheckCircle2 className="w-4 h-4" /> Apply Now
              </Button>
              <Link to={`/student/jobs/${jobId}/eligibility`}>
                <Button variant="outline" className="gap-2">
                  <Briefcase className="w-4 h-4" /> Check Eligibility
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
