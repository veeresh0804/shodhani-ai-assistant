import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Video, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Interview {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  notes: string | null;
  status: string;
  job_title?: string;
  company_name?: string;
}

const InterviewsPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentProfile?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('scheduled_at', { ascending: true });

      if (data && data.length > 0) {
        const jobIds = [...new Set(data.map(d => d.job_id))];
        const recruiterIds = [...new Set(data.map(d => d.recruiter_id))];

        const [{ data: jobs }, { data: recruiters }] = await Promise.all([
          supabase.from('jobs').select('id, title').in('id', jobIds),
          supabase.from('recruiters').select('id, company_name').in('id', recruiterIds),
        ]);

        // Recruiters table has RLS that only allows own profile, so we may not get data
        const enriched = data.map(iv => ({
          ...iv,
          job_title: jobs?.find(j => j.id === iv.job_id)?.title || 'Position',
          company_name: recruiters?.find(r => r.id === iv.recruiter_id)?.company_name || 'Company',
        }));
        setInterviews(enriched);
      }
      setIsLoading(false);
    };
    fetch();
  }, [studentProfile?.id]);

  const statusColor = (s: string) => {
    if (s === 'scheduled') return 'badge-primary';
    if (s === 'completed') return 'badge-success';
    if (s === 'cancelled') return 'badge-destructive';
    return '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <Calendar className="w-8 h-8 text-primary" /> My Interviews
        </h1>

        {interviews.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="w-16 h-16 text-primary/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No interviews scheduled yet. You'll see them here once a recruiter schedules one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {interviews.map(iv => (
              <Card key={iv.id} className="glass-card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{iv.job_title}</h3>
                      <p className="text-sm text-muted-foreground">{iv.company_name}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(iv.scheduled_at), 'PPP')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(iv.scheduled_at), 'p')} · {iv.duration_minutes}min
                        </span>
                      </div>
                      {iv.meeting_link && (
                        <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                          <Video className="w-3 h-3" /> Join Meeting <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {iv.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{iv.notes}</p>}
                    </div>
                    <Badge className={statusColor(iv.status)}>{iv.status}</Badge>
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

export default InterviewsPage;
