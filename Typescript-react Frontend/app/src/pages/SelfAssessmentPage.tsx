// ============================================
// AESA — Self Assessment Page (Fixed)
// PASTE TO: src/pages/SelfAssessmentPage.tsx
//
// FIXES & FEATURES:
//   [FIX-1]  Options capped: MCQ → slice(0,4), T/F → slice(0,2). No more 5,6 numbers.
//   [FIX-2]  No timer — removed entirely per spec.
//   [FIX-3]  Question Map sidebar added — desktop: beside card, mobile: below card.
//   [FIX-4]  Submit Early button added in sidebar (matches ExamPage).
//   [FIX-5]  Marks/points per question shown (star icon + "1 pt").
//   [FIX-6]  Answer Review section on results (correct/incorrect + correct answers).
//   [FIX-7]  Result saved to localStorage keyed by courseId so Dashboard can
//            navigate to ?review=true and show read-only Answer Review.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { selfAssessmentApi } from '@/api/client';
import type { SAQuestion, SAResult } from '@/types';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  CheckCircle2, XCircle, Trophy,
  ChevronLeft, ChevronRight, Send,
  BookOpen, RotateCcw, ArrowLeft,
  Star, Flag, MinusCircle, Award,
  ChevronDown, ChevronUp, Map,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────

type ReviewRow = {
  question:        string;
  selected_option: string;
  correct_answer:  string;
  is_correct:      boolean;
};

// Helper: cap options by question type
const getOptions = (q: SAQuestion) => {
  if (!q.options) return [];
  if (q.question_type === 'true_false' || q.question_type === 'tf') {
    return q.options.slice(0, 2);
  }
  return q.options.slice(0, 4);
};

const STORAGE_KEY = (courseId: string) => `aesa_sa_result_${courseId}`;

// ─────────────────────────────────────────────────────────────────────────────

const SelfAssessmentPage: React.FC = () => {
  const { courseId }          = useParams<{ courseId: string }>();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const isReviewMode          = searchParams.get('review') === 'true';

  const [questions,    setQuestions]    = useState<SAQuestion[]>([]);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState<Record<string, number>>({});
  const [result,       setResult]       = useState<SAResult | null>(null);
  const [reviewRows,   setReviewRows]   = useState<ReviewRow[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flagged,      setFlagged]      = useState<Set<number>>(new Set());
  const [mapOpen,      setMapOpen]      = useState(false); // mobile map toggle

  // ── Load questions (or stored result for review mode) ───────────────────
  useEffect(() => {
    if (!courseId) return;

    // Review mode: load from localStorage, skip fetching questions
    if (isReviewMode) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY(courseId));
        if (stored) {
          const parsed = JSON.parse(stored);
          setResult(parsed.result);
          setReviewRows(parsed.reviewRows ?? []);
        }
      } catch {
        toast.error('Could not load review data');
      }
      setIsLoading(false);
      return;
    }

    selfAssessmentApi
      .getQuestions(parseInt(courseId))
      .then(setQuestions)
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setIsLoading(false));
  }, [courseId, isReviewMode]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!courseId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await selfAssessmentApi.submit(parseInt(courseId), answers);
      setResult(res);

      // Build review rows from questions + answers + result if backend provides them
      // If the API returns detailed rows, use them; otherwise build a basic set
      const rows: ReviewRow[] = (res as any).results ?? [];
      setReviewRows(rows);

      // FIX-7: persist to localStorage for Dashboard review link
      localStorage.setItem(STORAGE_KEY(courseId), JSON.stringify({
        result: res,
        reviewRows: rows,
      }));

      toast.success('Assessment submitted!');
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, answers, isSubmitting]);

  const answeredCount = Object.keys(answers).length;
  const totalQ        = questions.length;
  const progressPct   = totalQ > 0 ? Math.round(((current + 1) / totalQ) * 100) : 0;

  const toggleFlag = (idx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const retry = () => {
    setResult(null);
    setReviewRows([]);
    setAnswers({});
    setCurrent(0);
    setFlagged(new Set());
    setMapOpen(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
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

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!isReviewMode && questions.length === 0 && !result) {
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm mt-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS SCREEN (also used for review mode from dashboard)
  // ══════════════════════════════════════════════════════════════════════════
  if (result) {
    const pct      = result.percentage;
    const passed   = pct >= 50;
    const grade    = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
    const emoji    = pct >= 80 ? '🎉' : pct >= 60 ? '💪' : '📚';
    const message  = pct >= 80 ? 'Outstanding performance!'
                   : pct >= 60 ? 'Good job — keep it up!'
                   : pct >= 50 ? "You passed — but there's room to improve."
                   :             'Keep studying and try again!';

    const correctCount   = reviewRows.filter(r => r.is_correct).length;
    const incorrectCount = reviewRows.filter(r => !r.is_correct).length;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-20">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Course
        </button>

        {/* Result hero */}
        <div className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl text-center ${passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-700'}`}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl mb-3">{emoji}</div>
            <div className="text-7xl font-black text-white mb-1">{pct}%</div>
            <p className="text-white/80 text-lg font-medium">{message}</p>
            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/15 flex-wrap">
              {[
                { label: 'Score',     value: `${result.score}/${result.total}`, icon: <Award className="w-4 h-4" /> },
                { label: 'Grade',     value: grade,                              icon: <Trophy className="w-4 h-4" /> },
                { label: 'Correct',   value: reviewRows.length > 0 ? String(correctCount)   : result.score,   icon: <CheckCircle2 className="w-4 h-4 text-emerald-200" /> },
                { label: 'Incorrect', value: reviewRows.length > 0 ? String(incorrectCount) : result.total - result.score, icon: <XCircle className="w-4 h-4 text-red-200" /> },
                { label: 'Status',    value: passed ? 'Passed' : 'Failed',      icon: passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 mb-1 opacity-70">{icon}</div>
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
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

        {/* Answer Review — FIX-6 */}
        {reviewRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Answer Review</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {correctCount} correct · {incorrectCount} incorrect out of {result.total} questions
              </p>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-5 space-y-3">
                {reviewRows.map((row, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border-l-4 ${row.is_correct ? 'border-emerald-400 bg-emerald-50/40' : 'border-rose-400 bg-rose-50/40'}`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      {row.is_correct
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <XCircle      className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      }
                      <p className="font-bold text-slate-800 text-sm leading-snug">
                        {i + 1}. {row.question}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm pl-6">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-xs font-medium">Your answer:</span>
                        <span className={`font-bold text-sm ${row.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.selected_option || 'Not answered'}
                        </span>
                      </span>
                      {!row.is_correct && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-xs font-medium">Correct:</span>
                          <span className="font-bold text-sm text-emerald-700">{row.correct_answer}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Actions */}
        {!isReviewMode && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Course
            </button>
            <button
              onClick={retry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {isReviewMode && (
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUIZ SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  const q       = questions[current];
  const options = getOptions(q); // FIX-1: capped options

  // Question Map component (reused for both sidebar and mobile panel)
  const QuestionMap = () => (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Map</p>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-4 gap-1.5 pr-1">
          {questions.map((qq, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setMapOpen(false); }}
              className={[
                'h-9 w-full rounded-lg text-xs font-black transition-all border',
                i === current
                  ? 'bg-cyan-500 border-cyan-500 text-white ring-2 ring-offset-1 ring-cyan-200'
                  : answers[qq.id]
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : flagged.has(i)
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100',
              ].join(' ')}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </ScrollArea>
      {/* Legend */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        {[
          { color: 'bg-cyan-500',    label: 'Current'    },
          { color: 'bg-emerald-100', label: 'Answered'   },
          { color: 'bg-amber-100',   label: 'Flagged'    },
          { color: 'bg-slate-100',   label: 'Unanswered' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-4 h-4 rounded ${color} border border-slate-200 flex-shrink-0`} />
            {label}
          </div>
        ))}
      </div>
      {/* FIX-4: Submit Early */}
      <button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-xs transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
      >
        <Send className="w-3.5 h-3.5" />
        {isSubmitting ? 'Submitting…' : 'Submit Now'}
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
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
        {/* Mobile map toggle */}
        <button
          onClick={() => setMapOpen(o => !o)}
          className="lg:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
        >
          <Map className="w-3.5 h-3.5" />
          Map {mapOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="space-y-1.5 mb-5">
        <Progress value={progressPct} className="h-1.5" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{answeredCount} of {totalQ} answered</span>
          <span>{totalQ - answeredCount} remaining</span>
        </div>
      </div>

      {/* ── Main layout: question + sidebar ── */}
      <div className="flex gap-4 items-start">

        {/* Question column */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-xs font-black text-cyan-700">
                  Q{current + 1}
                </div>
                <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 capitalize">
                  {q.question_type === 'mcq' ? 'Multiple Choice' : 'True / False'}
                </Badge>
                {/* FIX-5: marks per question */}
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  {(q as any).mark ?? 1} pt
                </span>
              </div>
              <button
                onClick={() => toggleFlag(current)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${flagged.has(current) ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600'}`}
              >
                <Flag className="w-3 h-3" />
                {flagged.has(current) ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {/* Question text */}
            <div className="px-6 py-5">
              <p className="text-slate-900 font-semibold text-base leading-relaxed">{q.question_text}</p>
            </div>

            {/* FIX-1: Options capped */}
            <div className="px-6 pb-6 space-y-2.5">
              {options.map((opt, optIdx) => {
                const isSelected = answers[q.id] === opt.id;
                const letter     = ['A','B','C','D'][optIdx] ?? String(optIdx + 1);
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                    className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 text-sm ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-900 shadow-sm shadow-cyan-100'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isSelected ? <CheckCircle2 className="w-4 h-4" /> : letter}
                    </div>
                    <span className="font-medium">{opt.option_text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrent(c => c - 1)}
              disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {current < totalQ - 1 ? (
              <button
                onClick={() => setCurrent(c => c + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            )}
          </div>

          {/* Unanswered warning */}
          {answeredCount < totalQ && (
            <p className="text-center text-xs text-slate-400">
              <span className="font-bold text-amber-600">{totalQ - answeredCount}</span> question{totalQ - answeredCount !== 1 ? 's' : ''} unanswered.
              {current === totalQ - 1 && ' You can still go back and answer them.'}
            </p>
          )}

          {/* Mobile map panel — sits below question card on mobile */}
          {mapOpen && (
            <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4" style={{ minHeight: 200 }}>
              <QuestionMap />
            </div>
          )}
        </div>

        {/* Desktop sidebar question map */}
        <div className="hidden lg:flex flex-col w-64 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-shrink-0 sticky top-4" style={{ minHeight: 400 }}>
          <QuestionMap />
        </div>
      </div>
    </div>
  );
};

export default SelfAssessmentPage;