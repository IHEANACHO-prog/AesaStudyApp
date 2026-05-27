// ============================================
// AESA — Dashboard Page (Instructor My Courses)
// PASTE TO: src/pages/DashboardPage.tsx
//
// INSTRUCTOR CHANGES:
//  [INST-1]  "Enrolled Students" stat = total unique students across all assigned courses
//  [INST-2]  New "My Courses" panel: per-course breakdown with enrolled count
//  [INST-3]  "View Details" button on each course row → opens modal
//  [INST-4]  Modal lists enrolled students for that course
//  [INST-5]  instructor_dashboard API called on mount
// ============================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '@/api/client';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  BookOpen, TrendingUp, CheckSquare, BarChart3,
  ArrowUpRight, ChevronRight, ClipboardCheck,
  Users, FileText, GraduationCap, X, User,
  BookMarked, Layers,
} from 'lucide-react';

// ─── Token hook ───────────────────────────────────────────────────────────────
const useT = () => {
  const { isDark } = useTheme();
  return useMemo(() => ({
    isDark,
    bg:        isDark ? '#07090f'                  : '#f8fafc',
    cardBg:    isDark ? '#0f131a'                  : '#ffffff',
    inputBg:   isDark ? 'rgba(255,255,255,0.04)'   : '#f1f5f9',
    border:    isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(0,0,0,0.08)',
    borderStr: isDark ? 'rgba(255,255,255,0.14)'   : 'rgba(0,0,0,0.14)',
    textPri:   isDark ? '#f4f6fb'                  : '#0a101e',
    textSec:   isDark ? '#94a3b8'                  : '#52637a',
    textTer:   isDark ? '#64748b'                  : '#94a3b8',
    cyan:      '#06b6d4',
    cyanDim:   isDark ? 'rgba(6,182,212,0.12)'     : 'rgba(6,182,212,0.08)',
    borderAcc: isDark ? 'rgba(6,182,212,0.25)'     : 'rgba(6,182,212,0.2)',
    shadow:    isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 2px 16px rgba(0,0,0,0.07)',
    rowHover:  isDark ? 'rgba(255,255,255,0.04)'   : '#f8fafc',
    green:     '#10b981',
    greenDim:  isDark ? 'rgba(16,185,129,0.10)'    : 'rgba(16,185,129,0.07)',
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
  course_id?:   number;
  exam_id?:     number;
  student_name?: string;
}

interface DashboardData {
  enrolled:           number;
  avg_score:          number;
  progress:           number;
  exams_done:         number;
  recent_activity:    ActivityItem[];
  total_submissions?: number;
  pending_tasks?:     string[];
}

// [INST-2] Instructor-specific types
interface CourseRow {
  course_id:      number;
  course_code:    string;
  course_title:   string;
  semester:       string;
  level:          string;
  department:     string;
  enrolled_count: number;
}

interface InstructorDashData {
  total_assigned_courses:  number;
  total_enrolled_students: number;
  courses:                 CourseRow[];
}

interface EnrolledStudent {
  student_id:    number;
  full_name:     string;
  matric_number: string;
  level:         string;
  department:    string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getActivityUrl = (a: ActivityItem): string => {
  if (!a.course_id) return '/performance';
  if (a.exam_type === 'self_assessment' || a.exam_type === 'practice')
    return `/courses/${a.course_id}/self-assessment?review=true`;
  if (a.exam_id) return `/courses/${a.course_id}/exam/${a.exam_id}?review=true`;
  return '/performance';
};

const getActivityTitle = (a: ActivityItem): string => {
  if (a.exam_type === 'self_assessment' || a.exam_type === 'practice')
    return `Self Assessment — ${a.course_title}`;
  return a.exam_title;
};

// ─── Mini components ──────────────────────────────────────────────────────────

const ScorePill: React.FC<{ score: number; total: number }> = ({ score, total }) => {
  const pct = total > 0 ? (score / total) * 100 : 0;
  const color = score === 0 ? '#64748b' : pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const bg    = score === 0 ? 'rgba(100,116,139,0.12)' : pct >= 70 ? 'rgba(16,185,129,0.12)' : pct >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: bg, color, border: `1px solid ${color}30` }}>
      {score}/{total}
    </span>
  );
};

const ExamTypePill: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    exam:            { label: 'Assessment',      color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
    test:            { label: 'Test',            color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
    practice:        { label: 'Self Assessment', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
    self_assessment: { label: 'Self Assessment', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  };
  const cfg = map[type] ?? { label: type, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  return (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, letterSpacing: '0.04em' }}>
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
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 16, padding: '20px 22px', boxShadow: t.shadow }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accentColor}18`, border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      {loading
        ? <div style={{ marginTop: 16, height: 32, width: 80, borderRadius: 8, background: t.inputBg }} />
        : <p style={{ fontSize: '2rem', fontWeight: 900, color: t.textPri, marginTop: 16, lineHeight: 1 }}>{value}</p>
      }
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: t.textSec, marginTop: 6 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>{sub}</p>}
    </div>
  );
};

const PerfBar: React.FC<{ label: string; pct: number }> = ({ label, pct }) => {
  const t = useT();
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

const usePanel = () => {
  const t = useT();
  return {
    panel: { background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 18, boxShadow: t.shadow, overflow: 'hidden' } as React.CSSProperties,
    panelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: `1px solid ${t.border}` } as React.CSSProperties,
  };
};

// ─── Activity Row ─────────────────────────────────────────────────────────────

const ActivityRow: React.FC<{ item: ActivityItem; isLast: boolean; onClick: () => void }> = ({ item, isLast, onClick }) => {
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const pct   = item.total_marks > 0 ? (item.score / item.total_marks) * 100 : 0;
  const color = item.score === 0 ? '#64748b' : pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div
      role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${t.border}`, background: hovered ? t.rowHover : 'transparent', cursor: 'pointer', transition: 'background 0.12s ease' }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getActivityTitle(item)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {item.exam_type !== 'self_assessment' && item.exam_type !== 'practice' && (
            <p style={{ fontSize: '0.6875rem', color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {item.course_title}
            </p>
          )}
          <ExamTypePill type={item.exam_type} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <ScorePill score={item.score} total={item.total_marks} />
        <span style={{ fontSize: '0.625rem', color: t.textTer }}>
          {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      </div>
      <ChevronRight size={14} color={hovered ? t.cyan : t.textTer} style={{ flexShrink: 0, transition: 'color 0.12s ease' }} />
    </div>
  );
};

// ─── [INST-4] Enrolled Students Modal ────────────────────────────────────────

const EnrolledStudentsModal: React.FC<{
  open:     boolean;
  onClose:  () => void;
  courseId: number | null;
  courseTitle: string;
}> = ({ open, onClose, courseId, courseTitle }) => {
  const t = useT();
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!open || !courseId) return;
    setLoading(true);
    fetch(`/api/courses/${courseId}/enrolled-students/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('aesa_access')}` },
    })
      .then(r => r.json())
      .then(data => setStudents(data.students ?? []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [open, courseId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 18, color: t.textPri, maxWidth: 540, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <DialogTitle style={{ fontWeight: 800, color: t.textPri, fontSize: '1rem' }}>
                Enrolled Students
              </DialogTitle>
              <p style={{ fontSize: '0.75rem', color: t.textSec, marginTop: 3 }}>{courseTitle}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!loading && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: t.cyanDim, color: t.cyan, border: `1px solid ${t.borderAcc}` }}>
                  {students.length} student{students.length !== 1 ? 's' : ''}
                </span>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textTer, display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: t.inputBg }} />)}
            </div>
          ) : students.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: t.inputBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Users size={22} color={t.textTer} />
              </div>
              <p style={{ fontWeight: 600, color: t.textSec, fontSize: '0.875rem' }}>No student enrolled yet</p>
              <p style={{ color: t.textTer, fontSize: '0.75rem', marginTop: 4 }}>Students who enroll in this course will appear here</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {students.map((s, i) => (
                <div key={s.student_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                  borderBottom: i < students.length - 1 ? `1px solid ${t.border}` : 'none',
                }}>
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.cyanDim, border: `1px solid ${t.borderAcc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} color={t.cyan} strokeWidth={2} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.full_name}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: t.textSec, marginTop: 2 }}>
                      {s.matric_number}
                    </p>
                  </div>

                  {/* Level + Dept badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {s.level && (
                      <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: t.inputBg, color: t.textSec, border: `1px solid ${t.border}` }}>
                        {s.level}
                      </span>
                    )}
                    {s.department && (
                      <span style={{ fontSize: '0.625rem', color: t.textTer, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {s.department}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── [INST-2] My Courses Panel ────────────────────────────────────────────────

const MyCourseRow: React.FC<{
  row:       CourseRow;
  isLast:    boolean;
  onView:    (row: CourseRow) => void;
}> = ({ row, isLast, onView }) => {
  const t = useT();
  const [hov, setHov] = useState(false);

  const semColor = row.semester === 'FIRST'
    ? { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.20)' }
    : { color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.20)' };

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
        background: hov ? t.rowHover : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: t.cyanDim, border: `1px solid ${t.borderAcc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BookMarked size={16} color={t.cyan} strokeWidth={2} />
      </div>

      {/* Course info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.course_code}
          </p>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: semColor.bg, color: semColor.color, border: `1px solid ${semColor.border}`, flexShrink: 0 }}>
            {row.semester === 'FIRST' ? '1st Sem' : '2nd Sem'}
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: t.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.course_title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
          {row.level && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={10} color={t.textTer} />
              <span style={{ fontSize: '0.6875rem', color: t.textTer }}>{row.level}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enrolled count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: t.greenDim, border: `1px solid rgba(16,185,129,0.2)` }}>
          <Users size={11} color={t.green} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: t.green }}>{row.enrolled_count}</span>
        </div>
        <button
          onClick={() => onView(row)}
          style={{ fontSize: '0.6875rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
        >
          View Details <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
};

// ─── Student Dashboard ────────────────────────────────────────────────────────

const StudentDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const t = useT();
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
      .sort((a, b) => b.pct - a.pct).slice(0, 4);
  }, [data.recent_activity]);

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: t.textPri, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: t.textSec, marginTop: 4 }}>Your academic overview</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={<BookOpen    size={18} color="#06b6d4" />} label="Enrolled Courses"  value={data.enrolled}                   accentColor="#06b6d4" loading={loading} />
          <StatCard icon={<CheckSquare size={18} color="#10b981" />} label="Assessments Done"  value={data.exams_done}                 accentColor="#10b981" loading={loading} />
          <StatCard icon={<TrendingUp  size={18} color="#6366f1" />} label="Average Score"     value={`${Math.round(data.avg_score)}%`} accentColor="#6366f1" loading={loading} />
          <StatCard icon={<BarChart3   size={18} color="#f59e0b" />} label="Progress"          value={`${Math.round(data.progress)}%`}  accentColor="#f59e0b" loading={loading} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="lg:grid-cols-5">
          <div style={panel} className="lg:col-span-3">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Activity</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Tap any row to review your answers</p>
              </div>
              <button onClick={() => navigate('/performance')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>
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
                {data.recent_activity.map((a, i) => (
                  <ActivityRow key={i} item={a} isLast={i === data.recent_activity.length - 1} onClick={() => navigate(getActivityUrl(a))} />
                ))}
              </div>
            )}
          </div>
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
                <button onClick={() => navigate('/performance')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 12, marginTop: 4, fontSize: '0.75rem', fontWeight: 700, color: t.textSec, background: t.inputBg, border: `1px solid ${t.border}`, cursor: 'pointer' }}>
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

// ─── [INST-1/2/3] Instructor Dashboard ───────────────────────────────────────

const InstructorDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const t        = useT();
  const navigate = useNavigate();
  const { panel, panelHead } = usePanel();

  // [INST-5] Instructor-specific data
  const [instData,   setInstData]   = useState<InstructorDashData | null>(null);
  const [instLoading, setInstLoading] = useState(true);

  // [INST-3] Modal state
  const [modalOpen,     setModalOpen]     = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);

  useEffect(() => {
    fetch('/api/instructor/dashboard/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('aesa_access')}` },
    })
      .then(r => r.json())
      .then(d => setInstData(d))
      .catch(() => toast.error('Failed to load instructor stats'))
      .finally(() => setInstLoading(false));
  }, []);

  const openModal = (row: CourseRow) => {
    setSelectedCourse(row);
    setModalOpen(true);
  };

  const totalStudents = instData?.total_enrolled_students ?? 0;
  const totalCourses  = instData?.total_assigned_courses  ?? 0;
  const courseRows    = instData?.courses ?? [];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: t.textPri, margin: 0 }}>Instructor Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: t.textSec, marginTop: 4 }}>Overview of your courses and student activity</p>
        </div>

        {/* [INST-1] Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={<Users        size={18} color="#06b6d4" />} label="Enrolled Students"   value={totalStudents}                   accentColor="#06b6d4" loading={instLoading} />
          <StatCard icon={<GraduationCap size={18} color="#10b981" />} label="My Courses"          value={totalCourses}                    accentColor="#10b981" loading={instLoading} />
          <StatCard icon={<FileText     size={18} color="#6366f1" />} label="Assessments Created" value={data.exams_done}                 accentColor="#6366f1" loading={loading}     />
          <StatCard icon={<CheckSquare  size={18} color="#f59e0b" />} label="Total Submissions"   value={data.total_submissions ?? 0}     accentColor="#f59e0b" loading={loading}     />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* [INST-2] My Courses breakdown */}
          <div style={{ ...panel, gridColumn: '1 / -1' }}>
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>My Courses</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>
                  Assigned courses · enrolled students per course
                </p>
              </div>
              <button
                onClick={() => navigate('/courses')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Manage <ArrowUpRight size={14} />
              </button>
            </div>

            {instLoading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: t.inputBg }} />)}
              </div>
            ) : courseRows.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: t.inputBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <BookOpen size={24} color={t.textTer} />
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>No courses assigned yet</p>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 4 }}>
                  Go to <button onClick={() => navigate('/courses')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.cyan, fontWeight: 700, fontSize: '0.75rem', padding: 0 }}>Courses</button> and click Unassigned on any course to claim it
                </p>
              </div>
            ) : (
              <div>
                {courseRows.map((row, i) => (
                  <MyCourseRow
                    key={row.course_id}
                    row={row}
                    isLast={i === courseRows.length - 1}
                    onView={openModal}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent submissions */}
          <div style={{ ...panel, gridColumn: '1 / -1' }}>
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Student Submissions</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Latest assessment activity</p>
              </div>
              <button onClick={() => navigate('/performance')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: t.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>
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
                  const color = a.score === 0 ? '#64748b' : pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.exam_title}
                          {a.student_name && <span style={{ fontWeight: 400, color: t.textTer }}> — {a.student_name}</span>}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
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

      {/* [INST-4] Enrolled students modal */}
      <EnrolledStudentsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courseId={selectedCourse?.course_id ?? null}
        courseTitle={selectedCourse ? `${selectedCourse.course_code} — ${selectedCourse.course_title}` : ''}
      />
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
    const handle = () => { if (document.visibilityState === 'visible') fetchDashboard(false); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [fetchDashboard]);

  const emptyData: DashboardData = { enrolled: 0, avg_score: 0, progress: 0, exams_done: 0, recent_activity: [] };

  if (user?.role === 'instructor') return <InstructorDashboard data={data ?? emptyData} loading={loading} />;
  return <StudentDashboard data={data ?? emptyData} loading={loading} />;
};

export default DashboardPage;