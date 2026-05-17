// ============================================
// AESA — Performance Analytics (Fixed)
// PASTE TO: src/pages/PerformancePage.tsx
// ============================================
//
// FIX: attemptApi.getAttemptsByCourse did not exist in client.ts — added it.
//      PerformancePage now builds attempt history by fetching results per exam
//      for each enrolled course. Falls back gracefully if any call fails.
//
// Also fixed: score percentage calculation used raw score as pct — now
// correctly divides score/total_marks * 100.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { analyticsApi, enrollmentApi, examApi, attemptApi } from '@/api/client';
import type { Performance, Enrollment } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

import {
  TrendingUp, Award, BookOpen, Target,
  AlertCircle, Trophy, Flame, ArrowUpRight,
  Star, History, CheckCircle2, XCircle,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor  = (s: number) => s >= 70 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg     = (s: number) =>
  s >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
: s >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
:           'bg-red-50 text-red-700 border-red-200';
const scoreLabel  = (s: number) => s >= 70 ? 'Excellent' : s >= 50 ? 'Passing' : 'Needs Work';
const fmt         = (n: number) => n.toFixed(1);
const fmtDate     = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Attempt row shape ─────────────────────────────────────────────────────────
interface AttemptRow {
  id:          number;
  courseCode:  string;
  courseTitle: string;
  examTitle:   string;
  score:       number;
  total_marks: number;
  pct:         number;
  submitted_at: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PerformancePage: React.FC = () => {
  const { hasRole } = useAuth();
  const [data,           setData]           = useState<Performance[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<AttemptRow[]>([]);
  const [isLoading,      setLoading]        = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Aggregated performance per course
  useEffect(() => {
    if (!hasRole('student')) return;
    analyticsApi.getPerformance()
      .then(setData)
      .catch(e => console.error('Performance load error:', e))
      .finally(() => setLoading(false));
  }, [hasRole]);

  // FIX: Build attempt history by fetching exam results for every enrolled course.
  // Works with existing API: enrollments → exams per course → results per exam.
  // Falls back silently for any individual failure.
  useEffect(() => {
    if (!hasRole('student')) return;
    const load = async () => {
      setHistoryLoading(true);
      try {
        const enrollments: Enrollment[] = await enrollmentApi.getMyEnrollments();

        const allRows: AttemptRow[] = [];

        await Promise.allSettled(
          enrollments.map(async (enr) => {
            try {
              // Get all exams for this course
              const exams = await examApi.getByCourse(enr.course.id);
              if (!Array.isArray(exams) || exams.length === 0) return;

              // Get results for each exam
              await Promise.allSettled(
                exams.map(async (exam) => {
                  try {
                    const results = await attemptApi.getResults(enr.course.id, exam.id);
                    if (!Array.isArray(results)) return;
                    results.forEach((r: any) => {
                      if (!r.is_submitted && r.submitted_at == null) return; // skip in-progress
                      const score      = r.score ?? 0;
                      const totalMarks = r.total_marks ?? exam.total_marks ?? 100;
                      const pct        = totalMarks > 0 ? Math.min(100, (score / totalMarks) * 100) : 0;
                      allRows.push({
                        id:           r.id,
                        courseCode:   enr.course.code,
                        courseTitle:  enr.course.title,
                        examTitle:    exam.title,
                        score,
                        total_marks:  totalMarks,
                        pct:          Math.round(pct),
                        submitted_at: r.submitted_at ?? r.start_time ?? '',
                      });
                    });
                  } catch { /* skip failed exam */ }
                })
              );
            } catch { /* skip failed course */ }
          })
        );

        // Sort newest first
        allRows.sort((a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        );
        setAttemptHistory(allRows);
      } catch (e) {
        console.error('History load error:', e);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [hasRole]);

  const totalCourses  = data.length;
  const overallAvg    = totalCourses > 0 ? data.reduce((s, p) => s + p.average_score, 0) / totalCourses : 0;
  const personalBest  = totalCourses > 0 ? Math.max(...data.map(p => p.best_score)) : 0;
  const totalAttempts = data.reduce((s, p) => s + p.total_attempts, 0);

  const chartData = data.map(p => ({
    name:    p.course.code,
    average: Math.round(p.average_score),
    best:    Math.round(p.best_score),
  }));

  if (!hasRole('student')) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="font-bold text-slate-700">Students only</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 pb-16">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performance Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Track your academic progress across all courses</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Courses Attempted', value: isLoading ? null : totalCourses,            icon: BookOpen,   accent: 'cyan'    as Accent },
          { label: 'Overall Average',   value: isLoading ? null : `${fmt(overallAvg)}%`,   icon: TrendingUp, accent: 'emerald' as Accent },
          { label: 'Personal Best',     value: isLoading ? null : `${fmt(personalBest)}%`, icon: Trophy,     accent: 'amber'   as Accent },
          { label: 'Total Attempts',    value: isLoading ? null : totalAttempts,            icon: Target,     accent: 'violet'  as Accent },
        ].map(({ label, value, icon: Icon, accent }) => (
          <MetricCard key={label} label={label} value={value} Icon={Icon} accent={accent} />
        ))}
      </div>

      {/* Charts */}
      {(isLoading || data.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-slate-900">Average vs Best</h2>
                <p className="text-xs text-slate-400 mt-0.5">Score comparison per course</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />Average</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Best</span>
              </div>
            </div>
            {isLoading ? <Skeleton className="h-56 w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0/0.15)', fontSize: 12 }} formatter={(v: number, name: string) => [`${v}%`, name === 'average' ? 'Average' : 'Best']} />
                  <Bar dataKey="average" fill="#06b6d4" radius={[6,6,0,0]} maxBarSize={32} />
                  <Bar dataKey="best"    fill="#10b981" radius={[6,6,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="font-bold text-slate-900">Score Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Performance trajectory across courses</p>
            </div>
            {isLoading ? <Skeleton className="h-56 w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0/0.15)', fontSize: 12 }} formatter={(v: number, name: string) => [`${v}%`, name === 'average' ? 'Average' : 'Best']} />
                  <Line type="monotone" dataKey="average" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="best"    stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Course breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Course Breakdown</h2>
          <p className="text-xs text-slate-400 mt-0.5">Detailed performance per course</p>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
            <TrendingUp className="w-14 h-14" />
            <div className="text-center">
              <p className="font-bold text-slate-500 text-lg">No data yet</p>
              <p className="text-sm text-slate-400 mt-1">Complete exams to see your analytics here.</p>
            </div>
            <Link to="/courses" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm transition-all mt-2">
              Browse Courses <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.map((p, idx) => (
              <div key={p.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex-shrink-0 w-8 text-center">
                  {idx === 0 ? <Flame className="w-5 h-5 text-amber-500 mx-auto" /> : <span className="text-sm font-black text-slate-300">#{idx+1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{p.course.code}</p>
                  <p className="text-xs text-slate-400 truncate">{p.course.title}</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-48">
                  <Progress value={p.average_score} className="h-2 flex-1" />
                  <span className="text-sm font-bold text-slate-700 w-12 text-right">{fmt(p.average_score)}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm w-24 justify-end">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-slate-700">{fmt(p.best_score)}%</span>
                </div>
                <div className="text-sm text-slate-500 w-20 text-right">
                  <span className="font-bold text-slate-700">{p.total_attempts}</span> tries
                </div>
                <div className="text-xs text-slate-400 w-28 text-right hidden lg:block">{fmtDate(p.last_attempt_date)}</div>
                <Badge className={`border text-xs font-bold px-2.5 py-0.5 ${scoreBg(p.average_score)}`}>{scoreLabel(p.average_score)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attempt History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <History className="w-5 h-5 text-cyan-500" />
          <div>
            <h2 className="font-bold text-slate-900">Attempt History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Every exam attempt, newest first</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : attemptHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <History className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-bold text-slate-500">No attempts yet</p>
            <p className="text-sm text-slate-400 mt-1">Your exam history will appear here after you complete your first exam.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {attemptHistory.map((attempt, idx) => (
              <div key={`${attempt.id}-${idx}`} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                <span className="text-xs font-black text-slate-300 w-6 text-center">{idx+1}</span>
                {attempt.pct >= 50
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle     className="w-4 h-4 text-red-400    flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{attempt.courseCode} — {attempt.examTitle}</p>
                  <p className="text-xs text-slate-400 truncate">{attempt.courseTitle}</p>
                </div>
                <div className="flex items-center gap-2 w-32 justify-end">
                  <Progress value={attempt.pct} className="h-1.5 w-16" />
                  <span className="text-sm font-black w-10 text-right" style={{ color: scoreColor(attempt.pct) }}>
                    {attempt.pct}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 w-36 text-right hidden sm:block">
                  {attempt.submitted_at ? fmtDateTime(attempt.submitted_at) : '—'}
                </span>
                <Badge className={`border text-[10px] font-bold px-2 py-0.5 ${scoreBg(attempt.pct)}`}>
                  {scoreLabel(attempt.pct)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Motivational footer */}
      {!isLoading && data.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-cyan-400/10 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-black text-lg">
                {overallAvg >= 70 ? '🎉 Outstanding performance!' : overallAvg >= 50 ? '💪 You\'re on the right track!' : '📚 Keep pushing — every attempt counts!'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Your overall average is <span className="font-black" style={{ color: scoreColor(overallAvg) }}>{fmt(overallAvg)}%</span> across {totalCourses} course{totalCourses !== 1 ? 's' : ''}.
              </p>
            </div>
            <Link to="/courses" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-sm transition-all">
              <BookOpen className="w-4 h-4" /> Study More
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Metric card ───────────────────────────────────────────────────────────────
type Accent = 'cyan' | 'emerald' | 'amber' | 'violet';
const accentMap: Record<Accent, { bg: string; text: string; ring: string }> = {
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    ring: 'ring-cyan-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-100' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  ring: 'ring-violet-100' },
};

const MetricCard: React.FC<{ label: string; value: string | number | null; Icon: React.ElementType; accent: Accent }> = ({ label, value, Icon, accent }) => {
  const { bg, text, ring } = accentMap[accent];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        {value === null
          ? <Skeleton className="h-8 w-16 mt-1.5 rounded-lg" />
          : <p className="text-3xl font-black text-slate-900 tracking-tighter mt-0.5">{value}</p>
        }
      </div>
      <div className={`p-3 rounded-2xl ring-4 flex-shrink-0 ${bg} ${text} ${ring}`}>
        <Icon className="w-5 h-5 stroke-[2.5]" />
      </div>
    </div>
  );
};

export default PerformancePage;