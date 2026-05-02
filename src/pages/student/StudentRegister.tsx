import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, School, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordStrength } from '@/lib/validation';

const StudentRegister: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '', email: '', institution: '',
    degree: '', branch: '', graduationYear: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.institution || !formData.degree || !formData.branch || !formData.password) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    const strength = checkPasswordStrength(formData.password);
    if (strength.score < 2) {
      toast({ title: 'Password too weak', description: 'Use uppercase, numbers, or symbols.', variant: 'destructive' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signUp(formData.email, formData.password);
      if (error) {
        toast({ title: error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please check your email to confirm your account, then log in.', description: 'A confirmation email has been sent.' });
        navigate('/student/login');
        setIsLoading(false);
        return;
      }

      // Create student profile
      const { error: profileError } = await supabase.from('students').insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        institution: formData.institution,
        degree: formData.degree,
        branch: formData.branch,
        graduation_year: parseInt(formData.graduationYear) || 2025,
      });

      if (profileError) {
        toast({ title: 'Error creating profile', description: profileError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Create empty student_profiles entry for extracted data
      const { data: studentRow } = await supabase.from('students').select('id').eq('user_id', user.id).single();
      if (studentRow) {
        const { error: spError } = await supabase.from('student_profiles').insert({ student_id: studentRow.id });
        if (spError) {
          toast({ title: 'Warning', description: 'Profile created but skill extraction setup failed. You can set it up later from your profile page.' });
        }
      }

      toast({ title: 'Registration successful!' });
      await refreshProfile();
      setTimeout(() => navigate('/student/profile'), 300);
    } catch (err) {
      toast({ title: 'Registration failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="glass-card animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl">Student Registration</CardTitle>
            <CardDescription>Create your account to find your dream job</CardDescription>
          </CardHeader>

          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Your full name" value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="student@university.edu" value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Institution *</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Your university" value={formData.institution}
                    onChange={(e) => updateField('institution', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Degree *</Label>
                  <Select onValueChange={(v) => updateField('degree', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B.Tech">B.Tech</SelectItem>
                      <SelectItem value="M.Tech">M.Tech</SelectItem>
                      <SelectItem value="BCA">BCA</SelectItem>
                      <SelectItem value="MCA">MCA</SelectItem>
                      <SelectItem value="B.Sc">B.Sc</SelectItem>
                      <SelectItem value="M.Sc">M.Sc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Branch *</Label>
                  <Select onValueChange={(v) => updateField('branch', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">CSE</SelectItem>
                      <SelectItem value="Information Technology">IT</SelectItem>
                      <SelectItem value="Electronics">ECE</SelectItem>
                      <SelectItem value="Mechanical">ME</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Graduation Year</Label>
                <Input type="number" placeholder="2025" value={formData.graduationYear}
                  onChange={(e) => updateField('graduationYear', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && (() => {
                  const strength = checkPasswordStrength(formData.password);
                  return (
                    <div className="space-y-1.5 mt-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(level => (
                          <div key={`str-${level}`} className={`h-1 flex-1 rounded-full transition-colors ${
                            strength.score >= level ? strength.color : 'bg-muted'
                          }`} />
                        ))}
                      </div>
                      <p className={`text-xs ${strength.score <= 1 ? 'text-red-500' : strength.score === 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {strength.label}
                        {strength.score < 3 && ' — add uppercase, number, or symbol'}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" placeholder="••••••••" value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)} />
              </div>

              <Button type="submit" className="btn-secondary w-full" disabled={isLoading}>
                {isLoading ? <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account? <Link to="/student/login" className="text-primary hover:underline">Sign in</Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground text-center">← Back to Home</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default StudentRegister;
