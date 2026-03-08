import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Code2, Users, Award, Briefcase, FolderGit2, Layers } from 'lucide-react';

interface ResumeSkills {
  technical_skills: string[];
  soft_skills: string[];
  certifications: string[];
  experience_summary: string;
  projects: { name: string; description: string; technologies: string[] }[];
  skill_categories: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    devops: string[];
    other: string[];
  };
  overall_experience_level: string;
  resume_score: number;
}

interface Props {
  skills: ResumeSkills;
}

const scoreColor = (score: number) => {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-500';
};

const ResumeSkillsDisplay: React.FC<Props> = ({ skills }) => {
  return (
    <>
      {/* Resume Score */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Resume Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className={`text-4xl font-bold ${scoreColor(skills.resume_score)}`}>
                {skills.resume_score}
              </span>
              <span className="text-xs text-muted-foreground">Resume Score</span>
              <Progress value={skills.resume_score} className="h-2 w-24" />
            </div>
            <div className="flex-1">
              <Badge className="mb-2 capitalize">{skills.overall_experience_level}</Badge>
              <p className="text-sm text-muted-foreground">{skills.experience_summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {skills.skill_categories.languages.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" /> Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.skill_categories.languages.map((s, i) => (
                  <Badge key={i} className="badge-primary text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {skills.skill_categories.frameworks.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Frameworks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.skill_categories.frameworks.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {skills.skill_categories.databases.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Databases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.skill_categories.databases.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {skills.skill_categories.devops.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> DevOps & Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.skill_categories.devops.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Soft Skills & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {skills.soft_skills.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Soft Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.soft_skills.map((s, i) => (
                  <Badge key={i} className="bg-green-100 text-green-800 text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {skills.certifications.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.certifications.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-orange-600 border-orange-300 text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Projects */}
      {skills.projects.length > 0 && (
        <Card className="glass-card mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-primary" /> Projects from Resume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.projects.map((project, i) => (
              <div key={i} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                <h4 className="font-medium text-sm">{project.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.technologies.map((tech, j) => (
                    <Badge key={j} variant="secondary" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ResumeSkillsDisplay;
