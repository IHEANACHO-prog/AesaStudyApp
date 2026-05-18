// ============================================
// AESA — Unified Auth Context
// PASTE TO: src/contexts/useAuth.tsx
// ============================================

import React, {
  createContext, useState, useEffect,
  useCallback, useContext,
} from 'react';
import type { User, UserRole, Student, Instructor } from '@/types';
import {
  authApi, getToken, setTokens, setUserData,
  clearToken, refreshAccessToken,
} from '@/api/client';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Context interface
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  user:               User | null;
  studentProfile:     Student | null;
  instructorProfile:  Instructor | null;
  isAuthenticated:    boolean;
  isLoading:          boolean;
  isStudent:          boolean;
  isInstructor:       boolean;
  isAdmin:            boolean;
  login:              (username: string, password: string) => Promise<User>;
  registerStudent:    (data: any) => Promise<void>;
  registerInstructor: (data: any) => Promise<void>;
  registerAdmin:      (data: any) => Promise<void>;
  logout:             () => void;
  updateProfile:      (data: Record<string, any> | FormData) => Promise<void>;
  deleteAccount:      () => Promise<void>;
  refreshUser:        () => Promise<void>;
  hasRole:            (role: UserRole | UserRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────────
// Profile normaliser
// ─────────────────────────────────────────────────────────────────────────────

function normaliseProfile(profile: any): {
  user:              User;
  studentProfile:    Student | null;
  instructorProfile: Instructor | null;
} {
  // ── Legacy nested shape (kept for safety) ─────────────────────────────────
  if (profile.user && typeof profile.user === 'object') {
    const u    = profile.user;
    const role: UserRole = 'matric_number' in profile ? 'student' : 'instructor';

    const user: User = {
      id:              u.id,
      username:        u.username,
      first_name:      u.first_name  ?? '',
      last_name:       u.last_name   ?? '',
      email:           u.email       ?? '',
      role,
      profile_picture: u.profile_picture ?? null,
      date_joined:     u.date_joined ?? null,
    };

    return {
      user,
      studentProfile:    role === 'student'    ? (profile as Student)    : null,
      instructorProfile: role === 'instructor' ? (profile as Instructor) : null,
    };
  }

  // ── Flat shape (what /api/users/me/ actually returns) ─────────────────────
  const role: UserRole = (profile.role as UserRole) ?? 'admin';

  const user: User = {
    id:              profile.id,
    username:        profile.username,
    first_name:      profile.first_name  ?? '',
    last_name:       profile.last_name   ?? '',
    email:           profile.email       ?? '',
    role,
    profile_picture: profile.profile_picture ?? null,
    date_joined:     profile.date_joined ?? null,
  };

  // ── Student profile derived from flat shape ───────────────────────────────
  const studentProfile: Student | null =
    role === 'student' && profile.student_id != null
      ? {
          id:            profile.student_id,
          user,
          department:    profile.department    ?? null,
          level:         profile.level         ?? null,
          matric_number: profile.matric_number ?? '',
        } as unknown as Student
      : null;

  // ── Instructor profile derived from flat shape ────────────────────────────
  const instructorProfile: Instructor | null =
    role === 'instructor' && profile.instructor_id != null
      ? {
          id:         profile.instructor_id,
          user,
          department: profile.department ?? null,
          staff_id:   profile.staff_id   ?? '',
        } as unknown as Instructor
      : null;

  return { user, studentProfile, instructorProfile };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,              setUser]              = useState<User | null>(null);
  const [studentProfile,    setStudentProfile]    = useState<Student | null>(null);
  const [instructorProfile, setInstructorProfile] = useState<Instructor | null>(null);
  const [isLoading,         setIsLoading]         = useState(true);

  // ── Apply normalised profile to state ─────────────────────────────────────
  const applyProfile = useCallback((profile: any) => {
    const { user, studentProfile, instructorProfile } = normaliseProfile(profile);
    setUser(user);
    setStudentProfile(studentProfile);
    setInstructorProfile(instructorProfile);
    setUserData(user.id, user.username);
    localStorage.setItem('aesa_role', user.role);
  }, []);

  // ── Restore session on mount ───────────────────────────────────────────────
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      await refreshAccessToken().catch(() => null);
      const profile = await authApi.getCurrentUser();
      applyProfile(profile);
    } catch {
      clearToken();
    } finally {
      setIsLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<User> => {
    const res = await authApi.login({ username, password });
    setTokens(res.access, res.refresh);
    const profile  = await authApi.getCurrentUser();
    const { user } = normaliseProfile(profile);
    applyProfile(profile);
    toast.success('Welcome back!');
    return user;
  };

  // ── Registration ──────────────────────────────────────────────────────────
  const registerStudent = async (data: any) => {
    await authApi.registerStudent(data);
  };

  const registerInstructor = async (data: any) => {
    await authApi.registerInstructor(data);
  };

  const registerAdmin = async (data: any) => {
    await authApi.registerAdmin(data);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    setUser(null);
    setStudentProfile(null);
    setInstructorProfile(null);
    toast.info('Logged out');
    window.location.href = '/login';
  };

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = async (data: Record<string, any> | FormData) => {
    try {
      if (data instanceof FormData) {
        await authApi.updateProfilePicture(data);
      } else {
        await authApi.updateProfile(data);
      }
      const profile = await authApi.getCurrentUser();
      applyProfile(profile);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
      throw err;
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      clearToken();
      setUser(null);
      setStudentProfile(null);
      setInstructorProfile(null);
      toast.success('Account deleted');
      window.location.href = '/login';
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
      throw err;
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasRole = (role: UserRole | UserRole[]) => {
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  };

  // FIX: removed redundant ?? false — === already returns a boolean
  const isStudent    = user?.role === 'student';
  const isInstructor = user?.role === 'instructor';
  const isAdmin      = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        instructorProfile,
        isAuthenticated: !!user,
        isLoading,
        isStudent,
        isInstructor,
        isAdmin,
        login,
        registerStudent,
        registerInstructor,
        registerAdmin,
        logout,
        updateProfile,
        deleteAccount,
        refreshUser: fetchCurrentUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};  