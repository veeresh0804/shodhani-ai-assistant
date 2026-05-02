import React, { useEffect, useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { Shield, Users, Briefcase, FileText, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type Student     = Database['public']['Tables']['students']['Row'];
type Recruiter   = Database['public']['Tables']['recruiters']['Row'];
type Job         = Database['public']['Tables']['jobs']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];

const AdminDashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, recruiters: 0, jobs: 0, applications: 0, interviews: 0 });
  const [students, setStudents] = useState<Student[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/admin/login');
      return;
    }
    if (!user) return;

    const checkAdmin = async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!data) {
        navigate('/');
        return;
      }
      setIsAdmin(true);

      const [s, r, j, a, iv] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('recruiters').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('interviews').select('*'),
      ]);

      setStudents((s.data || []) as Student[]);
      setRecruiters((r.data || []) as Recruiter[]);
      setJobs((j.data || []) as Job[]);
      setApplications((a.data || []) as Application[]);
      setStats({
        students: (s.data || []).length,
        recruiters: (r.data || []).length,
        jobs: (j.data || []).length,
        applications: (a.data || []).length,
        interviews: (iv.data || []).length,
      });
      setIsLoading(false);
    };
    checkAdmin();
  }, [user, authLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const appStatusData = [
    { name: 'Pending', count: applications.filter(a => a.status === 'pending').length },
    { name: 'Shortlisted', count: applications.filter(a => a.status === 'shortlisted').length },
    { name: 'Rejected', count: applications.filter(a => a.status === 'rejected').length },
  ];

  const jobsByMonth = jobs.reduce((acc: Record<string, number>, job) => {
    const month = new Date(job.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const trendData = Object.entries(jobsByMonth).map(([month, count]) => ({ month, jobs: count }));

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" /> Admin Dashboard
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Students', value: stats.students, icon: Users },
            { label: 'Recruiters', value: stats.recruiters, icon: Users },
            { label: 'Jobs', value: stats.jobs, icon: Briefcase },
            { label: 'Applications', value: stats.applications, icon: FileText },
            { label: 'Interviews', value: stats.interviews, icon: Calendar },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <s.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Application Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="hsl(37, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {trendData.length > 0 && (
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Jobs Posted Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="jobs" stroke="hsl(37, 92%, 50%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="students">
          <TabsList className="mb-4">
            <TabsTrigger value="students">Students ({stats.students})</TabsTrigger>
            <TabsTrigger value="recruiters">Recruiters ({stats.recruiters})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({stats.jobs})</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Institution</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Degree</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-2 font-medium">{s.name}</td>
                          <td className="py-3 px-2 text-muted-foreground">{s.email}</td>
                          <td className="py-3 px-2">{s.institution}</td>
                          <td className="py-3 px-2">{s.degree} - {s.branch}</td>
                          <td className="py-3 px-2">
                            <Badge className={s.profile_complete ? 'badge-success' : 'badge-warning'}>
                              {s.profile_complete ? 'Complete' : 'Incomplete'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recruiters">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Company</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Designation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recruiters.map(r => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-2 font-medium">{r.recruiter_name}</td>
                          <td className="py-3 px-2">{r.company_name}</td>
                          <td className="py-3 px-2 text-muted-foreground">{r.email}</td>
                          <td className="py-3 px-2">{r.designation || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Title</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Location</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Apps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(j => (
                        <tr key={j.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-2 font-medium">{j.title}</td>
                          <td className="py-3 px-2">{j.location}</td>
                          <td className="py-3 px-2">{j.job_type}</td>
                          <td className="py-3 px-2">
                            <Badge className={j.status === 'active' ? 'badge-success' : 'badge-muted'}>{j.status}</Badge>
                          </td>
                          <td className="py-3 px-2">{j.applications_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
