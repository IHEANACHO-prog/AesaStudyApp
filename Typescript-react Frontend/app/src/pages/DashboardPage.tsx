// ============================================
// DashboardPage — Student + Instructor
// PASTE TO: src/pages/DashboardPage.tsx
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { analyticsApi, getUserData } from '@/api/client';
import { usePageTheme } from '@/hooks/usePageTheme';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, TrendingUp, Target, ClipboardCheck,
  ArrowUpRight, BarChart3, ChevronRight, Sparkles,
  Users, FileText, AlertTriangle, GraduationCap,
  CheckCircle2, Clock, PenLine,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  enrolled:          number;
  avg_score:         number;
  progress:          number;
  exams_done:        number;
  total_submissions?: number;
  recent_activity:   RecentItem[];
  pending_tasks?:    string[];
}

interface RecentItem {
  exam_title:    string;
  course_title:  string;
  score:         number;
  total_marks:   number;
  submitted_at:  string;
  exam_type:     string;
  student_name?: string;
}

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let current = 0;
    const steps = 36;
    const inc   = target / steps;
    const id    = setInterval(() => {
      current += inc;
      if (current >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(current));
    }, 28);
    return () => clearInterval(id);
  }, [target]);
  return <span>{suffix === '%' ? val.toFixed(1) : val}{suffix}</span>;
}

// ── Score pill ────────────────────────────────────────────────────────────────

function ScorePill({ score, total }: { score: number; total: number }) {
  const pct   = total > 0 ? Math.min(100, (score / total) * 100) : 0;
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 900, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {score}/{total}<span style={{ color: `${color}90` }}>({Math.round(pct)}%)</span>
    </span>
  );
}

// ── Exam type pill ────────────────────────────────────────────────────────────

const EXAM_LABELS: Record<string, { label: string; color: string }> = {
  self_assessment: { label: 'Practice', color: '#22d3ee' },
  practice:        { label: 'Practice', color: '#22d3ee' },
  test:            { label: 'Test',     color: '#a78bfa' },
  exam:            { label: 'Exam',     color: '#f59e0b' },
};

function ExamTypePill({ type }: { type: string }) {
  const { label, color } = EXAM_LABELS[type] ?? { label: type, color: '#64748b' };
  return (
    <span style={{ fontSize: '0.625rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: `${color}18`, color, border: `1px solid ${color}25` }}>
      {label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, suffix, accentColor, loading }: {
  icon: React.ElementType; label: string; value: number; suffix?: string; accentColor: string; loading: boolean;
}) {
  const t = usePageTheme();
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18, padding: 20,
      border: `1px solid ${accentColor}22`,
      background: t.isDark
        ? `linear-gradient(135deg, ${accentColor}09 0%, transparent 60%)`
        : `linear-gradient(135deg, ${accentColor}07 0%, ${t.cardBg} 60%)`,
      boxShadow: t.shadow, transition: 'transform 0.15s ease',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
    >
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', pointerEvents: 'none', background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)` }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}>
          <Icon size={20} style={{ color: accentColor }} />
        </div>
      </div>
      {loading
        ? <div style={{ height: 36, width: 80, borderRadius: 10, background: t.inputBg, marginBottom: 4 }} />
        : <p style={{ fontSize: '1.875rem', fontWeight: 900, lineHeight: 1, marginBottom: 4, color: accentColor }}>
            <AnimatedNumber target={value} suffix={suffix} />
          </p>
      }
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textTer }}>{label}</p>
    </div>
  );
}

// ── Performance bar ───────────────────────────────────────────────────────────

function PerfBar({ label, pct }: { label: string; pct: number }) {
  const t     = usePageTheme();
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, marginLeft: 12, color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: t.border }}>
        <div style={{ height: '100%', borderRadius: 999, transition: 'width 0.7s ease-out', width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  );
}

// ── INSTRUCTOR DASHBOARD ──────────────────────────────────────────────────────

const InstructorDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const navigate = useNavigate();
  const t        = usePageTheme();
  const { username } = getUserData();

  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const panel: React.CSSProperties = {
    borderRadius: 20, border: `1px solid ${t.cardBorder}`,
    background: t.cardBg, overflow: 'hidden', boxShadow: t.shadow,
  };
  const panelHead: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: `1px solid ${t.border}`, background: t.inputBg,
  };

  // Build class performance from recent activity
  const classPerf = React.useMemo(() => {
    if (!data?.recent_activity?.length) return [];
    const map: Record<string, { total: number; count: number; maxMarks: number }> = {};
    data.recent_activity.forEach(a => {
      if (!map[a.course_title]) map[a.course_title] = { total: 0, count: 0, maxMarks: a.total_marks };
      map[a.course_title].total += a.score;
      map[a.course_title].count += 1;
    });
    return Object.entries(map).map(([name, s]) => ({
      name,
      pct: s.maxMarks > 0 ? Math.min(100, (s.total / s.count / s.maxMarks) * 100) : 0,
    }));
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, position: 'relative' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-12%', right: '-6%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow1} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow2} 0%, transparent 70%)`, filter: 'blur(90px)' }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 1152, margin: '0 auto', padding: '32px 16px 96px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero */}
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28,
          border: `1px solid ${t.cardBorder}`, padding: 32, boxShadow: t.shadow,
          background: t.isDark
            ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(10,15,30,0.9) 50%, rgba(14,165,233,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, #ffffff 50%, rgba(14,165,233,0.04) 100%)',
        }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: t.isDark ? 0.03 : 0.04, backgroundImage: `linear-gradient(${t.isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px), linear-gradient(90deg, ${t.isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }} className="md:flex-row md:items-center md:justify-between">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GraduationCap size={14} color="#818cf8" />
                <span style={{ fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#818cf8' }}>{greeting}, Instructor</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 900, color: t.textPri, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 12 }}>
                Dr. {username ?? 'Instructor'}!
              </h1>
              {loading
                ? <div style={{ height: 16, width: 224, borderRadius: 8, background: t.inputBg }} />
                : <p style={{ fontSize: '0.875rem', color: t.textSec }}>
                    Teaching <strong style={{ color: t.textPri }}>{data?.enrolled ?? 0} student{data?.enrolled !== 1 ? 's' : ''}</strong>
                    {' · '}
                    <strong style={{ color: t.textPri }}>{data?.exams_done ?? 0} exam{data?.exams_done !== 1 ? 's' : ''}</strong> created
                    {(data?.total_submissions ?? 0) > 0 && ` · ${data!.total_submissions} submission${data!.total_submissions !== 1 ? 's' : ''} received`}
                  </p>
              }
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <button
                onClick={() => navigate('/courses')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', color: '#fff', background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)', border: 'none', cursor: 'pointer' }}
              >
                <BookOpen size={16} /> My Courses
              </button>
              <button
                onClick={() => navigate('/exams')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', color: t.textSec, background: t.inputBg, border: `1px solid ${t.border}`, cursor: 'pointer' }}
              >
                <PenLine size={16} /> Manage Assessments
              </button>
            </div>
          </div>
        </div>

        {/* Pending tasks alert */}
        {!loading && data?.pending_tasks && data.pending_tasks.length > 0 && (
          <div style={{
            borderRadius: 16, padding: '14px 20px',
            background: t.isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                {data.pending_tasks.length} course{data.pending_tasks.length !== 1 ? 's' : ''} need{data.pending_tasks.length === 1 ? 's' : ''} attention
              </p>
              <p style={{ fontSize: '0.75rem', color: t.textSec }}>
                No assessment created yet for: <strong style={{ color: t.textPri }}>{data.pending_tasks.join(', ')}</strong>
              </p>
            </div>
            <button
              onClick={() => navigate('/exams')}
              style={{ marginLeft: 'auto', flexShrink: 0, padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer' }}
            >
              Create Assessment
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="lg:grid-cols-4">
          <StatCard icon={Users}          label="Total Students"    value={data?.enrolled          ?? 0}            accentColor="#818cf8" loading={loading} />
          <StatCard icon={TrendingUp}     label="Class Avg Score"   value={data?.avg_score         ?? 0} suffix="%" accentColor="#10b981" loading={loading} />
          <StatCard icon={FileText}       label="Exams Created"     value={data?.exams_done        ?? 0}            accentColor="#0ea5e9" loading={loading} />
          <StatCard icon={ClipboardCheck} label="Total Submissions" value={data?.total_submissions ?? 0}            accentColor="#f59e0b" loading={loading} />
        </div>

        {/* Bottom grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="lg:grid-cols-5">

          {/* Recent Student Submissions */}
          <div style={panel} className="lg:col-span-3">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Submissions</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Latest submissions from students</p>
              </div>
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
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>No submissions yet</p>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 4 }}>
                  Student submissions will appear here once Assessments are created and taken
                </p>
              </div>
            ) : (
              <div>
                {data.recent_activity.map((a, i) => {
                  const pct   = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
                  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${t.border}` : 'none', transition: 'background 0.15s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.inputBg}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {/* Student avatar */}
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 900, color }}>
                          {(a.student_name ?? '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.student_name ?? 'Student'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <p style={{ fontSize: '0.6875rem', color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.exam_title} · {a.course_title}
                          </p>
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

          {/* Class Performance by Course */}
          <div style={panel} className="lg:col-span-2">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Class Performance</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Average score by course</p>
              </div>
            </div>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 40, borderRadius: 12, background: t.inputBg }} />)}
              </div>
            ) : !classPerf.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: t.inputBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <BarChart3 size={24} color={t.textTer} />
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textSec }}>No data yet</p>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 4 }}>
                  Class averages appear after students submit assessments
                </p>
              </div>
            ) : (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {classPerf.map((c, i) => <PerfBar key={i} label={c.name} pct={c.pct} />)}
                <button
                  onClick={() => navigate('/exams')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 12, marginTop: 4, fontSize: '0.75rem', fontWeight: 700, color: t.textSec, background: t.inputBg, border: `1px solid ${t.border}`, cursor: 'pointer' }}
                >
                  View Assessments <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Create New Assessments',    icon: PenLine,      color: '#818cf8', path: '/exams'   },
            { label: 'View My Courses',    icon: BookOpen,     color: '#0ea5e9', path: '/courses' },
            { label: 'Student Results',    icon: BarChart3,    color: '#10b981', path: '/exams'   },
          ].map(({ label, icon: Icon, color, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', borderRadius: 16,
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                boxShadow: t.shadow, cursor: 'pointer',
                transition: 'all 0.15s ease', textAlign: 'left',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = color + '44';
                (e.currentTarget as HTMLElement).style.transform   = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = t.cardBorder;
                (e.currentTarget as HTMLElement).style.transform   = 'translateY(0)';
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: t.textPri }}>{label}</span>
              <ChevronRight size={14} color={t.textTer} style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── STUDENT DASHBOARD ─────────────────────────────────────────────────────────

const StudentDashboard: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const navigate     = useNavigate();
  const { username } = getUserData();
  const t            = usePageTheme();

  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const coursePerf = React.useMemo(() => {
    if (!data?.recent_activity?.length) return [];
    const map: Record<string, { total: number; count: number; maxMarks: number }> = {};
    data.recent_activity.forEach(a => {
      if (!map[a.course_title]) map[a.course_title] = { total: 0, count: 0, maxMarks: a.total_marks };
      map[a.course_title].total += a.score;
      map[a.course_title].count += 1;
    });
    return Object.entries(map).map(([name, s]) => ({
      name,
      pct: s.maxMarks > 0 ? Math.min(100, (s.total / s.count / s.maxMarks) * 100) : 0,
    }));
  }, [data]);

  const panel: React.CSSProperties = {
    borderRadius: 20, border: `1px solid ${t.cardBorder}`,
    background: t.cardBg, overflow: 'hidden', boxShadow: t.shadow,
  };
  const panelHead: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: `1px solid ${t.border}`, background: t.inputBg,
  };

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, position: 'relative' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-12%', right: '-6%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow1} 0%, transparent 70%)`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow2} 0%, transparent 70%)`, filter: 'blur(90px)' }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 1152, margin: '0 auto', padding: '32px 16px 96px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero */}
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28,
          border: `1px solid ${t.cardBorder}`, padding: 32, boxShadow: t.shadow,
          background: t.isDark
            ? 'linear-gradient(135deg, rgba(14,165,233,0.07) 0%, rgba(10,15,30,0.9) 50%, rgba(99,102,241,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, #ffffff 50%, rgba(99,102,241,0.04) 100%)',
        }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: t.isDark ? 0.03 : 0.04, backgroundImage: `linear-gradient(${t.isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px), linear-gradient(90deg, ${t.isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }} className="md:flex-row md:items-center md:justify-between">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={14} color={t.cyan} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: t.cyan }}>{greeting}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 900, color: t.textPri, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 12 }}>{username ?? 'Student'}!</h1>
              {loading
                ? <div style={{ height: 16, width: 224, borderRadius: 8, background: t.inputBg }} />
                : <p style={{ fontSize: '0.875rem', color: t.textSec }}>
                    Enrolled in <strong style={{ color: t.textPri }}>{data?.enrolled ?? 0} course{data?.enrolled !== 1 ? 's' : ''}</strong>
                    {(data?.exams_done ?? 0) > 0
                      ? ` · ${data!.exams_done} exam${data!.exams_done !== 1 ? 's' : ''} completed`
                      : ' · Take your first assessment or practice quiz to get started'}
                  </p>
              }
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <button onClick={() => navigate('/courses')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', color: '#fff', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)', border: 'none', cursor: 'pointer' }}>
                <BookOpen size={16} /> Browse Courses
              </button>
              <button onClick={() => navigate('/performance')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', color: t.textSec, background: t.inputBg, border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                <BarChart3 size={16} /> My Results
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="lg:grid-cols-4">
          <StatCard icon={BookOpen}       label="Enrolled"   value={data?.enrolled   ?? 0}            accentColor="#0ea5e9" loading={loading} />
          <StatCard icon={TrendingUp}     label="Avg Score"  value={data?.avg_score  ?? 0} suffix="%" accentColor="#10b981" loading={loading} />
          <StatCard icon={Target}         label="Progress"   value={data?.progress   ?? 0} suffix="%" accentColor="#a78bfa" loading={loading} />
          <StatCard icon={ClipboardCheck} label="Exams Done" value={data?.exams_done ?? 0}            accentColor="#f59e0b" loading={loading} />
        </div>

        {/* Bottom grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="lg:grid-cols-5">

          {/* Recent Activity */}
          <div style={panel} className="lg:col-span-3">
            <div style={panelHead}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textPri }}>Recent Activity</p>
                <p style={{ fontSize: '0.6875rem', color: t.textTer, marginTop: 2 }}>Latest submissions</p>
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
                {data.recent_activity.map((a, i) => {
                  const pct   = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
                  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < data.recent_activity.length - 1 ? `1px solid ${t.border}` : 'none', transition: 'background 0.15s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.inputBg}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.exam_title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <p style={{ fontSize: '0.6875rem', color: t.textTer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.course_title}</p>
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

// ── Main entry ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
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