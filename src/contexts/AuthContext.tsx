import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserType = 'recruiter' | 'student' | null;

export interface RecruiterProfile {
  id: string;
  user_id: string;
  company_name: string;
  recruiter_name: string;
  email: string;
  designation?: string;
  company_website?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  institution: string;
  degree: string;
  branch: string;
  graduation_year: number;
  profile_complete: boolean;
}

interface AuthContextType {
  user: User | null;
  userType: UserType;
  isAuthenticated: boolean;
  isLoading: boolean;
  recruiterProfile: RecruiterProfile | null;
  studentProfile: StudentProfile | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Check recruiter profile
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (recruiter) {
      setUserType('recruiter');
      setRecruiterProfile(recruiter as RecruiterProfile);
      setStudentProfile(null);
      return;
    }

    // Check student profile
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (student) {
      setUserType('student');
      setStudentProfile(student as StudentProfile);
      setRecruiterProfile(null);
      return;
    }

    // No profile yet (just signed up, profile will be created on register)
    setUserType(null);
    setRecruiterProfile(null);
    setStudentProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid potential deadlock with Supabase client
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setUser(null);
        setUserType(null);
        setRecruiterProfile(null);
        setStudentProfile(null);
      }
      setIsLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message || null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserType(null);
    setRecruiterProfile(null);
    setStudentProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userType,
      isAuthenticated: !!user && userType !== null,
      isLoading,
      recruiterProfile,
      studentProfile,
      signUp,
      signIn,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
