import React, { useState } from 'react';
import { ArrowLeft, Briefcase, Code2, Trophy, Star, BarChart3, Loader2, Sparkles, Globe, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { describeEdgeError } from '@/lib/edgeError';
import { logger } from '@/lib/logger';

const PortfolioBuilderPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!studentProfile?.id) return;
    setIsGenerating(true);
    setPortfolio(null);
    try {
      const { data: profileData } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_id', studentProfile.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('portfolio-build', {
        body: {
          student_data: studentProfile,
          profile_data: profileData || {},
          target_role: targetRole || 'Software Engineer',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(JSON.stringify(data));
      setPortfolio(data);
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Generation failed', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBio = () => {
    if (portfolio?.summary) {
      navigator.clipboard.writeText(portfolio.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard!' });
    }
  };

  const iconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy className="w-5 h-5 text-primary" />,
    code: <Code2 className="w-5 h-5 text-primary" />,
    star: <Star className="w-5 h-5 text-primary" />,
    chart: <BarChart3 className="w-5 h-5 text-primary" />,
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/student/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Portfolio Builder</h1>
        </div>
        <p className="text-muted-foreground mb-8">Generate a professional portfolio from your profile data.</p>

        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Target Role</label>
                <Input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Full Stack Developer, ML Engineer..." />
              </div>
              <Button onClick={generate} disabled={isGenerating} className="btn-primary gap-2">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'Generate Portfolio'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {portfolio && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <Card className="glass-card bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-bold text-primary">{studentProfile?.name?.charAt(0)}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{studentProfile?.name}</h2>
                  <p className="text-lg text-primary font-medium mb-2">{portfolio.headline}</p>
                  <p className="text-muted-foreground max-w-2xl mx-auto">{portfolio.bio}</p>
                  <div className="flex gap-2 justify-center mt-4 flex-wrap">
                    {portfolio.suggested_roles?.map((role: string) => (
                      <Badge key={role} className="bg-primary/20 text-primary">{role}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="w-5 h-5 text-primary" /> Skills</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {portfolio.skills && Object.entries(portfolio.skills).map(([category, skills]: [string, any]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2 capitalize">{category.replace('_', ' ')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {(skills as string[])?.map((s: string) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Projects */}
            {portfolio.projects?.length > 0 && (
              <Card className="glass-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Projects</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {portfolio.projects.map((p: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
                        <h4 className="font-semibold mb-1">{p.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.technologies?.map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                        {p.highlights?.map((h: string, j: number) => (
                          <p key={j} className="text-xs text-green-700 flex items-center gap-1"><Star className="w-3 h-3" /> {h}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {portfolio.achievements?.length > 0 && (
              <Card className="glass-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Achievements</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {portfolio.achievements.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        {iconMap[a.icon] || <Star className="w-5 h-5 text-primary" />}
                        <div>
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary for copy */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Professional Summary</span>
                  <Button variant="outline" size="sm" onClick={copyBio} className="gap-1">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{portfolio.summary}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioBuilderPage;
