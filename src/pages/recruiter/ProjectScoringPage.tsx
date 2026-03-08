import React, { useState, useEffect } from 'react';
import { Code2, Loader2, ArrowLeft, Search, Star, GitBranch, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface StudentEntry {
  id: string;
  name: string;
  institution: string;
  github_data: any;
}

interface ProjectScore {
  name: string;
  description: string;
  scores: { architecture: number; documentation: number; code_quality: number; community: number };
  overall: number;
  highlights: string[];
  languages: string[];
}

interface ScoringResult {
  overall_score: number;
  projects: ProjectScore[];
  tech_diversity_score: number;
  summary: string;
  top_technologies: string[];
}

const ProjectScoringPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentEntry | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetch = async () => {
      const { data: studs } = await supabase.from('students').select('id, name, institution');
      const { data: profiles } = await supabase.from('student_profiles').select('student_id, github_data');
      if (!studs) { setIsLoading(false); return; }
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.student_id, p]));
      setStudents(studs.map((s: any) => ({
        id: s.id, name: s.name, institution: s.institution,
        github_data: profileMap[s.id]?.github_data || null,
      })));
      setIsLoading(false);
    };
    fetch();
  }, [recruiterProfile?.id]);

  const handleScore = async (student: StudentEntry) => {
    if (!student.github_data || Object.keys(student.github_data).length === 0) {
      toast({ title: 'No GitHub data', description: 'This student has no extracted GitHub data.', variant: 'destructive' });
      return;
    }
    setSelectedStudent(student);
    setResult(null);
    setIsScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('project-score', {
        body: { github_data: student.github_data, student_name: student.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsScoring(false);
    }
  };

  const filtered = students.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Code2 className="w-8 h-8 text-primary" /> AI Project Scoring Engine
        </h1>
        <p className="text-muted-foreground mb-8">Evaluate GitHub projects for code quality, architecture, and documentation.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : filtered.map(s => (
                <Card key={s.id} className={`cursor-pointer transition-all ${selectedStudent?.id === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => handleScore(s)}>
                  <CardContent className="py-3 px-4">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.institution}</p>
                    {!s.github_data && <Badge variant="secondary" className="text-xs mt-1">No GitHub</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {isScoring && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Scoring {selectedStudent?.name}'s projects...</p>
                </CardContent>
              </Card>
            )}
            {result && !isScoring && (
              <div className="space-y-4">
                {/* Overview */}
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-6 mb-4">
                      <div className="text-center">
                        <span className={`text-4xl font-bold ${scoreColor(result.overall_score)}`}>{result.overall_score}</span>
                        <p className="text-xs text-muted-foreground">Overall</p>
                      </div>
                      <div className="text-center">
                        <span className={`text-2xl font-bold ${scoreColor(result.tech_diversity_score)}`}>{result.tech_diversity_score}</span>
                        <p className="text-xs text-muted-foreground">Tech Diversity</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{result.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.top_technologies.map((t, i) => (
                            <Badge key={i} className="badge-primary text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Projects */}
                {result.projects.map((proj, i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-primary" /> {proj.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{proj.description}</p>
                        </div>
                        <span className={`text-2xl font-bold ${scoreColor(proj.overall)}`}>{proj.overall}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {Object.entries(proj.scores).map(([key, val]) => (
                          <div key={key} className="text-center">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                            <p className={`text-sm font-bold ${scoreColor(val)}`}>{val}</p>
                            <Progress value={val} className="h-1 mt-1" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {proj.languages.map((l, j) => (
                          <Badge key={j} variant="outline" className="text-xs">{l}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!result && !isScoring && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Code2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Select a student to score their GitHub projects</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectScoringPage;
