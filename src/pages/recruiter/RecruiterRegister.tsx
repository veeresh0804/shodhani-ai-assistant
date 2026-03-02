import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, Globe, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const RecruiterRegister: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsRecruiter } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: '', recruiterName: '', email: '',
    designation: '', companyWebsite: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.recruiterName || !formData.email || !formData.password) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      loginAsRecruiter({
        id: 'recruiter-' + Date.now(),
        companyName: formData.companyName,
        recruiterName: formData.recruiterName,
        email: formData.email,
        designation: formData.designation,
        companyWebsite: formData.companyWebsite,
      });
      toast({ title: 'Registration successful!' });
      navigate('/recruiter/dashboard');
      setIsLoading(false);
    }, 500);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="glass-card animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Recruiter Registration</CardTitle>
            <CardDescription>Create your account to start hiring smarter</CardDescription>
          </CardHeader>

          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="TechCorp Inc." value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="John Doe" value={formData.recruiterName}
                    onChange={(e) => updateField('recruiterName', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="recruiter@company.com" value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input placeholder="Hiring Manager" value={formData.designation}
                  onChange={(e) => updateField('designation', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="https://company.com" value={formData.companyWebsite}
                    onChange={(e) => updateField('companyWebsite', e.target.value)} className="pl-10" />
                </div>
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
              </div>

              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" placeholder="••••••••" value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)} />
              </div>

              <Button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account? <Link to="/recruiter/login" className="text-primary hover:underline">Sign in</Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground text-center">← Back to Home</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterRegister;
