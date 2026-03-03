import React, { useState, useEffect } from 'react';
import { User, Github, Code2, Linkedin, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const StudentProfilePage: React.FC = () => {
  const { studentProfile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [links, setLinks] = useState({
    leetcode: '',
    github: '',
    linkedin: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load existing links from student_profiles
  useEffect(() => {
    if (!studentProfile?.id) return;
    supabase
      .from('student_profiles')
      .select('leetcode_url, github_url, linkedin_url')
      .eq('student_id', studentProfile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setLinks({
            leetcode: data.leetcode_url || '',
            github: data.github_url || '',
            linkedin: data.linkedin_url || '',
          });
        }
      });
  }, [studentProfile?.id]);

  const handleSave = async () => {
    if (!studentProfile?.id) return;
    setIsSaving(true);

    const profileComplete = !!(links.leetcode && links.github && links.linkedin);

    // Update student_profiles with links
    const { error: profileError } = await supabase
      .from('student_profiles')
      .update({
        leetcode_url: links.leetcode || null,
        github_url: links.github || null,
        linkedin_url: links.linkedin || null,
      })
      .eq('student_id', studentProfile.id);

    // Update profile_complete on students table
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

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <User className="w-8 h-8 text-primary" />
          My Profile
        </h1>

        {/* Basic Info */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
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

        {/* Platform Links */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Platform Links</CardTitle>
            <CardDescription>Connect your coding profiles for AI-powered skill verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-leetcode" /> LeetCode Profile URL
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
                <Linkedin className="w-4 h-4 text-linkedin" /> LinkedIn Profile URL
              </Label>
              <Input placeholder="https://linkedin.com/in/yourusername" value={links.linkedin}
                onChange={(e) => setLinks(prev => ({ ...prev, linkedin: e.target.value }))} />
            </div>

            <Button className="btn-primary w-full gap-2" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>

            {studentProfile?.profile_complete && (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" /> Profile complete! AI can now verify your skills.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfilePage;
