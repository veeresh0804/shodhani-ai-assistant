import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Video, Plus, Loader2, Trash2, ExternalLink, List, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import InterviewCalendarView from '@/components/recruiter/InterviewCalendarView';

interface Interview {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  notes: string | null;
  status: string;
  application_id: string;
  student_name?: string;
  student_email?: string;
  job_title?: string;
}

interface ShortlistedApp {
  id: string;
  job_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  job_title: string;
}

const InterviewSchedulePage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [shortlisted, setShortlisted] = useState<ShortlistedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    application_id: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_link: '',
    notes: '',
  });

  useEffect(() => {
    if (!recruiterProfile?.id) { setIsLoading(false); return; }
    const fetchData = async () => {
      // Fetch interviews
      const { data: interviewsData } = await supabase
        .from('interviews')
        .select('*')
        .eq('recruiter_id', recruiterProfile.id)
        .order('scheduled_at', { ascending: true });

      // Fetch shortlisted applications for this recruiter's jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('recruiter_id', recruiterProfile.id);

      if (jobs && jobs.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, job_id, student_id')
          .in('job_id', jobs.map(j => j.id))
          .eq('status', 'shortlisted');

        if (apps && apps.length > 0) {
          const studentIds = [...new Set(apps.map(a => a.student_id))];
          const { data: students } = await supabase
            .from('students')
            .select('id, name, email')
            .in('id', studentIds);

          const enriched: ShortlistedApp[] = apps.map(app => {
            const student = students?.find(s => s.id === app.student_id);
            const job = jobs.find(j => j.id === app.job_id);
            return {
              id: app.id,
              job_id: app.job_id,
              student_id: app.student_id,
              student_name: student?.name || 'Unknown',
              student_email: student?.email || '',
              job_title: job?.title || 'Unknown',
            };
          });
          setShortlisted(enriched);

          // Enrich interviews
          if (interviewsData) {
            const enrichedInterviews = interviewsData.map(iv => {
              const app = enriched.find(a => a.id === iv.application_id);
              return {
                ...iv,
                student_name: app?.student_name,
                student_email: app?.student_email,
                job_title: app?.job_title,
              };
            });
            setInterviews(enrichedInterviews);
          }
        } else {
          setInterviews(interviewsData || []);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, [recruiterProfile?.id]);

  const handleSchedule = async () => {
    if (!recruiterProfile?.id || !form.application_id || !form.scheduled_at) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    const app = shortlisted.find(a => a.id === form.application_id);
    if (!app) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        application_id: form.application_id,
        job_id: app.job_id,
        student_id: app.student_id,
        recruiter_id: recruiterProfile.id,
        scheduled_at: form.scheduled_at,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        meeting_link: form.meeting_link || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error scheduling', description: error.message, variant: 'destructive' });
    } else if (data) {
      setInterviews(prev => [...prev, { ...data, student_name: app.student_name, student_email: app.student_email, job_title: app.job_title }]);
      toast({ title: 'Interview scheduled!' });
      setForm({ application_id: '', scheduled_at: '', duration_minutes: '60', meeting_link: '', notes: '' });
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  const cancelInterview = async (id: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'cancelled' }).eq('id', id);
    if (!error) {
      setInterviews(prev => prev.map(iv => iv.id === id ? { ...iv, status: 'cancelled' } : iv));
      toast({ title: 'Interview cancelled' });
    }
  };

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" /> Interview Scheduler
          </h1>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2" disabled={shortlisted.length === 0}>
                <Plus className="w-4 h-4" /> Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Interview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Candidate</Label>
                  <Select value={form.application_id} onValueChange={v => setForm(f => ({ ...f, application_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select shortlisted candidate" /></SelectTrigger>
                    <SelectContent>
                      {shortlisted.map(app => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.student_name} — {app.job_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                </div>
                <div>
                  <Label>Meeting Link (optional)</Label>
                  <Input placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Interview instructions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button className="btn-primary w-full" onClick={handleSchedule} disabled={isSaving}>
                  {isSaving ? 'Scheduling...' : 'Schedule'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="w-4 h-4" /> Calendar</TabsTrigger>
            <TabsTrigger value="list" className="gap-2"><List className="w-4 h-4" /> List</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <InterviewCalendarView interviews={interviews} onCancel={cancelInterview} />
          </TabsContent>

          <TabsContent value="list">
            {interviews.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="pt-6 text-center py-12">
                  <Calendar className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No interviews scheduled yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {interviews.map(iv => (
                  <Card key={iv.id} className="glass-card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{iv.student_name || 'Candidate'}</h3>
                          <p className="text-sm text-muted-foreground">{iv.student_email}</p>
                          <p className="text-sm text-muted-foreground">{iv.job_title}</p>
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
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColor(iv.status)}>{iv.status}</Badge>
                          {iv.status === 'scheduled' && (
                            <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => cancelInterview(iv.id)}>
                              <Trash2 className="w-3 h-3" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InterviewSchedulePage;
