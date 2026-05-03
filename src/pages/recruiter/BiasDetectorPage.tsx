import React, { useState, useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Loader2, FileText, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { describeEdgeError } from '@/lib/edgeError';
import { logger } from '@/lib/logger';

type Job = Pick<Database['public']['Tables']['jobs']['Row'], 'id' | 'title' | 'description' | 'required_skills'>;

const BiasDetectorPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    supabase.from('jobs').select('id, title, description, required_skills')
      .eq('recruiter_id', recruiterProfile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setJobs(data || []));
  }, [recruiterProfile?.id]);

  const analyze = async () => {
    const job = jobs.find(j => j.id === selectedJob);
    if (!job) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('bias-detect', {
        body: { job_description: job.description, job_title: job.title, required_skills: job.required_skills },
      });
      if (error) throw error;
      if (data?.error) throw new Error(JSON.stringify(data));
      setResult(data);
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Analysis failed', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ratingColor = (rating: string) => {
    if (rating === 'excellent') return 'text-green-600';
    if (rating === 'good') return 'text-blue-600';
    if (rating === 'needs_improvement') return 'text-yellow-600';
    return 'text-red-600';
  };

  const severityBadge = (severity: string) => {
    if (severity === 'high') return 'bg-destructive/20 text-destructive';
    if (severity === 'medium') return 'bg-warning/20 text-warning';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/recruiter/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Hiring Bias Detector</h1>
        </div>
        <p className="text-muted-foreground mb-8">Analyze your job descriptions for unconscious bias and get inclusive alternatives.</p>

        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select a Job Posting</label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger><SelectValue placeholder="Choose a job to analyze..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.map(j => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={analyze} disabled={!selectedJob || isAnalyzing} className="btn-primary gap-2">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {isAnalyzing ? 'Analyzing...' : 'Detect Bias'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <p className={`text-4xl font-bold ${result.bias_score > 50 ? 'text-destructive' : result.bias_score > 25 ? 'text-warning' : 'text-green-600'}`}>
                    {result.bias_score}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Bias Score</p>
                  <p className="text-xs text-muted-foreground">(lower is better)</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <p className={`text-4xl font-bold ${ratingColor(result.overall_rating)}`}>
                    {result.inclusive_score}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Inclusivity Score</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6 text-center">
                  <Badge className={`text-lg px-4 py-1 capitalize ${ratingColor(result.overall_rating)}`}>
                    {result.overall_rating?.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">Overall Rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">{result.summary}</p>
              </CardContent>
            </Card>

            {/* Findings */}
            {result.findings?.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" /> Bias Findings ({result.findings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.findings.map((f: { severity: string; category: string; problematic_text?: string; explanation: string; suggestion: string }, i: number) => (
                      <div key={`bias-${i}`} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={severityBadge(f.severity)}>{f.severity}</Badge>
                          <Badge variant="outline" className="capitalize">{f.category}</Badge>
                        </div>
                        {f.problematic_text && (
                          <p className="text-sm bg-destructive/10 text-destructive p-2 rounded mb-2 font-mono">"{f.problematic_text}"</p>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">{f.explanation}</p>
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-green-700">{f.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rewritten Sections */}
            {result.rewritten_sections?.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" /> Suggested Rewrites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.rewritten_sections.map((s: { original: string; improved: string }, i: number) => (
                      <div key={`sug-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Original</p>
                          <p className="text-sm">{s.original}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Improved</p>
                          <p className="text-sm">{s.improved}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {jobs.length === 0 && !isAnalyzing && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No job postings found. Post a job first to analyze it for bias.</p>
              <Link to="/recruiter/post-job"><Button className="mt-4 btn-primary">Post a Job</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BiasDetectorPage;
