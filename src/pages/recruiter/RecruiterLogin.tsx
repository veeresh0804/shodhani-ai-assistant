import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const RecruiterLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading, isAuthenticated, userType, logout } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
      setIsLoading(false);
    }
    // Do NOT navigate here — let the useEffect below handle it
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (userType === 'recruiter') {
        navigate('/recruiter/dashboard');
      } else if (userType === 'student') {
        toast({ title: 'Wrong portal', description: 'Please use the Student login.', variant: 'destructive' });
        logout();
      }
    }
  }, [authLoading, isAuthenticated, userType]);

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="glass-card animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Recruiter Login</CardTitle>
            <CardDescription>Sign in to manage your hiring pipeline</CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="recruiter@company.com" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</> : 'Sign In'}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-4">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline text-center">Forgot password?</Link>
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account? <Link to="/recruiter/register" className="text-primary hover:underline">Register</Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground text-center">← Back to Home</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterLogin;
