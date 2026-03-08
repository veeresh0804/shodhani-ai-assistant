import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, CheckCircle, XCircle, Clock, Briefcase, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface JobAnalytics {
  id: string;
  title: string;
  total: number;
  pending: number;
  shortlisted: number;
  rejected: number;
  conversionRate: number;
}

const COLORS = ['hsl(37, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(0, 72%, 50%)', 'hsl(24, 5%, 44%)'];

const AnalyticsDashboard: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();
  const [jobAnalytics, setJobAnalytics] = useState<JobAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const fetch = async () => {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('recruiter_id', recruiterProfile.id);

      if (!jobs || jobs.length === 0) { setIsLoading(false); return; }

      const { data: apps } = await supabase
        .from('applications')
        .select('job_id, status')
        .in('job_id', jobs.map(j => j.id));

      const analytics = jobs.map(job => {
        const jobApps = (apps || []).filter(a => a.job_id === job.id);
        const pending = jobApps.filter(a => a.status === 'pending').length;
        const shortlisted = jobApps.filter(a => a.status === 'shortlisted').length;
        const rejected = jobApps.filter(a => a.status === 'rejected').length;
        const total = jobApps.length;
        return {
          id: job.id,
          title: job.title,
          total,
          pending,
          shortlisted,
          rejected,
          conversionRate: total > 0 ? Math.round((shortlisted / total) * 100) : 0,
        };
      });

      setJobAnalytics(analytics);
      setIsLoading(false);
    };
    fetch();
  }, [recruiterProfile?.id]);

  const totals = jobAnalytics.reduce(
    (acc, j) => ({
      total: acc.total + j.total,
      pending: acc.pending + j.pending,
      shortlisted: acc.shortlisted + j.shortlisted,
      rejected: acc.rejected + j.rejected,
    }),
    { total: 0, pending: 0, shortlisted: 0, rejected: 0 }
  );

  const overallConversion = totals.total > 0 ? Math.round((totals.shortlisted / totals.total) * 100) : 0;

  const pieData = [
    { name: 'Pending', value: totals.pending },
    { name: 'Shortlisted', value: totals.shortlisted },
    { name: 'Rejected', value: totals.rejected },
  ].filter(d => d.value > 0);

  const barData = jobAnalytics.filter(j => j.total > 0).slice(0, 10).map(j => ({
    name: j.title.length > 20 ? j.title.substring(0, 20) + '…' : j.title,
    Applicants: j.total,
    Shortlisted: j.shortlisted,
    Rejected: j.rejected,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/recruiter/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" /> Hiring Analytics
        </h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Applicants', value: totals.total, icon: Users, color: 'text-primary' },
            { label: 'Pending', value: totals.pending, icon: Clock, color: 'text-warning' },
            { label: 'Shortlisted', value: totals.shortlisted, icon: CheckCircle, color: 'text-success' },
            { label: 'Rejected', value: totals.rejected, icon: XCircle, color: 'text-destructive' },
            { label: 'Conversion Rate', value: `${overallConversion}%`, icon: TrendingUp, color: 'text-primary' },
          ].map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          {barData.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Applicants by Job</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="Applicants" fill="hsl(37, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Shortlisted" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Rejected" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Application Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Per-Job Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-5 h-5 text-primary" /> Per-Job Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobAnalytics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No jobs posted yet.</p>
            ) : (
              <div className="space-y-4">
                {jobAnalytics.map((job) => (
                  <div key={job.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{job.title}</h3>
                      <Badge className="badge-primary">{job.conversionRate}% conversion</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center text-xs">
                      <div>
                        <p className="text-lg font-bold">{job.total}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-warning">{job.pending}</p>
                        <p className="text-muted-foreground">Pending</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{job.shortlisted}</p>
                        <p className="text-muted-foreground">Shortlisted</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-destructive">{job.rejected}</p>
                        <p className="text-muted-foreground">Rejected</p>
                      </div>
                    </div>
                    <Progress value={job.conversionRate} className="h-1.5 mt-3" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
