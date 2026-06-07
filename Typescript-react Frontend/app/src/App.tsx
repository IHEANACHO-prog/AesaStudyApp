// ============================================
// AESA Study Platform - Main App
// PASTE TO: src/App.tsx
// ============================================

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/useAuth';
import { ThemeProvider, ThemeContext } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';

// Components
import Layout from '@/components/Layout';

// Pages
import AuthPage                from '@/pages/AuthPage';
import DashboardPage           from '@/pages/DashboardPage';
import CoursesPage             from '@/pages/CoursesPage';
import CourseDetailPage        from '@/pages/CourseDetailPage';
import ExamPage                from '@/pages/ExamPage';
import PerformancePage         from '@/pages/PerformancePage';
import ForumPage               from '@/pages/ForumPage';
import ForumThreadPage         from '@/pages/ForumThreadPage';
import AdminPage               from '@/pages/AdminPage';
import ProfilePage             from '@/pages/ProfilePage';
import TopicDetailPage         from '@/pages/TopicDetailPage';
import SelfAssessmentPage      from '@/pages/SelfAssessmentPage';
import InstructorTopicEditPage from '@/pages/InstructorTopicEditPage';
import TopicsPage              from '@/pages/TopicsPage';
import ExamManagePage          from '@/pages/ExamManagePage';
import ExamEditPage            from '@/pages/ExamEditPage';
import AssessmentsListPage     from '@/pages/AssessmentsListPage';

// ── Dynamic theme-color meta tag ───────────────────────────────

const AppInner: React.FC = () => {
  const { theme } = React.useContext(ThemeContext);
  const location = useLocation();

  React.useEffect(() => {
    const isLogin = location.pathname === '/login';
    const color = isLogin
      ? '#0f172a'
      : theme === 'dark'
      ? '#0f172a'
      : '#f8fafc';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }, [theme, location.pathname]);

  return null;
};

// ── Public route guard ─────────────────────────────────────────

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#00B4D8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const home = user.role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

// ── Role redirect ──────────────────────────────────────────────

const RoleHomeRedirect: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#00B4D8] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const to = user?.role === 'admin' ? '/admin' : '/dashboard';
  return <Navigate to={to} replace />;
};

// ── App ────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
        <Routes>
          {/* Auth entry */}
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />

          {/* Protected shell */}
          <Route element={<Layout />}>
            <Route path="/dashboard"                                        element={<DashboardPage />}           />

            {/* Courses */}
            <Route path="/courses"                                          element={<CoursesPage />}             />
            <Route path="/courses/:courseId"                                element={<CourseDetailPage />}        />

            {/* Topics & Content */}
            <Route path="/courses/:courseId/topics"                         element={<TopicsPage />}              />
            <Route path="/courses/:courseId/topics/:topicId"                element={<TopicDetailPage />}         />
            <Route path="/courses/:courseId/topics/:topicId/edit"           element={<InstructorTopicEditPage />} />
            <Route path="/courses/:courseId/self-assessment"                element={<SelfAssessmentPage />}      />

            {/* Assessments */}
            <Route path="/exams"                                            element={<AssessmentsListPage />}     />

            {/* Assessment engine */}
            <Route path="/courses/:courseId/exam-manage"                    element={<ExamManagePage />}          />
            <Route path="/courses/:courseId/exam/:examId"                   element={<ExamPage />}                />
            <Route path="/courses/:courseId/exam/:examId/edit"              element={<ExamEditPage />}            />

            {/* General */}
            <Route path="/performance"                                      element={<PerformancePage />}         />
            <Route path="/forum"                                            element={<ForumPage />}               />
            <Route path="/forum/:courseId/:postId"                          element={<ForumThreadPage />}         />
            <Route path="/admin"                                            element={<AdminPage />}               />
            <Route path="/profile"                                          element={<ProfilePage />}             />
          </Route>

          {/* Catch-all */}
          <Route path="/"  element={<RoleHomeRedirect />} />
          <Route path="*"  element={<RoleHomeRedirect />} />
        </Routes>

        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
