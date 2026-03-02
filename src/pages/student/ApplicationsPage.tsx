import React from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Clock, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DEMO_APPLICATIONS = [
  { id: '1', jobTitle: 'Senior Full Stack Developer', company: 'TechCorp AI', status: 'under_review', appliedDate: '2 days ago' },
  { id: '2', jobTitle: 'Frontend Developer', company: 'DesignLab', status: 'shortlisted', appliedDate: '1 week ago' },
  { id: '3', jobTitle: 'Backend Developer', company: 'CloudNine', status: 'rejected', appliedDate: '2 weeks ago' },
];

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: 'Pending', class: 'badge-warning', icon: Clock },
  under_review: { label: 'Under Review', class: 'badge-primary', icon: FileSearch },
  shortlisted: { label: 'Shortlisted', class: 'badge-success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', class: 'badge-destructive', icon: XCircle },
};

const ApplicationsPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSearch className="w-8 h-8 text-primary" />
            My Applications
          </h1>
          <p className="text-muted-foreground mt-2">Track the status of your job applications</p>
        </div>

        <div className="space-y-4">
          {DEMO_APPLICATIONS.map((app) => {
            const config = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={app.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{app.jobTitle}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{app.company} • Applied {app.appliedDate}
                      </p>
                    </div>
                    <Badge className={config.class}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsPage;
