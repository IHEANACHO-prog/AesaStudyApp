// ============================================
// AESA — Self Assessment Page (Refined)
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { selfAssessmentApi } from '@/api/client';
import type { SAQuestion, SAResult } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, XCircle, Trophy, ChevronLeft, ChevronRight, Send, BookOpen, RotateCcw, ArrowLeft, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const DURATION = 60 * 60;

const SelfAssessmentPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<SAQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isStudyMode, setIsStudyMode] = useState(true); // Feature 1: Study Mode Toggle
  const [revealed, setRevealed] = useState<Record<string, boolean>>({}); // Track feedback visibility
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [result, setResult] = useState<SAResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  const fetchQuestions = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const data = await selfAssessmentApi.getQuestions(parseInt(courseId));
      setQuestions(data);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleAnswer = (qId: string, optId: number) => {
    if (isStudyMode && revealed[qId]) return; // Prevent changing in study mode
    setAnswers(prev => ({ ...prev, [qId]: optId }));
    if (isStudyMode) setRevealed(prev => ({ ...prev, [qId]: true }));
  };

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

  // Timer logic... (keep existing)
  useEffect(() => {
    if (result || isLoading || questions.length === 0 || isStudyMode) return;
    if (timeLeft <= 0) { void handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result, isLoading, questions.length, handleSubmit, isStudyMode]);

  const q = questions[current];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-16 space-y-5">
      {/* Feature 2: Study Mode Toggle UI */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <span className="font-bold text-sm text-slate-600">Learning Mode</span>
        <button 
          onClick={() => setIsStudyMode(!isStudyMode)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold ${isStudyMode ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100'}`}
        >
          {isStudyMode ? 'Instant Feedback ON' : 'Exam Mode (No Feedback)'}
        </button>
      </div>

      {/* Existing UI for Progress/Timer... */}
      
      {q && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="font-semibold text-lg">{q.question_text}</p>
          {q.options.map((opt) => {
            const isSelected = answers[q.id] === opt.id;
            const isCorrect = opt.is_correct;
            // Highlight styling logic
            let borderStyle = isSelected ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200';
            if (isStudyMode && revealed[q.id]) {
              borderStyle = isCorrect ? 'border-emerald-500 bg-emerald-50' : (isSelected ? 'border-red-500 bg-red-50' : 'border-slate-200');
            }

            return (
              <button key={opt.id} onClick={() => handleAnswer(q.id, opt.id)} className={`w-full p-4 rounded-xl border ${borderStyle} flex justify-between`}>
                <span>{opt.option_text}</span>
                {isStudyMode && revealed[q.id] && isCorrect && <CheckCircle2 className="text-emerald-600" />}
                {isStudyMode && revealed[q.id] && isSelected && !isCorrect && <XCircle className="text-red-600" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Feature 3: Explanation Section */}
      {isStudyMode && revealed[q?.id] && (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3 text-amber-800 text-sm">
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          <p>{q.explanation || 'Review your course notes for this topic to understand why this answer is selected.'}</p>
        </div>
      )}

      {/* Navigation buttons... (keep existing) */}
    </div>
  );
};

export default SelfAssessmentPage;