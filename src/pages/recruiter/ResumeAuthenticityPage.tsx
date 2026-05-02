import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, ArrowLeft, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { describeEdgeError } from '@/lib/edgeError';
import { logger } from '@/lib/logger';

interface StudentEntry {
  id: string;
  name: string;
  institution: string;
  profile: Record<string, unknown> | null;
}

interface AuthenticityResult {
  authenticity_score: number;
  risk_level: string;
  signals: { type: string; category: string; message: string }[];
  summary: string;
  recommendations: string[];
}

const ResumeAuthenticityPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentEntry | null>(null);
  const [result, setResult] = useState<AuthenticityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetch = async () => {
      const { data: studs } = await supabase.from('students').select('id, name, institution');
      const { data: profiles } = await supabase.from('student_profiles').select('student_id, github_data, leetcode_data, resume_skills, gemini_analysis, github_url, leetcode_url');
      if (!studs) { setIsLoading(false); return; }
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.student_id, p]));
      setStudents(studs.map((s) => ({ id: s.id, name: s.name, institution: s.institution, profile: profileMap[s.id] || null })));
      setIsLoading(false);
    };
    fetch();
  }, [recruiterProfile?.id]);

  const handleCheck = async (student: StudentEntry) => {
    setSelectedStudent(student);
    setResult(null);
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('authenticity-check', {
        body: { student_profile: { name: student.name, institution: student.institution, ...student.profile } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(JSON.stringify(data));
      setResult(data);
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Error', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsChecking(false);
    }
  };

  const filtered = students.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.institution.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const riskIcon = (level: string) => {
    if (level === 'low') return <ShieldCheck className="w-6 h-6 text-green-600" />;
    if (level === 'medium') return <ShieldAlert className="w-6 h-6 text-yellow-600" />;
    return <ShieldX className="w-6 h-6 text-destructive" />;
  };

  const signalIcon = (type: string) => {
    if (type === 'positive') return <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />;
    return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-primary" /> Resume Authenticity Detector
        </h1>
        <p className="text-muted-foreground mb-8">AI-powered verification of candidate credentials and skill claims.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student List */}
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : filtered.map(s => (
                <Card key={s.id} className={`cursor-pointer transition-all ${selectedStudent?.id === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => handleCheck(s)}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.institution}</p>
                    </div>
                    {s.profile ? (
                      <Badge variant="outline" className="text-xs">Has Profile</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">No Data</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            {isChecking && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Analyzing {selectedStudent?.name}'s profile...</p>
                </CardContent>
              </Card>
            )}
            {result && !isChecking && (
              <div className="space-y-4">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      {riskIcon(result.risk_level)}
                      <div>
                        <span className={`text-3xl font-bold ${scoreColor(result.authenticity_score)}`}>{result.authenticity_score}%</span>
                        <p className="text-sm text-muted-foreground">Authenticity Score</p>
                      </div>
                      <Badge className={`ml-auto capitalize ${result.risk_level === 'low' ? 'badge-success' : result.risk_level === 'medium' ? 'badge-warning' : 'badge-destructive'}`}>
                        {result.risk_level} risk
                      </Badge>
                    </div>
                    <Progress value={result.authenticity_score} className="h-2 mb-3" />
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.signals.map((sig, i) => (
                        <div key={`check-${i}`} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                          {signalIcon(sig.type)}
                          <div>
                            <Badge variant="outline" className="text-xs mb-1 capitalize">{sig.category}</Badge>
                            <p className="text-sm">{sig.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {result.recommendations.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.recommendations.map((r, i) => (
                          <li key={`rec-${i}`} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            {!result && !isChecking && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Select a student to run authenticity analysis</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAuthenticityPage;
