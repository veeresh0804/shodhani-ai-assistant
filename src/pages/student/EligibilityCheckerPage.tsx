import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, CheckCircle, XCircle, Target, BookOpen, Lightbulb, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { describeEdgeError } from '@/lib/edgeError';
import { logger } from '@/lib/logger';

interface Resource {
  title: string;
  url?: string;
  type: string;
}

interface RoadmapItem {
  skill: string;
  priority: string;
  timeline: string;
  resources: Resource[];
  description: string;
}

interface EligibilityResult {
  match_percentage: number;
  verdict: string;
  verdict_detail: string;
  matched_skills: string[];
  missing_skills: string[];
  roadmap: RoadmapItem[];
  tips: string[];
}

const EligibilityCheckerPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { toast } = useToast();

  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const runCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('eligibility-check', {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Check failed', description: describeEdgeError(data), variant: 'destructive' });
        return;
      }
      setResult(data);
      setHasChecked(true);
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Error', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsChecking(false);
    }
  };

  const matchColor = (pct: number) => {
    if (pct >= 75) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-500';
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (p === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to={`/student/jobs/${jobId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Job
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              Eligibility Checker
            </h1>
            <p className="text-muted-foreground mt-1">See how well your profile matches this job</p>
          </div>
          <Button className="btn-primary gap-2" onClick={runCheck} disabled={isChecking}>
            {isChecking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : hasChecked ? (
              <><Sparkles className="w-4 h-4" /> Re-check</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Check Eligibility</>
            )}
          </Button>
        </div>

        {!hasChecked && !isChecking && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-16">
              <Target className="w-16 h-16 text-primary/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Check Your Fit</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                AI will analyze your profile against the job requirements and provide a personalized skill gap roadmap.
              </p>
            </CardContent>
          </Card>
        )}

        {isChecking && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-16">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analyzing Your Profile...</h3>
              <p className="text-muted-foreground">Comparing your skills and experience against the job requirements</p>
            </CardContent>
          </Card>
        )}

        {hasChecked && result && (
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`text-5xl font-bold ${matchColor(result.match_percentage)}`}>
                      {result.match_percentage}%
                    </span>
                    <Progress value={result.match_percentage} className="h-2 w-32" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <Badge className="mb-2 text-sm">{result.verdict}</Badge>
                    <p className="text-muted-foreground">{result.verdict_detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matched & Missing Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" /> Skills You Have
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.matched_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.matched_skills.map((s, i) => (
                        <Badge key={`match-${s}-${i}`} className="bg-green-100 text-green-800">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No matching skills identified yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" /> Skills to Develop
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((s, i) => (
                        <Badge key={`gap-${s}-${i}`} variant="outline" className="text-red-600 border-red-300">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Great — no major skill gaps!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Learning Roadmap */}
            {result.roadmap.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> Learning Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.roadmap.map((item, i) => (
                    <div key={`res-${i}`} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{item.skill}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColor(item.priority)}>{item.priority} priority</Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" /> {item.timeline}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.resources.length > 0 && (
                        <div className="space-y-1.5">
                          {item.resources.map((res, j) => (
                            <div key={`step-${j}`} className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="text-xs shrink-0">{res.type}</Badge>
                              {res.url ? (
                                <a href={res.url} target="_blank" rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1">
                                  {res.title} <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span>{res.title}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            {result.tips.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" /> Tips to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <li key={`tip-${i}`} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EligibilityCheckerPage;
