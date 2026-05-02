import React, { useState, useEffect } from 'react';
import { Kanban, Loader2, ArrowLeft, Users, ChevronRight, MessageSquare, Calendar, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PipelineCandidate {
  application_id: string;
  student_name: string;
  job_title: string;
  job_id: string;
  status: string;
  applied_at: string;
  feedback: string | null;
  has_interview: boolean;
}

const STAGES = ['pending', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];

const stageLabels: Record<string, string> = {
  pending: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
};

const stageBadgeClass: Record<string, string> = {
  pending: 'badge-warning',
  shortlisted: 'badge-primary',
  interview: 'badge-primary',
  offered: 'badge-success',
  hired: 'badge-success',
  rejected: 'badge-destructive',
};

const RecruiterCRMPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterJob, setFilterJob] = useState('all');
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetchData = async () => {
      const { data: jobsData } = await supabase.from('jobs').select('id, title').eq('recruiter_id', recruiterProfile.id);
      setJobs(jobsData || []);
      if (!jobsData || jobsData.length === 0) { setIsLoading(false); return; }

      const { data: apps } = await supabase.from('applications').select('id, student_id, job_id, status, applied_at, recruiter_feedback')
        .in('job_id', jobsData.map(j => j.id));
      const studentIds = [...new Set((apps || []).map((a) => a.student_id))];
      const { data: students } = await supabase.from('students').select('id, name').in('id', studentIds);
      const { data: interviews } = await supabase.from('interviews').select('application_id').in('application_id', (apps || []).map((a) => a.id));

      const studentMap = Object.fromEntries((students || []).map((s) => [s.id, s.name]));
      const jobMap = Object.fromEntries(jobsData.map(j => [j.id, j.title]));
      const interviewSet = new Set((interviews || []).map((i) => i.application_id));

      setCandidates((apps || []).map((a) => ({
        application_id: a.id,
        student_name: studentMap[a.student_id] || 'Unknown',
        job_title: jobMap[a.job_id] || 'Unknown',
        job_id: a.job_id,
        status: a.status,
        applied_at: a.applied_at,
        feedback: a.recruiter_feedback,
        has_interview: interviewSet.has(a.id),
      })));
      setIsLoading(false);
    };
    fetchData();
  }, [recruiterProfile?.id]);

  const handleStatusChange = async (candidate: PipelineCandidate, newStatus: string) => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', candidate.application_id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setCandidates(prev => prev.map(c => c.application_id === candidate.application_id ? { ...c, status: newStatus } : c));
    toast({ title: 'Status updated' });
  };

  const handleSaveFeedback = async () => {
    if (!selectedCandidate) return;
    setIsSaving(true);
    const { error } = await supabase.from('applications').update({ recruiter_feedback: feedbackText }).eq('id', selectedCandidate.application_id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else {
      setCandidates(prev => prev.map(c => c.application_id === selectedCandidate.application_id ? { ...c, feedback: feedbackText } : c));
      toast({ title: 'Feedback saved' });
    }
    setIsSaving(false);
  };

  const filteredCandidates = filterJob === 'all' ? candidates : candidates.filter(c => c.job_id === filterJob);
  const stagesWithCandidates = STAGES.map(stage => ({
    stage,
    label: stageLabels[stage],
    candidates: filteredCandidates.filter(c => c.status === stage),
  }));

  const timeAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };

  if (isLoading) {
    return <div className="min-h-screen pt-20 pb-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Kanban className="w-8 h-8 text-primary" /> Recruiter CRM
            </h1>
            <p className="text-muted-foreground">Manage your hiring pipeline</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterJob} onValueChange={setFilterJob}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Jobs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {stagesWithCandidates.map(s => (
            <Card key={s.stage} className="glass-card">
              <CardContent className="py-3 text-center">
                <p className="text-xl font-bold">{s.candidates.length}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stagesWithCandidates.filter(s => s.candidates.length > 0).map(s => (
                <div key={s.stage}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Badge className={stageBadgeClass[s.stage]}>{s.label}</Badge>
                    <span className="text-muted-foreground text-xs">{s.candidates.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {s.candidates.map(c => (
                      <Card key={c.application_id}
                        className={`cursor-pointer transition-all text-sm ${selectedCandidate?.application_id === c.application_id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                        onClick={() => { setSelectedCandidate(c); setFeedbackText(c.feedback || ''); }}>
                        <CardContent className="py-2 px-3">
                          <p className="font-medium text-sm">{c.student_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.job_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{timeAgo(c.applied_at)}</span>
                            {c.has_interview && <Calendar className="w-3 h-3 text-primary" />}
                            {c.feedback && <MessageSquare className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {filteredCandidates.length === 0 && (
              <Card className="glass-card mt-4"><CardContent className="py-8 text-center text-muted-foreground">No candidates in pipeline.</CardContent></Card>
            )}
          </div>

          {/* Detail Panel */}
          <div>
            {selectedCandidate ? (
              <Card className="glass-card sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{selectedCandidate.student_name}</CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {selectedCandidate.job_title}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Select value={selectedCandidate.status} onValueChange={(v) => handleStatusChange(selectedCandidate, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Applied</p>
                    <p className="text-sm">{new Date(selectedCandidate.applied_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes / Feedback</p>
                    <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} placeholder="Add notes about this candidate..." />
                    <Button size="sm" className="mt-2 w-full" onClick={handleSaveFeedback} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Select a candidate to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterCRMPage;
