import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, FileText, Target, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { recruiterProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPosting, setIsPosting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefDescription, setBriefDescription] = useState('');
  const [formData, setFormData] = useState({
    title: '', department: '', location: '', jobType: '',
    experienceRequired: '', description: '',
    requiredSkills: [] as string[], preferredSkills: [] as string[],
    salaryRange: '', deadline: '',
  });
  const [newSkill, setNewSkill] = useState('');
  const [skillType, setSkillType] = useState<'required' | 'preferred'>('required');

  const handleGenerateJD = async () => {
    if (!briefDescription.trim()) {
      toast({ title: 'Enter a brief description', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-jd', {
        body: {
          title: formData.title,
          job_type: formData.jobType,
          location: formData.location,
          experience: formData.experienceRequired,
          brief_description: briefDescription,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Generation failed', description: data.error, variant: 'destructive' });
        return;
      }
      setFormData(prev => ({
        ...prev,
        title: prev.title || data.suggested_title || '',
        description: data.description || '',
        requiredSkills: data.required_skills || [],
        preferredSkills: data.preferred_skills || [],
        salaryRange: prev.salaryRange || data.salary_suggestion || '',
      }));
      toast({ title: 'JD generated!', description: 'Review and edit the generated description.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to generate', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    const key = skillType === 'required' ? 'requiredSkills' : 'preferredSkills';
    if (!formData[key].includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, [key]: [...prev[key], newSkill.trim()] }));
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string, type: 'required' | 'preferred') => {
    const key = type === 'required' ? 'requiredSkills' : 'preferredSkills';
    setFormData(prev => ({ ...prev, [key]: prev[key].filter(s => s !== skill) }));
  };

  const handlePost = async () => {
    if (!formData.title || !formData.description || !formData.location || !formData.jobType) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    if (!recruiterProfile?.id) {
      toast({ title: 'Recruiter profile not found', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    const { error } = await supabase.from('jobs').insert({
      recruiter_id: recruiterProfile.id,
      title: formData.title,
      description: formData.description,
      department: formData.department || null,
      location: formData.location,
      job_type: formData.jobType,
      experience_required: formData.experienceRequired || null,
      required_skills: formData.requiredSkills,
      preferred_skills: formData.preferredSkills,
      salary_range: formData.salaryRange || null,
      deadline: formData.deadline || null,
    });

    if (error) {
      toast({ title: 'Error posting job', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Job posted successfully!', description: 'Your job is now live.' });
      navigate('/recruiter/dashboard');
    }
    setIsPosting(false);
  };

  const steps = [
    { num: 1, label: 'Job Details', icon: Briefcase },
    { num: 2, label: 'Description', icon: FileText },
    { num: 3, label: 'Skills & Post', icon: Target },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentStep >= step.num ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${currentStep > step.num ? 'bg-primary' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>

        <Card className="glass-card">
          {currentStep === 1 && (
            <>
              <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input placeholder="e.g. Senior Full Stack Developer" value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input placeholder="e.g. Bangalore" value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Type *</Label>
                    <Select onValueChange={(v) => setFormData(prev => ({ ...prev, jobType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Experience Required</Label>
                    <Input placeholder="e.g. 2-5 years" value={formData.experienceRequired}
                      onChange={(e) => setFormData(prev => ({ ...prev, experienceRequired: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary Range</Label>
                    <Input placeholder="e.g. 10-20 LPA" value={formData.salaryRange}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryRange: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="btn-primary" onClick={() => setCurrentStep(2)}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea placeholder="Paste the full job description here..." className="min-h-[200px]"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button className="btn-primary" onClick={() => setCurrentStep(3)}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader><CardTitle>Skills & Finalize</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Add Skills</Label>
                  <div className="flex gap-2">
                    <Select value={skillType} onValueChange={(v: 'required' | 'preferred') => setSkillType(v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="preferred">Preferred</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="e.g. React" value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                    <Button variant="outline" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>

                {formData.requiredSkills.length > 0 && (
                  <div className="space-y-2">
                    <Label>Required Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.requiredSkills.map((skill) => (
                        <Badge key={skill} className="badge-primary gap-1">
                          {skill}
                          <button onClick={() => removeSkill(skill, 'required')}><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {formData.preferredSkills.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preferred Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.preferredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button onClick={() => removeSkill(skill, 'preferred')}><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Application Deadline</Label>
                  <Input type="date" value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))} />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button className="btn-primary" onClick={handlePost} disabled={isPosting}>
                    {isPosting ? 'Posting...' : 'Post Job'} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PostJobPage;
