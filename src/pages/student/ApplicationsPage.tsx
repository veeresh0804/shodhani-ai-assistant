import React, { useEffect, useState } from 'react';
import { FileSearch, Clock, CheckCircle2, XCircle, Building2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationWithJob {
  id: string;
  status: string;
  applied_at: string;
  jobs: { title: string; recruiters: { company_name: string } | null } | null;
}

const statusConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', class: 'badge-warning', icon: Clock },
  under_review: { label: 'Under Review', class: 'badge-primary', icon: FileSearch },
  shortlisted: { label: 'Shortlisted', class: 'badge-success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', class: 'badge-destructive', icon: XCircle },
  interview_scheduled: { label: 'Interview', class: 'badge-success', icon: Calendar },
};

const ApplicationsPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentProfile?.id) return;
    const fetchApps = async () => {
      const { data } = await supabase
        .from('applications')
        .select('id, status, applied_at, jobs(title, recruiters(company_name))')
        .eq('student_id', studentProfile.id)
        .order('applied_at', { ascending: false });
      setApplications((data ?? []) as unknown as ApplicationWithJob[]);
      setIsLoading(false);
    };
    fetchApps();
  }, [studentProfile?.id]);

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
            <FileSearch className="w-8 h-8 text-primary" />
            My Applications
          </h1>
          <p className="text-muted-foreground mt-2">Track the status of your job applications</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No applications yet. Browse jobs to get started!</div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const config = statusConfig[app.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <Card key={app.id} className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{app.jobs?.title || 'Job'}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{app.jobs?.recruiters?.company_name || 'Company'} • Applied {timeAgo(app.applied_at)}
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
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
