// ============================================
// AESA — Self Assessment Page (World-Class UI)
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { selfAssessmentApi } from '@/api/client';
import type { SAQuestion, SAResult } from '@/types';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Clock, CheckCircle2, XCircle, Trophy,
  ChevronLeft, ChevronRight, Send,
  BookOpen, Flame, RotateCcw, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const DURATION = 60 * 60; // 60 minutes

// ─────────────────────────────────────────────────────────────────────────────

const SelfAssessmentPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate     = useNavigate();

  const [questions,    setQuestions]    = useState<SAQuestion[]>([]);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState<Record<string, number>>({});
  const [timeLeft,     setTimeLeft]     = useState(DURATION);
  const [result,       setResult]       = useState<SAResult | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flagged,      setFlagged]      = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!courseId) return;
    selfAssessmentApi
      .getQuestions(parseInt(courseId))
      .then(setQuestions)
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setIsLoading(false));
  }, [courseId]);

  const handleSubmit = useCallback(async () => {
    if (!courseId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await selfAssessmentApi.submit(parseInt(courseId), answers);
      setResult(res);
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, answers, isSubmitting]);

  // Timer
  useEffect(() => {
    if (result || isLoading || questions.length === 0) return;
    if (timeLeft <= 0) { void handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result, isLoading, questions.length, handleSubmit]);

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQ        = questions.length;
  const progressPct   = totalQ > 0 ? Math.round(((current + 1) / totalQ) * 100) : 0;
  const isUrgent      = timeLeft < 300;

  const toggleFlag = (idx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
    setCurrent(0);
    setTimeLeft(DURATION);
    setFlagged(new Set());
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-slate-300" />
        </div>
        <p className="font-bold text-slate-700 text-lg">No questions available</p>
        <p className="text-slate-400 text-sm max-w-xs">
          Self-assessment questions haven't been added to this course yet.
        </p>
        <button
          onClick={() => navigate(-1)}
          className={'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm transition-all mt-2'}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </button>
      </div>
    );
  }

  // ── Results screen ──
  if (result) {
    const pct      = result.percentage;
    const passed   = pct >= 50;
    const grade    = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
    const emoji    = pct >= 80 ? '🎉' : pct >= 60 ? '💪' : '📚';
    const message  = pct >= 80 ? 'Outstanding performance!'
                   : pct >= 60 ? 'Good job — keep it up!'
                   : pct >= 50 ? 'You passed — but there\'s room to improve.'
                   :             'Keep studying and try again!';

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Result hero */}
        <div className={'relative overflow-hidden rounded-3xl p-8 text-center shadow-2xl ' + (passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-700 to-slate-900')}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl mb-3">{emoji}</div>
            <div className="text-7xl font-black text-white mb-1">{pct}%</div>
            <p className="text-white/80 text-lg font-medium">{message}</p>
            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Score</p>
                <p className="text-white font-black text-xl">{result.score}/{result.total}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Grade</p>
                <p className="text-white font-black text-xl">{grade}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Status</p>
                <p className="text-white font-black text-xl">{passed ? 'Passed' : 'Failed'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">Score Breakdown</span>
            <span className="text-slate-400">{result.score} correct out of {result.total}</span>
          </div>
          <div className="flex gap-3 items-center">
            <Progress value={pct} className="h-3 flex-1" />
            <span className="font-black text-slate-900 w-12 text-right">{pct}%</span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Correct',   value: result.score,               color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Incorrect', value: result.total - result.score, color: 'bg-red-50 text-red-700' },
              { label: 'Total',     value: result.total,               color: 'bg-slate-50 text-slate-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs font-bold uppercase tracking-widest mt-0.5 opacity-70">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className={'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all'}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </button>
          <button
            onClick={retry}
            className={'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all'}
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz screen ──
  const q = questions[current];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-16 space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            <span className="font-black text-slate-900">{current + 1}</span>
            <span className="text-slate-300 mx-1">/</span>
            <span>{totalQ}</span>
          </div>
          <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
            {answeredCount} answered
          </Badge>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-sm transition-colors ${isUrgent ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="space-y-1.5">
        <Progress value={progressPct} className="h-2" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{answeredCount} of {totalQ} answered</span>
          <span>{totalQ - answeredCount} remaining</span>
        </div>
      </div>

      {/* ── Question card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Question header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={'w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-xs font-black text-cyan-700'}>
              Q{current + 1}
            </div>
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 capitalize">
              {q.question_type === 'mcq' ? 'Multiple Choice' : 'True / False'}
            </Badge>
          </div>
          <button
            onClick={() => toggleFlag(current)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${flagged.has(current) ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}
          >
            {flagged.has(current) ? '⚑ Flagged' : '⚐ Flag'}
          </button>
        </div>

        {/* Question text */}
        <div className="px-6 py-5">
          <p className="text-slate-900 font-semibold text-base leading-relaxed">{q.question_text}</p>
        </div>

        {/* Options */}
        <div className="px-6 pb-6 space-y-2.5">
          {q.options.map((opt, optIdx) => {
            const isSelected = answers[q.id] === opt.id;
            const letter     = ['A','B','C','D'][optIdx] || (optIdx + 1).toString();
            return (
              <button
                key={opt.id}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                className={`
                  w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 text-sm
                  ${isSelected
                    ? 'border-cyan-400 bg-cyan-50 text-cyan-900 shadow-sm shadow-cyan-100'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }
                `}
              >
                <div className={`
                  w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors
                  ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}
                `}>
                  {isSelected ? <CheckCircle2 className="w-4 h-4" /> : letter}
                </div>
                <span className="font-medium">{opt.option_text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
          className={'flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed'}
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Question dots (mini) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xs">
          {questions.slice(0, 20).map((qq, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`
                w-6 h-6 rounded-md text-[10px] font-black transition-all flex-shrink-0
                ${i === current
                  ? 'bg-cyan-500 text-white'
                  : answers[qq.id]
                    ? 'bg-emerald-100 text-emerald-700'
                    : flagged.has(i)
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }
              `}
            >
              {i + 1}
            </button>
          ))}
          {totalQ > 20 && (
            <span className="text-xs text-slate-400 font-bold">+{totalQ - 20}</span>
          )}
        </div>

        {current < totalQ - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className={'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all'}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={'flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm transition-all shadow-sm shadow-emerald-200 disabled:opacity-60'}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        )}
      </div>

      {/* ── Submit early warning ── */}
      {answeredCount < totalQ && (
        <p className="text-center text-xs text-slate-400">
          <span className="font-bold text-amber-600">{totalQ - answeredCount}</span> question{totalQ - answeredCount !== 1 ? 's' : ''} unanswered.
          {current === totalQ - 1 && ' You can still go back and answer them.'}
        </p>
      )}
    </div>
  );
};

export default SelfAssessmentPage;