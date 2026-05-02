import React, { useState, useEffect, useRef } from 'react';
import { User, Github, Code2, Linkedin, Save, CheckCircle2, Sparkles, Loader2, Star, Trophy, BookOpen, Target, Upload, FileText, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ResumeSkillsDisplay from '@/components/student/ResumeSkillsDisplay';
import { describeEdgeError } from '@/lib/edgeError';
import { logger } from '@/lib/logger';

interface ProfileAnalysis {
  overall_score: number;
  summary: string;
  technical_skills: string[];
  skill_level: string;
  strengths: string[];
  areas_to_improve: string[];
  recommended_roles: string[];
  github_assessment: { score: number; highlights: string[] };
  leetcode_assessment: { score: number; highlights: string[] };
}

interface ExtractedData {
  github_data: any;
  leetcode_data: any;
  analysis: ProfileAnalysis;
}

const StudentProfilePage: React.FC = () => {
  const { user, studentProfile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [links, setLinks] = useState({ leetcode: '', github: '', linkedin: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<ProfileAnalysis | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!studentProfile?.id) return;
    supabase
      .from('student_profiles')
      .select('leetcode_url, github_url, linkedin_url, gemini_analysis, github_data, leetcode_data, resume_skills')
      .eq('student_id', studentProfile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, any>;
          setLinks({
            leetcode: d.leetcode_url || '',
            github: d.github_url || '',
            linkedin: d.linkedin_url || '',
          });
          if (d.gemini_analysis && Object.keys(d.gemini_analysis).length > 0) {
            setExistingAnalysis(d.gemini_analysis as unknown as ProfileAnalysis);
            setExtracted({
              github_data: d.github_data,
              leetcode_data: d.leetcode_data,
              analysis: d.gemini_analysis as unknown as ProfileAnalysis,
            });
          }
          if (d.resume_skills && Object.keys(d.resume_skills).length > 0) {
            setResumeSkills(d.resume_skills);
          }
        }
      });
  }, [studentProfile?.id]);

  useEffect(() => {
    if (!studentProfile?.id) return;
    supabase.from('students').select('resume_url').eq('id', studentProfile.id).maybeSingle()
      .then(({ data }) => { if (data?.resume_url) setResumeUrl(data.resume_url); });
  }, [studentProfile?.id]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !studentProfile?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }
    await supabase.from('students').update({ resume_url: path }).eq('id', studentProfile.id);
    setResumeUrl(path);
    toast({ title: 'Resume uploaded!' });
    setIsUploading(false);
  };

  const handleParseResume = async () => {
    if (!resumeUrl) {
      toast({ title: 'No resume', description: 'Please upload a resume first.', variant: 'destructive' });
      return;
    }
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-resume', {});
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Parsing failed', description: describeEdgeError(data), variant: 'destructive' });
        return;
      }
      setResumeSkills(data.resume_skills);
      toast({ title: 'Resume parsed!', description: 'AI has extracted skills from your resume.' });
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Error', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!studentProfile?.id) return;
    setIsSaving(true);
    const profileComplete = !!(links.leetcode && links.github && links.linkedin);

    const { error: profileError } = await supabase
      .from('student_profiles')
      .update({
        leetcode_url: links.leetcode || null,
        github_url: links.github || null,
        linkedin_url: links.linkedin || null,
      })
      .eq('student_id', studentProfile.id);

    await supabase
      .from('students')
      .update({ profile_complete: profileComplete })
      .eq('id', studentProfile.id);

    if (profileError) {
      toast({ title: 'Error saving profile', description: profileError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!', description: 'Your platform links have been saved.' });
      await refreshProfile();
    }
    setIsSaving(false);
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-profile', {});
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Extraction failed', description: describeEdgeError(data), variant: 'destructive' });
        return;
      }
      setExtracted(data);
      setExistingAnalysis(data.analysis);
      toast({ title: 'Profile analyzed!', description: 'AI has analyzed your GitHub and LeetCode profiles.' });
    } catch (e: unknown) {
      logger.error(e);
      toast({ title: 'Error', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsExtracting(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
  };

  const analysis = extracted?.analysis || existingAnalysis;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <User className="w-8 h-8 text-primary" />
          My Profile
        </h1>

        {/* Basic Info */}
        <Card className="glass-card mb-6">
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p className="font-medium">{studentProfile?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="font-medium">{studentProfile?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Institution</Label>
                <p className="font-medium">{studentProfile?.institution}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Degree</Label>
                <p className="font-medium">{studentProfile?.degree} - {studentProfile?.branch}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resume / CV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Resume</>}
              </Button>
              {resumeUrl && (
                <Button variant="outline" className="gap-2" onClick={handleParseResume} disabled={isParsing}>
                  {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : <><ScanSearch className="w-4 h-4" /> AI Parse Resume</>}
                </Button>
              )}
              {resumeUrl && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Resume uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">PDF, DOC, or DOCX — max 5MB</p>
          </CardContent>
        </Card>

        {/* Platform Links */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Platform Links</CardTitle>
            <CardDescription>Connect your coding profiles for AI-powered skill verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" /> LeetCode Profile URL
              </Label>
              <Input placeholder="https://leetcode.com/yourusername" value={links.leetcode}
                onChange={(e) => setLinks(prev => ({ ...prev, leetcode: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Github className="w-4 h-4" /> GitHub Profile URL
              </Label>
              <Input placeholder="https://github.com/yourusername" value={links.github}
                onChange={(e) => setLinks(prev => ({ ...prev, github: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-primary" /> LinkedIn Profile URL
              </Label>
              <Input placeholder="https://linkedin.com/in/yourusername" value={links.linkedin}
                onChange={(e) => setLinks(prev => ({ ...prev, linkedin: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <Button className="btn-primary flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={handleExtract}
                disabled={isExtracting || (!links.github && !links.leetcode)}>
                {isExtracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> AI Analyze</>
                )}
              </Button>
            </div>

            {studentProfile?.profile_complete && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Profile complete! AI can now verify your skills.
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        {analysis && (
          <>
            {/* Overall Score */}
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> AI Profile Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-4xl font-bold ${scoreColor(analysis.overall_score)}`}>
                      {analysis.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground">Overall Score</span>
                    <Progress value={analysis.overall_score} className="h-2 w-24" />
                  </div>
                  <div className="flex-1">
                    <Badge className="mb-2">{analysis.skill_level}</Badge>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills & Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.strengths.map((s, i) => (
                      <Badge key={`str-${s}-${i}`} className="bg-green-100 text-green-800 text-xs">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.areas_to_improve.map((a, i) => (
                      <Badge key={`imp-${a}-${i}`} variant="outline" className="text-orange-600 border-orange-300 text-xs">{a}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Skills */}
            <Card className="glass-card mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Technical Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.technical_skills.map((skill, i) => (
                    <Badge key={`skill-${skill}-${i}`} className="badge-primary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Platform Assessments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Github className="w-4 h-4" /> GitHub ({analysis.github_assessment.score}/100)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={analysis.github_assessment.score} className="h-1.5 mb-3" />
                  <ul className="space-y-1">
                    {analysis.github_assessment.highlights.map((h, i) => (
                      <li key={`gh-${i}`} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-primary mt-0.5">•</span> {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" /> LeetCode ({analysis.leetcode_assessment.score}/100)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={analysis.leetcode_assessment.score} className="h-1.5 mb-3" />
                  <ul className="space-y-1">
                    {analysis.leetcode_assessment.highlights.map((h, i) => (
                      <li key={`lc-${i}`} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-primary mt-0.5">•</span> {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recommended Roles */}
            <Card className="glass-card mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> Recommended Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommended_roles.map((role, i) => (
                    <Badge key={`role-${role}-${i}`} variant="secondary">{role}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Resume Skills Analysis */}
        {resumeSkills && <ResumeSkillsDisplay skills={resumeSkills} />}
      </div>
    </div>
  );
};

export default StudentProfilePage;
