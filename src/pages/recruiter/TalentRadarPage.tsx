import React, { useState, useEffect } from 'react';
import { Radar, Loader2, ArrowLeft, TrendingUp, TrendingDown, Users, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SkillTrend {
  skill: string;
  count: number;
  percentage: number;
}

interface InstitutionStat {
  name: string;
  count: number;
}

const TalentRadarPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [topSkills, setTopSkills] = useState<SkillTrend[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionStat[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [gradYearDist, setGradYearDist] = useState<{ year: number; count: number }[]>([]);
  const [degreeDist, setDegreeDist] = useState<{ degree: string; count: number }[]>([]);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetchData = async () => {
      setIsLoading(true);
      const { data: students } = await supabase.from('students').select('id, institution, degree, graduation_year');
      const { data: profiles } = await supabase.from('student_profiles').select('student_id, gemini_analysis, resume_skills, github_data, leetcode_data');

      if (!students) { setIsLoading(false); return; }
      setTotalStudents(students.length);

      // Skill frequency
      const skillCount: Record<string, number> = {};
      let scoreSum = 0;
      let scoreCount = 0;
      (profiles || []).forEach((p) => {
        const skills = [
          ...((p.gemini_analysis as any)?.technical_skills || []),
          ...((p.resume_skills as any)?.technical_skills || []),
        ];
        skills.forEach((s: string) => {
          const normalized = s.toLowerCase().trim();
          skillCount[normalized] = (skillCount[normalized] || 0) + 1;
        });
        if ((p.gemini_analysis as any)?.overall_score) {
          scoreSum += (p.gemini_analysis as any).overall_score;
          scoreCount++;
        }
      });

      const sortedSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([skill, count]) => ({
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          count,
          percentage: Math.round((count / students.length) * 100),
        }));
      setTopSkills(sortedSkills);
      setAvgScore(scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0);

      // Institution distribution
      const instCount: Record<string, number> = {};
      students.forEach((s) => { instCount[s.institution] = (instCount[s.institution] || 0) + 1; });
      setInstitutions(Object.entries(instCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })));

      // Graduation year distribution
      const yearCount: Record<number, number> = {};
      students.forEach((s) => { yearCount[s.graduation_year] = (yearCount[s.graduation_year] || 0) + 1; });
      setGradYearDist(Object.entries(yearCount).map(([year, count]) => ({ year: Number(year), count: count as number })).sort((a, b) => a.year - b.year));

      // Degree distribution
      const degCount: Record<string, number> = {};
      students.forEach((s) => { degCount[s.degree] = (degCount[s.degree] || 0) + 1; });
      setDegreeDist(Object.entries(degCount).sort((a, b) => b[1] - a[1]).map(([degree, count]) => ({ degree, count: count as number })));

      setIsLoading(false);
    };
    fetchData();
  }, [recruiterProfile?.id]);

  if (isLoading) {
    return <div className="min-h-screen pt-20 pb-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Radar className="w-8 h-8 text-primary" /> Talent Radar
        </h1>
        <p className="text-muted-foreground mb-8">Emerging talent trends and platform insights.</p>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{topSkills.length}</p>
              <p className="text-xs text-muted-foreground">Unique Skills</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-xs text-muted-foreground">Avg AI Score</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{institutions.length}</p>
              <p className="text-xs text-muted-foreground">Institutions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Skills */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Top Skills on Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSkills.slice(0, 12).map((s, i) => (
                  <div key={`demand-${i}`} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                    <span className="text-sm font-medium flex-1">{s.skill}</span>
                    <span className="text-xs text-muted-foreground">{s.count} students</span>
                    <Progress value={s.percentage} className="h-1.5 w-20" />
                    <span className="text-xs font-bold w-10 text-right">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Graduation Year */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Students by Graduation Year</CardTitle>
            </CardHeader>
            <CardContent>
              {gradYearDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gradYearDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(37, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Institutions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Top Institutions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {institutions.map((inst, i) => (
                  <div key={`insight-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{inst.name}</span>
                    <Badge variant="outline">{inst.count} students</Badge>
                  </div>
                ))}
                {institutions.length === 0 && <p className="text-center text-muted-foreground py-4">No data</p>}
              </div>
            </CardContent>
          </Card>

          {/* Degree Distribution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Degree Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {degreeDist.map((d, i) => (
                  <div key={`rec-${i}`} className="flex items-center gap-3">
                    <span className="text-sm font-medium flex-1">{d.degree}</span>
                    <Progress value={(d.count / totalStudents) * 100} className="h-1.5 w-24" />
                    <Badge variant="outline">{d.count}</Badge>
                  </div>
                ))}
                {degreeDist.length === 0 && <p className="text-center text-muted-foreground py-4">No data</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TalentRadarPage;
