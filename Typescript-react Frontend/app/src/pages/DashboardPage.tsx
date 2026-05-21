// ============================================
// DashboardPage — Bug #5 Fixed + exam→Assessment rename
// PASTE TO: src/pages/DashboardPage.tsx
// ============================================
//
// BUG-5 FIX: Recent Activity rows were dead divs with no navigation.
//   - dashboard_view.py does NOT return course_id / exam_id in activity rows,
//     so we cannot deep-link directly to exam results without a backend change.
//   - SOLUTION A (no backend change): link to /performance which has full history.
//     Each activity row is now a clickable link → /performance
//   - SOLUTION B (with backend change): add course_id+exam_id to dashboard_view
//     then rows link to /courses/:courseId/exam/:examId/results
//   - This file implements SOLUTION A (safe, no backend change needed).
//     To upgrade to B: apply the backend patch in dashboard_view_patch.py and
//     change the onClick to navigate(`/courses/${a.course_id}/exam/${a.exam_id}/results`)
//
// UI: All "Exam" display labels renamed to "Assessment".
//     No API field names, prop names, or type names changed.
// ============================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '@/api/client';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

import {
  BookOpen, TrendingUp, CheckSquare, BarChart3,
  ArrowUpRight, ChevronRight, ClipboardCheck,
  GraduationCap, Users, FileText, ExternalLink,
} from 'lucide-react';

// ─── Token hook (same pattern as rest of app) ─────────────────────────────────
const useT = () => {
  const { isDark } = useTheme();
  return useMemo(() => ({
    isDark,
    bg:       isDark ? '#07090f'            : '#f8fafc',
    cardBg:   isDark ? '#0f131a'            : '#ffffff',
    inputBg:  isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
    border:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textPri:  isDark ? '#f4f6fb'            : '#0a101e',
    textSec:  isDark ? '#94a3b8'            : '#52637a',
    textTer:  isDark ? '#64748b'            : '#94a3b8',
    cyan:     '#06b6d4',
    cyanDim:  isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.08)',
    borderAcc: isDark ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.2)',
    shadow:   isDark
      ? '0 8px 32px rgba(0,0,0,0.45)'
      : '0 2px 16px rgba(0,0,0,0.07)',
  }), [isDark]);
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityItem {
  exam_title:   string;
  course_title: string;
  score:        number;
  total_marks:  number;
  submitted_at: string | null;
  exam_type:    string;
  // BUG-5: these fields exist IF you apply the backend patch (optional)
  course_id?:   number;
  exam_id?:     number;
  student_name?: string; // instructor view only
}

interface DashboardData {
  enrolled:        number;
  avg_score:       number;
  progress:        number;
  exams_done:      number;
  recent_activity: ActivityItem[];
  // instructor extras
  total_submissions?: number;
  pending_tasks?:     string[];
}

// ─── Mini components ──────────────────────────────────────────────────────────

const ScorePill: React.FC<{ score: number; total: number }> = ({ score, total }) => {
  const pct   = total > 0 ? (score / total) * 100 : 0;
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const bg    = pct >= 70 ? 'rgba(16,185,129,0.12)' : pct >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px',
      borderRadius: 99, background: bg, color,
      border: `1px solid ${color}30`,
    }}>
      {score}/{total}
    </span>
  );
};

// UI rename: exam_type labels → Assessment/Test/Practice
const ExamTypePill: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    exam:            { label: 'Assessment', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    test:            { label: 'Test',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
    practice:        { label: 'Practice',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    self_assessment: { label: 'Practice',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  };
  const cfg = map[type] ?? { label: type, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px',
      borderRadius: 99, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`, letterSpacing: '0.04em',
    }}>
      {cfg.label}
    </span>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; accentColor?: string; loading?: boolean;
}> = ({ icon, label, value, sub, accentColor = '#06b6d4', loading }) => {
  const t = useT();
  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.border}`,
      borderRadius: 16, padding: '20px 22px', boxShadow: t.shadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div style={{ marginTop: 16, height: 32, width: 80, borderRadius: 8, background: t.inputBg }} />
      ) : (
        <p style={{ fontSize: '2rem', fontWeight: 900, color: t.textPri, marginTop: 16, lineHeight: 1 }}>
          {value}
        </p>
      )}
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: t.textSec, marginTop: 6 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>{sub}</p>}
    </div>
  );
};

const PerfBar: React.FC<{ label: string; pct: number }> = ({ label, pct }) => {
  const t     = useT();
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: t.textSec }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: t.inputBg, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

// ─── Panel style helper ───────────────────────────────────────────────────────
const usePanel = () => {
  const t = useT();
  return {
    panel: {
      background: t.cardBg,
      border: `1px solid ${t.border}`,
      borderRadius: 18,
      boxShadow: t.shadow,
      overflow: 'hidden',
    } as React.CSSProperties,
    panelHead: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 24px 14px',
      borderBottom: `1px solid ${t.border}`,
    } as React.CSSProperties,
  };
};

// ─── Student Dashboard ────────────────────────────────────────────────────────
const StudentDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const t        = useT();
  const navigate = useNavigate();
  const { panel, panelHead } = usePanel();

  const coursePerf = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    data.recent_activity.forEach(a => {
      if (!map[a.course_title]) map[a.course_title] = { total: 0, count: 0 };
      if (a.total_marks > 0) {
        map[a.course_title].total += (a.score / a.total_marks) * 100;
        map[a.course_title].count += 1;
      }
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, pct: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [data.recent_activity]);

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Greeting */}
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: t.textPri, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: t.textSec, marginTop: 4 }}>
            Your academic overview
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={<BookOpen size={18} color="#06b6d4" />}    label="Enrolled Courses"    value={data.enrolled}                         accentColor="#06b6d4" loading={loading} />
          <StatCard icon={<CheckSquare size={18} color="#10b981" />} label="Assessments Done"    value={data.exams_done}                       accentColor="#10b981" loading={loading} />
          <StatCard icon={<TrendingUp size={18} color="#6366f1" />}  label="Average Score"       value={`${Math.round(data.avg_score)}%`}       accentColor="#6366f1" loading={loading} />
          <StatCard icon={<BarChart3  size={18} color="#f59e0b" />}  label="Progress"            value={`${Math.round(data.progress)}%`}        accentColor="#f59e0b" loading={loading} />
        </div>

        {/* Bottom grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="lg:grid-cols-5">

          {/* Recent Activity — BUG-5 FIX */}
          <div style={panel} className="lg:col-span-3">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Activity</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Latest submissions</p>
              </div>
              <button
                onClick={() => navigate('/performance')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all <ArrowUpRight size={14} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: t.inputBg }} />)}
              </div>
            ) : !data?.recent_activity?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: t.inputBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <ClipboardCheck size={24} color={t.textTer} />
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>No activity yet</p>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 4 }}>Take your first assessment to see results here</p>
              </div>
            ) : (
              <div>
                {data.recent_activity.map((a, i) => {
                  const pct   = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
                  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

                  // BUG-5 FIX:
                  // If backend provides course_id + exam_id (after backend patch),
                  // link to the specific result. Otherwise fall back to /performance.
                  const handleClick = () => {
                    if (a.course_id && a.exam_id) {
                      navigate(`/courses/${a.course_id}/exam/${a.exam_id}/results`);
                    } else {
                      navigate('/performance');
                    }
                  };

                  return (
                    <div
                      key={i}
                      onClick={handleClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleClick()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '14px 24px',
                        borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${t.border}` : 'none',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = t.inputBg;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.exam_title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <p style={{ fontSize: '0.6875rem', color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.course_title}
                          </p>
                          <ExamTypePill type={a.exam_type} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <ScorePill score={a.score} total={a.total_marks} />
                        <span style={{ fontSize: '0.625rem', color: t.textTer }}>
                          {a.submitted_at
                            ? new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : '—'}
                        </span>
                      </div>
                      {/* Visual affordance that row is clickable */}
                      <ExternalLink size={12} color={t.textTer} style={{ flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Academic Performance */}
          <div style={panel} className="lg:col-span-2">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Academic Performance</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Average score by course</p>
              </div>
            </div>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 40, borderRadius: 12, background: t.inputBg }} />)}
              </div>
            ) : !coursePerf.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: t.inputBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <BarChart3 size={24} color={t.textTer} />
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>Complete assessments</p>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 4 }}>to see your scores here</p>
              </div>
            ) : (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {coursePerf.map((c, i) => <PerfBar key={i} label={c.name} pct={c.pct} />)}
                <button
                  onClick={() => navigate('/performance')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 12, marginTop: 4, fontSize: '0.75rem', fontWeight: 700, color: t.textSec, background: t.inputBg, border: `1px solid ${t.border}`, cursor: 'pointer' }}
                >
                  Full Report <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Instructor Dashboard ─────────────────────────────────────────────────────
const InstructorDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const t        = useT();
  const navigate = useNavigate();
  const { panel, panelHead } = usePanel();

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: t.textPri, margin: 0 }}>Instructor Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: t.textSec, marginTop: 4 }}>Overview of your courses and student activity</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={<Users      size={18} color="#06b6d4" />} label="Enrolled Students"       value={data.enrolled}                       accentColor="#06b6d4" loading={loading} />
          <StatCard icon={<FileText   size={18} color="#6366f1" />} label="Assessments Created"     value={data.exams_done}                     accentColor="#6366f1" loading={loading} />
          <StatCard icon={<TrendingUp size={18} color="#10b981" />} label="Avg Student Score"       value={`${Math.round(data.avg_score)}%`}     accentColor="#10b981" loading={loading} />
          <StatCard icon={<CheckSquare size={18} color="#f59e0b"/>} label="Total Submissions"       value={data.total_submissions ?? 0}          accentColor="#f59e0b" loading={loading} />
        </div>

        {/* Recent student submissions */}
        <div style={panel}>
          <div style={panelHead}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Student Submissions</p>
              <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Latest assessment activity</p>
            </div>
            <button
              onClick={() => navigate('/performance')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Full Report <ArrowUpRight size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: t.inputBg }} />)}
            </div>
          ) : !data.recent_activity.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
              <ClipboardCheck size={32} color={t.textTer} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>No submissions yet</p>
            </div>
          ) : (
            <div>
              {data.recent_activity.map((a, i) => {
                const pct   = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
                const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.exam_title}
                        {a.student_name && <span style={{ fontWeight: 400, color: t.textTer }}> — {a.student_name}</span>}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <p style={{ fontSize: '0.6875rem', color: t.textTer }}>{a.course_title}</p>
                        <ExamTypePill type={a.exam_type} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <ScorePill score={a.score} total={a.total_marks} />
                      <span style={{ fontSize: '0.625rem', color: t.textTer }}>
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main entry ───────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user }  = useAuth();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await analyticsApi.getDashboardSummary();
      setData(result);
    } catch {
      toast.error('Could not load dashboard data');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(true); }, [fetchDashboard]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchDashboard(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchDashboard]);

  const emptyData: DashboardData = {
    enrolled: 0, avg_score: 0, progress: 0,
    exams_done: 0, recent_activity: [],
  };

  if (user?.role === 'instructor') {
    return <InstructorDashboard data={data ?? emptyData} loading={loading} />;
  }

  return <StudentDashboard data={data ?? emptyData} loading={loading} />;
};

export default DashboardPage;