import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, AlertTriangle, ExternalLink, Loader2, Sparkles, GraduationCap, Github, Code2, CheckCircle, XCircle, UserCheck, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ResumeSkills {
  technical_skills?: string[];
  soft_skills?: string[];
  certifications?: string[];
  experience_summary?: string;
  projects?: { name: string; description: string; technologies: string[] }[];
  skill_categories?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    devops?: string[];
    other?: string[];
  };
  overall_experience_level?: string;
  resume_score?: number;
}

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
  status?: string;
  resume_skills?: ResumeSkills | null;
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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedResume, setExpandedResume] = useState<Set<string>>(new Set());

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
      // Fetch current statuses for all applications
      const appIds = (data.candidates || []).map((c: any) => c.application_id);
      let statusMap: Record<string, string> = {};
      if (appIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, status')
          .in('id', appIds);
        if (apps) {
          statusMap = Object.fromEntries(apps.map((a) => [a.id, a.status]));
        }
      }
      const enriched = (data.candidates || []).map((c: any) => ({
        ...c,
        status: statusMap[c.application_id] || 'pending',
      }));
      setCandidates(enriched);
      setSummary(data.summary || '');
      setHasRanked(true);
      if (enriched.length === 0) {
        toast({ title: 'No applicants to rank yet' });
      } else {
        toast({ title: 'Ranking complete!', description: `${enriched.length} candidates ranked.` });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e.message || 'Failed to rank candidates', variant: 'destructive' });
    } finally {
      setIsRanking(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingStatus(applicationId);
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    } else {
      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === applicationId ? { ...c, status: newStatus } : c
        )
      );
      toast({ title: `Candidate ${newStatus}`, description: `Application status updated to ${newStatus}.` });
    }
    setUpdatingStatus(null);
  };

  const toggleResumeExpand = (appId: string) => {
    setExpandedResume(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white gap-1"><Trophy className="w-3 h-3" /> #1</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white gap-1"><Star className="w-3 h-3" /> #2</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600 text-white gap-1"><Star className="w-3 h-3" /> #3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'shortlisted':
        return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="w-3 h-3" /> Shortlisted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="gap-1"><UserCheck className="w-3 h-3" /> Pending</Badge>;
    }
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
                        <Progress value={c.score} className="h-1.5 w-16" />
                        {statusBadge(c.status || 'pending')}
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

                        <p className="text-sm bg-muted/50 rounded-lg p-3 italic">{c.recommendation}</p>

                        {/* Resume Skills Section */}
                        {c.resume_skills && (
                          <div className="border border-border/50 rounded-lg overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                              onClick={() => toggleResumeExpand(c.application_id)}
                            >
                              <span className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Resume Skills
                                {c.resume_skills.resume_score != null && (
                                  <Badge variant="secondary" className="text-xs">{c.resume_skills.resume_score}/100</Badge>
                                )}
                                {c.resume_skills.overall_experience_level && (
                                  <Badge variant="outline" className="text-xs capitalize">{c.resume_skills.overall_experience_level}</Badge>
                                )}
                              </span>
                              {expandedResume.has(c.application_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {expandedResume.has(c.application_id) && (
                              <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                                {c.resume_skills.experience_summary && (
                                  <p className="text-xs text-muted-foreground">{c.resume_skills.experience_summary}</p>
                                )}
                                {c.resume_skills.technical_skills && c.resume_skills.technical_skills.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Technical Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                      {c.resume_skills.technical_skills.map((s, i) => (
                                        <Badge key={i} className="badge-primary text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {c.resume_skills.skill_categories && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {c.resume_skills.skill_categories.languages && c.resume_skills.skill_categories.languages.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Languages</p>
                                        <div className="flex flex-wrap gap-1">
                                          {c.resume_skills.skill_categories.languages.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {c.resume_skills.skill_categories.frameworks && c.resume_skills.skill_categories.frameworks.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Frameworks</p>
                                        <div className="flex flex-wrap gap-1">
                                          {c.resume_skills.skill_categories.frameworks.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {c.resume_skills.skill_categories.databases && c.resume_skills.skill_categories.databases.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Databases</p>
                                        <div className="flex flex-wrap gap-1">
                                          {c.resume_skills.skill_categories.databases.map((s, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {c.resume_skills.skill_categories.devops && c.resume_skills.skill_categories.devops.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">DevOps</p>
                                        <div className="flex flex-wrap gap-1">
                                          {c.resume_skills.skill_categories.devops.map((s, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {c.resume_skills.certifications && c.resume_skills.certifications.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Certifications</p>
                                    <div className="flex flex-wrap gap-1">
                                      {c.resume_skills.certifications.map((s, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {c.resume_skills.projects && c.resume_skills.projects.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Projects</p>
                                    <div className="space-y-2">
                                      {c.resume_skills.projects.slice(0, 3).map((p, i) => (
                                        <div key={i} className="text-xs">
                                          <span className="font-medium">{p.name}</span>
                                          <span className="text-muted-foreground"> — {p.description}</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {p.technologies.map((t, j) => (
                                              <Badge key={j} variant="secondary" className="text-xs py-0">{t}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={c.status === 'shortlisted' || updatingStatus === c.application_id}
                            onClick={() => updateApplicationStatus(c.application_id, 'shortlisted')}
                          >
                            {updatingStatus === c.application_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            Shortlist
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                            disabled={c.status === 'rejected' || updatingStatus === c.application_id}
                            onClick={() => updateApplicationStatus(c.application_id, 'rejected')}
                          >
                            {updatingStatus === c.application_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Reject
                          </Button>
                          {c.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-muted-foreground"
                              disabled={updatingStatus === c.application_id}
                              onClick={() => updateApplicationStatus(c.application_id, 'pending')}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
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
