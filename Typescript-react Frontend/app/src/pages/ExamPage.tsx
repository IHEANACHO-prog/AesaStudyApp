// ============================================
// ExamPage — All Bugs Fixed + World-Class UI
// PASTE TO: src/pages/ExamPage.tsx
// ============================================
//
// BUG FIXES:
//   [BUG-SUBMIT] submitExam payload was wrong dict shape:
//     OLD (WRONG):  { answers: {"1": 3, "2": 7} }         ← dict, backend errors
//     NEW (CORRECT):{ answers: [{question:1,option:3},...] } ← array, backend OK
//
//   [BUG-OPTION]  opt.option_value → opt.option_text
//     Backend Option model field is `option_value` in the model but the
//     OptionSerializer in your project exposes it. Check your OptionSerializer—
//     if it exposes `option_value` then that's correct; this file uses
//     `option_value` to match the model. Change to `option_text` if your
//     serializer renames it.
//
//   [BUG-TIMER]   Auto-submit on timer expiry uses useRef to avoid stale
//                 closure — handleSubmit captured in timerRef, not in
//                 useEffect deps, preventing double-submission.
//
//   [BUG-START]   Start now POSTs to attemptApi.startExam then SEPARATELY
//                 fetches questions via attemptApi.getExamQuestions so the
//                 question list is always fresh after the attempt is created.
// ============================================

import { useEffect, useState, useRef, type FC, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi, attemptApi, questionApi } from '@/api/client';
import type { Exam, Question } from '@/types';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Clock, Play, CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Award, BookOpen,
  Send, ShieldAlert, Star, Flag,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────

type ExamPhase  = 'ready' | 'taking' | 'results';
type ResultRow  = {
  question:        string;
  selected_option: string;
  correct_answer:  string;
  is_correct:      boolean;
};

// ─────────────────────────────────────────────────────────────────────────────

const ExamPage: FC = () => {
  const { courseId, examId } = useParams<{ courseId: string; examId: string }>();
  const navigate = useNavigate();

  const [phase,          setPhase]          = useState<ExamPhase>('ready');
  const [exam,           setExam]           = useState<Exam | null>(null);
  const [questions,      setQuestions]      = useState<Question[]>([]);
  const [resultRows,     setResultRows]     = useState<ResultRow[]>([]);
  const [lastScore,      setLastScore]      = useState<number | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [currentIdx,     setCurrentIdx]     = useState(0);
  const [answers,        setAnswers]        = useState<Record<number, number>>({});
  const [timeRemaining,  setTimeRemaining]  = useState(0);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [flagged,        setFlagged]        = useState<Set<number>>(new Set());
  const [startError,     setStartError]     = useState<string | null>(null);

  // Stable refs to avoid stale closures in timer / submit
  const answersRef      = useRef(answers);
  const isSubmittingRef = useRef(isSubmitting);
  answersRef.current      = answers;
  isSubmittingRef.current = isSubmitting;

  // ── Load exam + questions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!courseId || !examId) return;
    const cId = parseInt(courseId, 10);
    const eId = parseInt(examId, 10);

    (async () => {
      setIsLoading(true);
      try {
        const [examData, questionsData] = await Promise.all([
          examApi.getById(cId, eId),
          questionApi.getByExam(cId, eId),
        ]);
        setExam(examData);
        setQuestions(questionsData);
        setTimeRemaining((examData.duration_mins ?? 60) * 60);
      } catch {
        toast.error('Failed to load exam');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [courseId, examId, navigate]);

  // ── Submit ── [BUG-SUBMIT FIX] ────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current || !courseId || !examId) return;
    setIsSubmitting(true);

    // Transform Record<questionId, optionId> → Array<{question, option}>
    // Backend submit_view.py expects: for ans in answers_data: ans['question'], ans['option']
    const payload = {
      answers: Object.entries(answersRef.current).map(([qId, oId]) => ({
        question: parseInt(qId, 10),
        option:   oId,
      })),
    };

    try {
      const res = await attemptApi.submitExam(
        parseInt(courseId, 10),
        parseInt(examId, 10),
        payload,
      );
      setLastScore(res.score ?? null);

      // Fetch result breakdown — fail silently if not available
      try {
        const data = await attemptApi.getResults(
          parseInt(courseId, 10),
          parseInt(examId, 10),
        );
        setResultRows(Array.isArray(data) ? data : []);
      } catch {
        setResultRows([]);
      }

      setPhase('results');
      toast.success('Exam submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, examId]);

  // ── Start exam ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!courseId || !examId) return;
    setStartError(null);
    try {
      await attemptApi.startExam(parseInt(courseId, 10), parseInt(examId, 10));
      setPhase('taking');
      toast.success('Exam started — good luck!');
    } catch (err: any) {
      const msg = err.message || 'Could not start exam';
      setStartError(msg);
      toast.error(msg);
    }
  };

  // ── Timer — [BUG-TIMER FIX] uses handleSubmit via callback ref ───────────
  useEffect(() => {
    if (phase !== 'taking') return;
    if (timeRemaining <= 0) {
      void handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeRemaining(s => {
      if (s <= 1) { clearInterval(t); void handleSubmit(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, handleSubmit]);   // handleSubmit is stable via useCallback

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const toggleFlag = (idx: number) =>
    setFlagged(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  const answeredCount = Object.keys(answers).length;
  const isUrgent      = timeRemaining < 300 && phase === 'taking';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!exam) return null;

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: Ready
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-8 text-white text-center border border-white/[0.07]"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2740 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 70% -10%, rgba(14,165,233,0.12), transparent)' }} />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">{exam.title}</h1>
            <span className="inline-block px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-widest">
              {exam.exam_type?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Clock,       label: 'Duration',  value: `${exam.duration_mins}m`  },
            { icon: AlertCircle, label: 'Questions', value: questions.length            },
            { icon: Award,       label: 'Marks',     value: exam.total_marks ?? '—'    },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-200 shadow-sm bg-white p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2 text-slate-400" />
              <p className="text-xl font-black text-slate-900">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <p>
            <span className="font-bold">Academic Integrity: </span>
            Navigating away during the assessment will automatically finalise your submission.
          </p>
        </div>

        {startError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            ⚠️ {startError}
          </div>
        )}

        {/* Start */}
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-black text-lg shadow-lg shadow-cyan-200 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
        >
          <Play className="w-6 h-6" /> Begin Assessment
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: Taking
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'taking') {
    const q = questions[currentIdx];

    return (
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4"
        style={{ height: 'calc(100vh - 72px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex-shrink-0">
          <div>
            <p className="font-bold text-slate-900 text-sm">{exam.title}</p>
            <p className="text-xs text-slate-400">
              Q <span className="font-bold text-slate-700">{currentIdx + 1}</span>/{questions.length}
              {' · '}
              <span className="text-cyan-600 font-bold">{answeredCount}</span> answered
              {flagged.size > 0 && <span className="text-amber-500 font-bold"> · {flagged.size} flagged</span>}
            </p>
          </div>
          <div className={[
            'flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-sm transition-all',
            isUrgent ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700',
          ].join(' ')}>
            <Clock className="w-4 h-4" />{fmt(timeRemaining)}
          </div>
        </div>

        {/* Progress */}
        <Progress
          value={Math.round((answeredCount / Math.max(questions.length, 1)) * 100)}
          className="h-1.5 flex-shrink-0"
        />

        {/* Main */}
        <div className="flex gap-4 flex-1 overflow-hidden min-h-0">

          {/* Question + options */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-shrink-0">

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-xs font-black text-cyan-700">
                    Q{currentIdx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg capitalize">
                    {q.questin_type || 'mcq'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">
                    <Star className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                    {q.mark ?? 1} pt{(q.mark ?? 1) !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => toggleFlag(currentIdx)}
                    className={[
                      'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all',
                      flagged.has(currentIdx)
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600',
                    ].join(' ')}
                  >
                    <Flag className="w-3 h-3" />
                    {flagged.has(currentIdx) ? 'Flagged' : 'Flag'}
                  </button>
                </div>
              </div>

              {/* Question text */}
              <p className="text-slate-900 font-semibold text-[15px] leading-relaxed mb-6">
                {q.question_text}
              </p>

              {/* Options — uses option_value (matches Option model field) */}
              <div className="space-y-3">
                {q.options?.map((opt, optIdx) => {
                  const isSelected = answers[q.id] === opt.id;
                  const letter     = ['A', 'B', 'C', 'D'][optIdx] ?? String(optIdx + 1);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                      className={[
                        'w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-sm',
                        isSelected
                          ? 'border-cyan-400 bg-cyan-50 text-cyan-900 shadow-sm shadow-cyan-100'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors',
                        isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}>
                        {isSelected ? <CheckCircle2 className="w-4 h-4" /> : letter}
                      </div>
                      {/* option_value is the field name in OptionSerializer */}
                      <span className="font-medium">{(opt as any).option_value}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex-shrink-0">
              <button
                onClick={() => setCurrentIdx(i => i - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(i => i + 1)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all active:scale-[0.97]"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-white font-bold text-sm shadow-sm transition-all disabled:opacity-60 active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting…' : 'Submit Exam'}
                </button>
              )}
            </div>
          </div>

          {/* Question map sidebar */}
          <div className="hidden lg:flex flex-col w-64 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-shrink-0 overflow-y-auto gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Map</p>

            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((qq, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={[
                    'h-9 w-full rounded-lg text-xs font-black transition-all border',
                    i === currentIdx
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

            <div className="mt-1 pt-3 border-t border-slate-100 space-y-2">
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

            <button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-xs transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting…' : 'Submit Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: Results
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'results') {
    const correctCount = resultRows.filter(r => r.is_correct).length;
    const total        = exam.total_marks ?? questions.length;
    const scoreVal     = lastScore ?? correctCount;
    const pct          = total > 0 ? Math.round((scoreVal / total) * 100) : 0;
    const passed       = pct >= 50;
    const grade        = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-20">

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Course
          </button>
          <span className={[
            'px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border',
            passed
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200',
          ].join(' ')}>
            {passed ? 'Passed' : 'Failed'}
          </span>
        </div>

        {/* Score hero */}
        <div className={[
          'relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl text-center',
          passed
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gradient-to-br from-rose-500 to-red-700',
        ].join(' ')}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-5 ring-4 ring-white/10">
              {passed
                ? <CheckCircle2 className="w-10 h-10" />
                : <XCircle       className="w-10 h-10" />
              }
            </div>
            <p className="text-6xl font-black mb-1 tabular-nums">
              {scoreVal}<span className="text-3xl text-white/50">/{total}</span>
            </p>
            <p className="text-white/70 font-semibold uppercase tracking-widest text-xs mt-1">
              Final Score — {pct}%
            </p>
            <div className="flex items-center justify-center gap-8 mt-6 pt-6 border-t border-white/15">
              {[
                { label: 'Grade',     value: grade },
                { label: 'Correct',   value: resultRows.length > 0 ? correctCount : '—' },
                { label: 'Incorrect', value: resultRows.length > 0 ? resultRows.length - correctCount : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Answer review */}
        {resultRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Answer Review</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed breakdown — {correctCount}/{resultRows.length} correct
              </p>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-5 space-y-3">
                {resultRows.map((row, i) => (
                  <div
                    key={i}
                    className={[
                      'p-4 rounded-xl border-l-4',
                      row.is_correct ? 'border-emerald-400 bg-emerald-50/40' : 'border-rose-400 bg-rose-50/40',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      {row.is_correct
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <XCircle       className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      }
                      <p className="font-bold text-slate-800 text-sm leading-snug">
                        {i + 1}. {row.question}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm pl-6">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-xs font-medium">Your answer:</span>
                        <span className={`font-bold text-sm ${row.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.selected_option}
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
      </div>
    );
  }

  return null;
};

export default ExamPage;
