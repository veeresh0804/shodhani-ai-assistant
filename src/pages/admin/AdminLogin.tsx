import React, { useState } from 'react';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin: React.FC = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else {
        toast({ title: 'Access denied', description: 'You do not have admin privileges.', variant: 'destructive' });
        await supabase.auth.signOut();
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Access the platform admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</Label>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
