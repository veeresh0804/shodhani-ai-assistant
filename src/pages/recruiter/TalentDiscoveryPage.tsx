import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Github, Code2, ExternalLink, Star, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TalentProfile {
  student_id: string;
  name: string;
  email: string;
  institution: string;
  degree: string;
  branch: string;
  graduation_year: number;
  github_url: string | null;
  leetcode_url: string | null;
  linkedin_url: string | null;
  reputation_score: number;
  skill_level: string;
  technical_skills: string[];
  overall_score: number;
}

const TalentDiscoveryPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [filtered, setFiltered] = useState<TalentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetchTalents = async () => {
      setIsLoading(true);
      // Fetch students with profiles
      const { data: students } = await supabase.from('students').select('id, name, email, institution, degree, branch, graduation_year');
      const { data: profiles } = await supabase.from('student_profiles').select('student_id, github_url, leetcode_url, linkedin_url, gemini_analysis, github_data, leetcode_data, resume_skills');

      if (!students || !profiles) { setIsLoading(false); return; }

      const profileMap = Object.fromEntries(profiles.map((p) => [p.student_id, p]));

      const talentList: TalentProfile[] = students.map((s) => {
        const p = profileMap[s.id];
        const analysis = p?.gemini_analysis as any;
        const resumeSkills = p?.resume_skills as any;
        const githubData = p?.github_data as any;
        const leetcodeData = p?.leetcode_data as any;

        // Compute reputation score
        let reputation = 0;
        if (analysis?.overall_score) reputation += analysis.overall_score * 0.4;
        if (resumeSkills?.resume_score) reputation += resumeSkills.resume_score * 0.3;
        if (githubData?.total_stars) reputation += Math.min(githubData.total_stars * 2, 15);
        if (leetcodeData?.solved?.all) reputation += Math.min(leetcodeData.solved.all * 0.1, 15);
        reputation = Math.round(Math.min(reputation, 100));

        const techSkills = [
          ...(analysis?.technical_skills || []),
          ...(resumeSkills?.technical_skills || []),
        ];
        const uniqueSkills = [...new Set(techSkills.map((s: string) => s))];

        return {
          student_id: s.id,
          name: s.name,
          email: s.email,
          institution: s.institution,
          degree: s.degree,
          branch: s.branch,
          graduation_year: s.graduation_year,
          github_url: p?.github_url || null,
          leetcode_url: p?.leetcode_url || null,
          linkedin_url: p?.linkedin_url || null,
          reputation_score: reputation,
          skill_level: analysis?.skill_level || 'unknown',
          technical_skills: uniqueSkills,
          overall_score: analysis?.overall_score || 0,
        };
      });

      setTalents(talentList);
      setFiltered(talentList);
      setIsLoading(false);
    };
    fetchTalents();
  }, [recruiterProfile?.id]);

  useEffect(() => {
    let result = [...talents];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.institution.toLowerCase().includes(q) ||
        t.technical_skills.some(s => s.toLowerCase().includes(q))
      );
    }

    if (skillFilter) {
      const sf = skillFilter.toLowerCase();
      result = result.filter(t => t.technical_skills.some(s => s.toLowerCase().includes(sf)));
    }

    if (levelFilter !== 'all') {
      result = result.filter(t => t.skill_level === levelFilter);
    }

    if (sortBy === 'score') result.sort((a, b) => b.reputation_score - a.reputation_score);
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'graduation') result.sort((a, b) => a.graduation_year - b.graduation_year);

    setFiltered(result);
  }, [searchQuery, skillFilter, levelFilter, sortBy, talents]);

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
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
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          Talent Discovery
        </h1>
        <p className="text-muted-foreground mb-8">Search and discover top talent across the platform.</p>

        {/* Filters */}
        <Card className="glass-card mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, institution, or skill..." className="pl-9"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Input placeholder="Filter by skill (e.g. React)" value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)} />
              <div className="flex gap-2">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Top Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="graduation">Grad Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} talent(s) found</p>

        {/* Talent Cards */}
        <div className="space-y-4">
          {filtered.map((t) => (
            <Card key={t.student_id} className="glass-card-hover">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex flex-col items-center gap-1 md:w-24 shrink-0">
                    <span className={`text-2xl font-bold ${scoreColor(t.reputation_score)}`}>{t.reputation_score}</span>
                    <Progress value={t.reputation_score} className="h-1.5 w-16" />
                    <span className="text-xs text-muted-foreground">Reputation</span>
                    {t.skill_level !== 'unknown' && (
                      <Badge variant="secondary" className="text-xs capitalize">{t.skill_level}</Badge>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{t.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="w-4 h-4" />
                          <span>{t.degree} {t.branch} — {t.institution} ({t.graduation_year})</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {t.github_url && (
                          <a href={t.github_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted"><Github className="w-3 h-3" /> GitHub</Badge>
                          </a>
                        )}
                        {t.leetcode_url && (
                          <a href={t.leetcode_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted"><Code2 className="w-3 h-3" /> LeetCode</Badge>
                          </a>
                        )}
                        {t.linkedin_url && (
                          <a href={t.linkedin_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted"><ExternalLink className="w-3 h-3" /> LinkedIn</Badge>
                          </a>
                        )}
                      </div>
                    </div>
                    {t.technical_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.technical_skills.slice(0, 12).map((s, i) => (
                          <Badge key={`skill-${s}-${i}`} className="badge-primary text-xs">{s}</Badge>
                        ))}
                        {t.technical_skills.length > 12 && (
                          <Badge variant="outline" className="text-xs">+{t.technical_skills.length - 12} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="glass-card">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">No talent matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TalentDiscoveryPage;
