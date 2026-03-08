import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, AlertTriangle, ExternalLink, Loader2, Sparkles, GraduationCap, Github, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface RankedCandidate {
  application_id: string;
  student_id: string;
  name: string;
  email: string;
  score: number;
  rank: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  institution: string;
  degree: string;
  branch: string;
  graduation_year: number;
  github_url: string | null;
  leetcode_url: string | null;
  linkedin_url: string | null;
}

interface JobInfo {
  id: string;
  title: string;
  applications_count: number;
}

const CandidateRankingPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { recruiterProfile } = useAuth();

  const [job, setJob] = useState<JobInfo | null>(null);
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRanking, setIsRanking] = useState(false);
  const [hasRanked, setHasRanked] = useState(false);

  useEffect(() => {
    if (!jobId || !recruiterProfile?.id) return;
    const fetchJob = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, applications_count')
        .eq('id', jobId)
        .eq('recruiter_id', recruiterProfile.id)
        .maybeSingle();
      if (data) setJob(data);
      else {
        toast({ title: 'Job not found', variant: 'destructive' });
        navigate('/recruiter/dashboard');
      }
      setIsLoading(false);
    };
    fetchJob();
  }, [jobId, recruiterProfile?.id]);

  const runRanking = async () => {
    setIsRanking(true);
    try {
      const { data, error } = await supabase.functions.invoke('rank-candidates', {
        body: { job_id: jobId },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Ranking failed', description: data.error, variant: 'destructive' });
        return;
      }

      setCandidates(data.candidates || []);
      setSummary(data.summary || '');
      setHasRanked(true);

      if (data.candidates?.length === 0) {
        toast({ title: 'No applicants to rank yet', description: 'Wait for students to apply.' });
      } else {
        toast({ title: 'Ranking complete!', description: `${data.candidates.length} candidates ranked.` });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e.message || 'Failed to rank candidates', variant: 'destructive' });
    } finally {
      setIsRanking(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white gap-1"><Trophy className="w-3 h-3" /> #1</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white gap-1"><Star className="w-3 h-3" /> #2</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600 text-white gap-1"><Star className="w-3 h-3" /> #3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
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

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              AI Candidate Ranking
            </h1>
            <p className="text-muted-foreground mt-1">
              {job?.title} — {job?.applications_count || 0} applicant(s)
            </p>
          </div>
          <Button className="btn-primary gap-2" onClick={runRanking} disabled={isRanking}>
            {isRanking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : hasRanked ? (
              <><Sparkles className="w-4 h-4" /> Re-rank Candidates</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Rank Candidates</>
            )}
          </Button>
        </div>

        {summary && (
          <Card className="glass-card mb-6">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed">{summary}</p>
            </CardContent>
          </Card>
        )}

        {!hasRanked && !isRanking && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-16">
              <Sparkles className="w-16 h-16 text-primary/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Rank</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Click "Rank Candidates" to use AI to analyze all applicants and rank them based on job fit, skills, and profile data.
              </p>
            </CardContent>
          </Card>
        )}

        {isRanking && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-16">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analyzing Candidates...</h3>
              <p className="text-muted-foreground">AI is reviewing profiles and matching against job requirements</p>
            </CardContent>
          </Card>
        )}

        {hasRanked && candidates.length > 0 && (
          <div className="space-y-4">
            {candidates
              .sort((a, b) => a.rank - b.rank)
              .map((c) => (
                <Card key={c.application_id} className="glass-card-hover">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Left: Rank & Score */}
                      <div className="flex flex-col items-center gap-2 md:w-24 shrink-0">
                        {rankBadge(c.rank)}
                        <span className={`text-2xl font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                        <Progress value={c.score} className={`h-1.5 w-16 [&>div]:${scoreBg(c.score)}`} />
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{c.name}</h3>
                            <p className="text-sm text-muted-foreground">{c.email}</p>
                          </div>
                          <div className="flex gap-2">
                            {c.github_url && (
                              <a href={c.github_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                                  <Github className="w-3 h-3" /> GitHub
                                </Badge>
                              </a>
                            )}
                            {c.leetcode_url && (
                              <a href={c.leetcode_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                                  <Code2 className="w-3 h-3" /> LeetCode
                                </Badge>
                              </a>
                            )}
                            {c.linkedin_url && (
                              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                                  <ExternalLink className="w-3 h-3" /> LinkedIn
                                </Badge>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="w-4 h-4" />
                          <span>{c.degree} in {c.branch} — {c.institution} ({c.graduation_year})</span>
                        </div>

                        {/* Strengths */}
                        {c.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.strengths.map((s, i) => (
                                <Badge key={i} className="bg-green-100 text-green-800 text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gaps */}
                        {c.gaps.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Gaps</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.gaps.map((g, i) => (
                                <Badge key={i} variant="outline" className="text-orange-600 border-orange-300 text-xs gap-1">
                                  <AlertTriangle className="w-3 h-3" />{g}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendation */}
                        <p className="text-sm bg-muted/50 rounded-lg p-3 italic">{c.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {hasRanked && candidates.length === 0 && !isRanking && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No applicants found for this job yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidateRankingPage;
