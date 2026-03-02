import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserType = 'recruiter' | 'student' | null;

export interface RecruiterProfile {
  id: string;
  companyName: string;
  recruiterName: string;
  email: string;
  designation?: string;
  companyWebsite?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  institution: string;
  degree: string;
  branch: string;
  graduationYear: number;
  profileComplete: boolean;
  platformLinks?: {
    leetcode?: string;
    github?: string;
    linkedin?: string;
  };
}

interface AuthContextType {
  userType: UserType;
  isAuthenticated: boolean;
  isLoading: boolean;
  recruiterProfile: RecruiterProfile | null;
  studentProfile: StudentProfile | null;
  loginAsRecruiter: (profile: RecruiterProfile) => void;
  loginAsStudent: (profile: StudentProfile) => void;
  logout: () => Promise<void>;
  updateStudentProfile: (updates: Partial<StudentProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userType, setUserType] = useState<UserType>(() => {
    return localStorage.getItem('demo_user_type') as UserType;
  });
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(() => {
    const stored = localStorage.getItem('demo_recruiter_profile');
    return stored ? JSON.parse(stored) : null;
  });
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() => {
    const stored = localStorage.getItem('demo_student_profile');
    return stored ? JSON.parse(stored) : null;
  });

  const loginAsRecruiter = useCallback((profile: RecruiterProfile) => {
    localStorage.setItem('demo_user_type', 'recruiter');
    localStorage.setItem('demo_recruiter_profile', JSON.stringify(profile));
    setUserType('recruiter');
    setRecruiterProfile(profile);
    setStudentProfile(null);
  }, []);

  const loginAsStudent = useCallback((profile: StudentProfile) => {
    localStorage.setItem('demo_user_type', 'student');
    localStorage.setItem('demo_student_profile', JSON.stringify(profile));
    setUserType('student');
    setStudentProfile(profile);
    setRecruiterProfile(null);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('demo_user_type');
    localStorage.removeItem('demo_recruiter_profile');
    localStorage.removeItem('demo_student_profile');
    setUserType(null);
    setRecruiterProfile(null);
    setStudentProfile(null);
  }, []);

  const updateStudentProfile = useCallback((updates: Partial<StudentProfile>) => {
    setStudentProfile(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('demo_student_profile', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      userType,
      isAuthenticated: userType !== null,
      isLoading: false,
      recruiterProfile,
      studentProfile,
      loginAsRecruiter,
      loginAsStudent,
      logout,
      updateStudentProfile,
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
