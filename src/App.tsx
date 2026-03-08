import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

import RecruiterLogin from "./pages/recruiter/RecruiterLogin";
import RecruiterRegister from "./pages/recruiter/RecruiterRegister";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import PostJobPage from "./pages/recruiter/PostJobPage";
import CandidateRankingPage from "./pages/recruiter/CandidateRankingPage";
import AnalyticsDashboard from "./pages/recruiter/AnalyticsDashboard";
import InterviewSchedulePage from "./pages/recruiter/InterviewSchedulePage";
import TalentDiscoveryPage from "./pages/recruiter/TalentDiscoveryPage";

import StudentLogin from "./pages/student/StudentLogin";
import StudentRegister from "./pages/student/StudentRegister";
import StudentDashboard from "./pages/student/StudentDashboard";
import JobListingsPage from "./pages/student/JobListingsPage";
import JobDetailPage from "./pages/student/JobDetailPage";
import ApplicationsPage from "./pages/student/ApplicationsPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import EligibilityCheckerPage from "./pages/student/EligibilityCheckerPage";
import InterviewsPage from "./pages/student/InterviewsPage";
import NotificationsPage from "./pages/student/NotificationsPage";
import CareerPathPage from "./pages/student/CareerPathPage";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />

              {/* Recruiter Routes */}
              <Route path="/recruiter/login" element={<RecruiterLogin />} />
              <Route path="/recruiter/register" element={<RecruiterRegister />} />
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
              <Route path="/recruiter/post-job" element={<PostJobPage />} />
              <Route path="/recruiter/jobs/:jobId/candidates" element={<CandidateRankingPage />} />
              <Route path="/recruiter/analytics" element={<AnalyticsDashboard />} />
              <Route path="/recruiter/interviews" element={<InterviewSchedulePage />} />

              {/* Student Routes */}
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/student/register" element={<StudentRegister />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/jobs" element={<JobListingsPage />} />
              <Route path="/student/jobs/:jobId" element={<JobDetailPage />} />
              <Route path="/student/jobs/:jobId/eligibility" element={<EligibilityCheckerPage />} />
              <Route path="/student/applications" element={<ApplicationsPage />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
              <Route path="/student/interviews" element={<InterviewsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              {/* Legacy redirects */}
              <Route path="/recruiter" element={<Navigate to="/recruiter/login" replace />} />
              <Route path="/student" element={<Navigate to="/student/login" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
