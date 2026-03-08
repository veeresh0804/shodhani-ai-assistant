import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, MapPin, Clock, ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface JobWithRecruiter {
  id: string;
  title: string;
  location: string;
  job_type: string;
  required_skills: string[];
  salary_range: string | null;
  created_at: string;
  recruiters: { company_name: string } | null;
}

const JobListingsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobWithRecruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [salaryFilter, setSalaryFilter] = useState('all');

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, location, job_type, required_skills, salary_range, created_at, recruiters(company_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setJobs((data as any) || []);
      setIsLoading(false);
    };
    fetchJobs();
  }, []);

  // Derive unique filter options from data
  const filterOptions = useMemo(() => {
    const locations = [...new Set(jobs.map(j => j.location))].sort();
    const jobTypes = [...new Set(jobs.map(j => j.job_type))].sort();
    const skills = [...new Set(jobs.flatMap(j => j.required_skills))].sort();
    return { locations, jobTypes, skills };
  }, [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search query — match title, company, location, or skills
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          job.recruiters?.company_name?.toLowerCase().includes(q) ||
          job.required_skills.some(s => s.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (locationFilter !== 'all' && job.location !== locationFilter) return false;
      if (jobTypeFilter !== 'all' && job.job_type !== jobTypeFilter) return false;
      if (skillFilter !== 'all' && !job.required_skills.includes(skillFilter)) return false;

      if (salaryFilter !== 'all' && job.salary_range) {
        const numbers = job.salary_range.match(/\d+/g)?.map(Number) || [];
        const maxSalary = Math.max(...numbers, 0);
        if (salaryFilter === 'under5' && maxSalary >= 5) return false;
        if (salaryFilter === '5to10' && (maxSalary < 5 || maxSalary > 10)) return false;
        if (salaryFilter === '10to20' && (maxSalary < 10 || maxSalary > 20)) return false;
        if (salaryFilter === 'above20' && maxSalary <= 20) return false;
      } else if (salaryFilter !== 'all' && !job.salary_range) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, locationFilter, jobTypeFilter, skillFilter, salaryFilter]);

  const activeFilterCount = [locationFilter, jobTypeFilter, skillFilter, salaryFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
    setJobTypeFilter('all');
    setSkillFilter('all');
    setSalaryFilter('all');
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            Job Openings
          </h1>
          <p className="text-muted-foreground mt-2">Browse available positions and check your eligibility</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, skills, companies, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="bg-primary-foreground text-primary ml-1 text-xs px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <Card className="glass-card animate-fade-in">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {filterOptions.locations.map(loc => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Type</label>
                    <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {filterOptions.jobTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skill</label>
                    <Select value={skillFilter} onValueChange={setSkillFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Skills</SelectItem>
                        {filterOptions.skills.map(skill => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salary (LPA)</label>
                    <Select value={salaryFilter} onValueChange={setSalaryFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Salary</SelectItem>
                        <SelectItem value="under5">Under 5 LPA</SelectItem>
                        <SelectItem value="5to10">5–10 LPA</SelectItem>
                        <SelectItem value="10to20">10–20 LPA</SelectItem>
                        <SelectItem value="above20">Above 20 LPA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                      <X className="w-3 h-3" /> Clear all filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length === jobs.length
                ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''} available`
                : `${filteredJobs.length} of ${jobs.length} jobs match your filters`}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {jobs.length === 0
                ? 'No jobs available at the moment.'
                : 'No jobs match your filters.'}
            </p>
            {jobs.length > 0 && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="glass-card-hover">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.recruiters?.company_name || 'Company'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{timeAgo(job.created_at)}</span>
                        <Badge variant="secondary">{job.job_type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <Badge key={skill} className="badge-primary">{skill}</Badge>
                        ))}
                      </div>
                      {job.salary_range && <p className="text-sm text-muted-foreground">💰 {job.salary_range}</p>}
                    </div>
                    <Link to={`/student/jobs/${job.id}`}>
                      <Button className="btn-primary gap-2">
                        View Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListingsPage;
