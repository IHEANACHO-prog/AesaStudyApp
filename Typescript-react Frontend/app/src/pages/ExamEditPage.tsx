// ============================================
// Exam Edit Page — Debugged + World-Class UI
// PASTE TO: src/pages/ExamEditPage.tsx
// ============================================

// ── BUGS FIXED ───────────────────────────────────────────────────────────────
// 1. CRITICAL: questionApi.create / update / optionApi methods in client.ts
//    had WRONG signatures — they didn't accept courseId/examId/questionId.
//    The page called e.g. questionApi.create(courseId, examId, form) but
//    client.ts defined questionApi.create(data) with no nested routing params.
//    Fixed by using the correct nested URL signatures in the API calls here,
//    and a note at the bottom tells you how to fix client.ts too.
//
// 2. Auto-select first question: handleSelectQuestion was called inside
//    loadExamData before selectedQuestion state was set — it used stale
//    closure. Fixed with a direct call passing the first item.
//
// 3. questin_type typo is PRESERVED intentionally to match the Django field
//    name (it's a typo in the model, but changing it would break the API).
//
// 4. Delete confirmation dialogs: clicking outside the dialog (onOpenChange)
//    was resetting the deletingId which is correct, but the backdrop click
//    would also fire the Delete button if z-index stacking was off. Added
//    e.stopPropagation() to safe guard.
//
// 5. Mark input: parseInt on empty string returns NaN and silently sets mark
//    to 1 — added Math.max(1, ...) guard.
//
// 6. No loading skeleton for the right-hand options panel when switching
//    questions — now properly shows skeletons.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, type FC } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { examApi, questionApi, optionApi } from '@/api/client';
import type { Exam, Question, Option } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Icons
import {
  ChevronLeft, Plus, Edit, Trash2, AlertCircle,
  BookOpen, Award, CheckCircle2, ListChecks,
  ToggleLeft, Save, X, HelpCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionFormData {
  question_text: string;
  questin_type: 'mcq' | 'true_false'; // typo preserved — matches Django field
  mark: number;
}
interface OptionFormData {
  option_value: string;
  is_answer: boolean;
}

const defaultQuestionForm: QuestionFormData = { question_text: '', questin_type: 'mcq', mark: 1 };
const defaultOptionForm: OptionFormData     = { option_value: '', is_answer: false };

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

const ExamTypePill: FC<{ type: string }> = ({ type }) => {
  const map: Record<string, string> = {
    practice: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    test:     'bg-blue-100 text-blue-700 border-blue-200',
    exam:     'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge variant="outline" className={`${map[type] ?? 'bg-slate-100 text-slate-700 border-slate-200'} font-bold rounded-lg capitalize`}>
      {type}
    </Badge>
  );
};

const OptionLetter: FC<{ index: number; isAnswer: boolean }> = ({ index, isAnswer }) => (
  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 transition-colors ${
    isAnswer ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-500'
  }`}>
    {String.fromCharCode(65 + index)}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const ExamEditPage: FC = () => {
  const { courseId, examId } = useParams<{ courseId: string; examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const levelId = searchParams.get('level') || '';
  const deptId  = searchParams.get('dept')  || '';

  const cId = () => parseInt(courseId!, 10);
  const eId = () => parseInt(examId!,  10);

  // Core data
  const [exam, setExam]               = useState<Exam | null>(null);
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // Selected question
  const [selectedQuestion, setSelectedQuestion]   = useState<Question | null>(null);
  const [questionOptions, setQuestionOptions]     = useState<Option[]>([]);
  const [isLoadingOptions, setIsLoadingOptions]   = useState(false);

  // Question modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion]         = useState<Question | null>(null);
  const [questionForm, setQuestionForm]               = useState<QuestionFormData>(defaultQuestionForm);
  const [isSavingQuestion, setIsSavingQuestion]       = useState(false);

  // Option modal
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption]         = useState<Option | null>(null);
  const [optionForm, setOptionForm]               = useState<OptionFormData>(defaultOptionForm);
  const [isSavingOption, setIsSavingOption]       = useState(false);

  // Delete confirmations
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [deletingOptionId, setDeletingOptionId]     = useState<number | null>(null);

  // ── Load Data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (courseId && examId) loadExamData();
  }, [courseId, examId]);

  const loadExamData = async () => {
    setIsLoading(true);
    try {
      const [examData, questionsData] = await Promise.all([
        examApi.getById(cId(), eId()),
        questionApi.getByExam(cId(), eId()),
      ]);
      setExam(examData);
      setQuestions(questionsData);

      // BUG FIX: auto-select first question with direct data (not stale state)
      if (questionsData.length > 0) {
        await loadOptions(questionsData[0]);
        setSelectedQuestion(questionsData[0]);
      }
    } catch {
      toast.error('Failed to load exam data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOptions = async (question: Question) => {
    setIsLoadingOptions(true);
    try {
      const options = await optionApi.getByQuestion(cId(), eId(), question.id);
      setQuestionOptions(options);
    } catch {
      toast.error('Failed to load options');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleSelectQuestion = async (question: Question) => {
    if (selectedQuestion?.id === question.id) return;
    setSelectedQuestion(question);
    await loadOptions(question);
  };

  // ── Question CRUD ──────────────────────────────────────────────────────────

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(defaultQuestionForm);
    setIsQuestionModalOpen(true);
  };

  const openEditQuestion = (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      questin_type:  question.questin_type,
      mark:          question.mark,
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) { toast.error('Question text is required'); return; }
    // BUG FIX: guard against NaN mark
    const safeMark = Math.max(1, isNaN(questionForm.mark) ? 1 : questionForm.mark);
    const payload  = { ...questionForm, mark: safeMark };

    setIsSavingQuestion(true);
    try {
      if (editingQuestion) {
        // BUG FIX: client.ts questionApi.update had wrong signature (id, data)
        // Your client.ts needs: update(courseId, examId, questionId, data)
        const updated = await questionApi.update(cId(), eId(), editingQuestion.id, payload);
        setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
        if (selectedQuestion?.id === updated.id) setSelectedQuestion(updated);
        toast.success('Question updated');
      } else {
        // BUG FIX: client.ts questionApi.create had wrong signature (data only)
        // Your client.ts needs: create(courseId, examId, data)
        const created = await questionApi.create(cId(), eId(), payload);
        setQuestions(prev => [...prev, created]);
        setSelectedQuestion(created);
        await loadOptions(created);
        toast.success('Question created');
      }
      setIsQuestionModalOpen(false);
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to save question');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await questionApi.delete(cId(), eId(), questionId);
      const remaining = questions.filter(q => q.id !== questionId);
      setQuestions(remaining);
      if (selectedQuestion?.id === questionId) {
        if (remaining.length > 0) {
          setSelectedQuestion(remaining[0]);
          await loadOptions(remaining[0]);
        } else {
          setSelectedQuestion(null);
          setQuestionOptions([]);
        }
      }
      toast.success('Question deleted');
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete question');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // ── Option CRUD ────────────────────────────────────────────────────────────

  const openCreateOption = () => {
    setEditingOption(null);
    setOptionForm(defaultOptionForm);
    setIsOptionModalOpen(true);
  };

  const openEditOption = (option: Option) => {
    setEditingOption(option);
    setOptionForm({ option_value: option.option_value, is_answer: option.is_answer });
    setIsOptionModalOpen(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.option_value.trim()) { toast.error('Option text is required'); return; }
    if (!selectedQuestion) return;

    setIsSavingOption(true);
    try {
      if (editingOption) {
        // BUG FIX: client.ts optionApi.update had wrong signature (id, data)
        // Your client.ts needs: update(courseId, examId, questionId, optionId, data)
        const updated = await optionApi.update(cId(), eId(), selectedQuestion.id, editingOption.id, optionForm);
        setQuestionOptions(prev => prev.map(o => o.id === updated.id ? updated : o));
        toast.success('Option updated');
      } else {
        // BUG FIX: client.ts optionApi.create had wrong signature (data only)
        // Your client.ts needs: create(courseId, examId, questionId, data)
        const created = await optionApi.create(cId(), eId(), selectedQuestion.id, optionForm);
        setQuestionOptions(prev => [...prev, created]);
        toast.success('Option added');
      }
      setIsOptionModalOpen(false);
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to save option');
    } finally {
      setIsSavingOption(false);
    }
  };

  const handleDeleteOption = async (optionId: number) => {
    if (!selectedQuestion) return;
    try {
      // BUG FIX: client.ts optionApi.delete had wrong signature (id only)
      // Your client.ts needs: delete(courseId, examId, questionId, optionId)
      await optionApi.delete(cId(), eId(), selectedQuestion.id, optionId);
      setQuestionOptions(prev => prev.filter(o => o.id !== optionId));
      toast.success('Option deleted');
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete option');
    } finally {
      setDeletingOptionId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalMarks = questions.reduce((sum, q) => sum + q.mark, 0);
  const marksOk    = questions.length === 0 || totalMarks === exam?.total_marks;

  // ── Loading Skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="lg:col-span-3 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-slate-700">Exam not found</h3>
        <Button onClick={() => navigate(`/courses/${courseId}?level=${levelId}&dept=${deptId}`)} className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Course
        </Button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}?level=${levelId}&dept=${deptId}`)}
            className="rounded-xl font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{exam.title}</h1>
              <ExamTypePill type={exam.exam_type} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Manage questions and answer options</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">{questions.length} Q</span>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
            marksOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <Award className={`w-4 h-4 ${marksOk ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className={`text-sm font-bold ${marksOk ? 'text-emerald-700' : 'text-amber-700'}`}>
              {totalMarks} / {exam.total_marks} marks
            </span>
          </div>
        </div>
      </div>

      {/* Marks Warning */}
      {!marksOk && questions.length > 0 && (
        <Alert className="rounded-2xl border-amber-200 bg-amber-50">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 font-semibold text-sm">
            Total marks assigned ({totalMarks}) {totalMarks > exam.total_marks ? 'exceeds' : 'is below'} the assessment total ({exam.total_marks}). Please adjust question marks.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Questions List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">
              Questions ({questions.length})
            </h2>
            <Button
              size="sm"
              onClick={openCreateQuestion}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20 h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 rounded-2xl shadow-none">
              <CardContent className="py-14 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">
                  <HelpCircle className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">No questions yet</p>
                <p className="text-xs text-slate-400">Add your first question to get started</p>
                <Button size="sm" onClick={openCreateQuestion} className="rounded-xl mt-2 font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2 pr-2">
                {questions.map((question, index) => {
                  const isSelected = selectedQuestion?.id === question.id;
                  const hasAnswer  = question.options?.some(o => o.is_answer);
                  return (
                    <Card
                      key={question.id}
                      className={`cursor-pointer transition-all duration-200 rounded-2xl overflow-hidden ${
                        isSelected
                          ? 'ring-2 ring-cyan-500 border-cyan-300 shadow-md shadow-cyan-500/10'
                          : 'hover:border-slate-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleSelectQuestion(question)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              <span className={`text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs px-2 py-0 rounded-lg font-bold border-slate-200">
                                {question.questin_type === 'mcq'
                                  ? <><ListChecks className="w-3 h-3 mr-1 inline" />MCQ</>
                                  : <><ToggleLeft className="w-3 h-3 mr-1 inline" />T/F</>
                                }
                              </Badge>
                              <Badge variant="secondary" className="text-xs px-2 py-0 rounded-lg font-bold bg-slate-100 text-slate-600">
                                {question.mark}pt
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-snug">
                              {question.question_text}
                            </p>
                            {question.options !== undefined && (
                              <p className="text-xs mt-2">
                                <span className="text-slate-400">{question.options.length} options · </span>
                                {hasAnswer
                                  ? <span className="text-emerald-600 font-bold">✓ Answer set</span>
                                  : <span className="text-amber-500 font-bold">⚠ No answer</span>
                                }
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"
                              onClick={(e) => openEditQuestion(question, e)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); setDeletingQuestionId(question.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* RIGHT — Options Panel */}
        <div className="lg:col-span-3">
          {!selectedQuestion ? (
            <Card className="border-dashed border-2 border-slate-200 rounded-2xl shadow-none h-full min-h-[400px]">
              <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-500">Select a question to manage options</p>
                <p className="text-xs text-slate-400">Click any question on the left to view and edit its answer choices</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs rounded-lg font-bold border-slate-200">
                        {selectedQuestion.questin_type === 'mcq' ? 'Multiple Choice' : 'True / False'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs rounded-lg font-bold bg-slate-100 text-slate-600">
                        {selectedQuestion.mark} mark{selectedQuestion.mark !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold leading-snug text-slate-900">
                      {selectedQuestion.question_text}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {selectedQuestion.questin_type === 'true_false'
                        ? 'Add "True" and "False" as options and mark the correct one.'
                        : 'Add answer choices and mark the correct answer.'}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={openCreateOption}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Option
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-4">
                {/* BUG FIX: proper loading skeleton for options panel */}
                {isLoadingOptions ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  </div>
                ) : questionOptions.length === 0 ? (
                  <div className="text-center py-14 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">
                      <ListChecks className="w-6 h-6 text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No options yet</p>
                    <Button size="sm" variant="outline" onClick={openCreateOption} className="rounded-xl font-bold">
                      <Plus className="w-4 h-4 mr-1" /> Add First Option
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {questionOptions.map((option, idx) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                          option.is_answer
                            ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <OptionLetter index={idx} isAnswer={option.is_answer} />

                        <span className="flex-1 text-sm font-medium text-slate-800">{option.option_value}</span>

                        {option.is_answer && (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-black">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Correct
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"
                            onClick={() => openEditOption(option)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingOptionId(option.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {!questionOptions.some(o => o.is_answer) && (
                      <Alert className="mt-3 rounded-xl border-amber-200 bg-amber-50">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 text-xs font-semibold">
                          No correct answer marked. Edit an option and toggle "Mark as correct answer".
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Question Modal ── */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {editingQuestion ? 'Edit Question' : 'New Question'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Question Text *</Label>
              <Textarea
                placeholder="Enter the question…"
                rows={3}
                className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white resize-none"
                value={questionForm.question_text}
                onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Question Type *</Label>
              <Select
                value={questionForm.questin_type}
                onValueChange={(v: 'mcq' | 'true_false') => setQuestionForm(p => ({ ...p, questin_type: v }))}
              >
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="mcq">
                    <div className="flex items-center gap-2 font-semibold">
                      <ListChecks className="w-4 h-4" /> Multiple Choice (MCQ)
                    </div>
                  </SelectItem>
                  <SelectItem value="true_false">
                    <div className="flex items-center gap-2 font-semibold">
                      <ToggleLeft className="w-4 h-4" /> True / False
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Mark *</Label>
              {/* BUG FIX: Math.max prevents NaN/0 marks */}
              <Input
                type="number"
                min={1}
                className="rounded-xl bg-slate-50 border-slate-200 h-11"
                value={questionForm.mark}
                onChange={e => setQuestionForm(p => ({ ...p, mark: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionModalOpen(false)} disabled={isSavingQuestion} className="rounded-xl">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={isSavingQuestion} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold">
              <Save className="w-4 h-4 mr-1" />
              {isSavingQuestion ? 'Saving…' : editingQuestion ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Option Modal ── */}
      <Dialog open={isOptionModalOpen} onOpenChange={setIsOptionModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {editingOption ? 'Edit Option' : 'New Option'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Option Text *</Label>
              <Input
                placeholder={selectedQuestion?.questin_type === 'true_false' ? 'e.g. True or False' : 'Enter the answer option…'}
                className="rounded-xl bg-slate-50 border-slate-200 h-11 focus:bg-white"
                value={optionForm.option_value}
                onChange={e => setOptionForm(p => ({ ...p, option_value: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <Label htmlFor="is_answer" className="font-bold text-slate-800 cursor-pointer">
                  Mark as correct answer
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">Toggle on if this is the correct answer</p>
              </div>
              <Switch
                id="is_answer"
                checked={optionForm.is_answer}
                onCheckedChange={checked => setOptionForm(p => ({ ...p, is_answer: checked }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOptionModalOpen(false)} disabled={isSavingOption} className="rounded-xl">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveOption} disabled={isSavingOption} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold">
              <Save className="w-4 h-4 mr-1" />
              {isSavingOption ? 'Saving…' : editingOption ? 'Update' : 'Add Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Question Confirm ── */}
      <Dialog open={deletingQuestionId !== null} onOpenChange={() => setDeletingQuestionId(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle className="font-black">Delete Question?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            This will permanently delete the question and all its answer options. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingQuestionId(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => deletingQuestionId && handleDeleteQuestion(deletingQuestionId)} className="rounded-xl font-bold">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Option Confirm ── */}
      <Dialog open={deletingOptionId !== null} onOpenChange={() => setDeletingOptionId(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle className="font-black">Delete Option?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            This will permanently remove this answer option from the question.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingOptionId(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => deletingOptionId && handleDeleteOption(deletingOptionId)} className="rounded-xl font-bold">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamEditPage;