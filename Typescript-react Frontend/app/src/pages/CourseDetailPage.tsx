// ============================================
// CourseDetailPage — Instructor Topic CRUD
// PASTE TO: src/pages/CourseDetailPage.tsx
// ============================================
//
// CHANGES IN THIS VERSION
// ──────────────────────────
// INSTRUCTOR-1: Instructors see an "Add Topic" button in the Topics tab header.
//               Clicking opens a modal with name (required), description, order.
//               Calls topicApi.create(courseId, data) on submit.
//
// INSTRUCTOR-2: Each topic row shows a delete (trash) icon for instructors.
//               Clicking sets deletingTopicId which opens a confirm Dialog.
//               Calls topicApi.delete(courseId, topicId) on confirm.
//
// INSTRUCTOR-3: "Manage Exams" button in the hero card (instructor only) →
//               navigates to /courses/:courseId/exam-manage so instructors
//               can create/manage exams per course.
//
// INSTRUCTOR-4: Instructors see an "Edit Content" button on each expanded
//               topic row → navigates to /courses/:courseId/topics/:id/edit
//               (InstructorTopicEditPage already exists and handles
//               lecture notes + media resources).
//
// FIX-1: Progress resets on exit — preserved from previous version.
//         Loads completed topic IDs from topicApi.getCompleted(courseId).
//
// FIX-2: All previous bug fixes preserved (exam isolation, question_count).
//
// FIX-3: examApi now routed to /courses/:courseId/exam-manage (not inline tab)
//         The Exams tab is removed for instructors — they access exam
//         management via the "Manage Exams" hero button instead.
//         Students still see the Exams tab as before.

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { courseApi, topicApi, examApi } from '@/api/client';
import type { Course, Topic, Exam } from '@/types';
import { usePageTheme } from '@/hooks/usePageTheme';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  FileQuestion, CheckCircle2, ChevronLeft,
  Check, ArrowRight, ClipboardList, BookOpen, Clock,
  Trophy, Layers, Play, Lock,
  ChevronRight, WifiOff, RefreshCw,
  GraduationCap, Star, Zap,
  Plus, Trash2, Settings, Edit, Save, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const semesterLabel = (s: string) =>
  s === 'FIRST' ? '1st Semester' : '2nd Semester';

const gradeInfo = (pct: number) => {
  if (pct >= 80) return { label: 'Excellent',  color: '#10b981', glow: 'rgba(16,185,129,0.2)'  };
  if (pct >= 60) return { label: 'Good',        color: '#f59e0b', glow: 'rgba(245,158,11,0.2)'  };
  if (pct >= 40) return { label: 'Fair',        color: '#6366f1', glow: 'rgba(99,102,241,0.2)'  };
  if (pct >  0)  return { label: 'Started',     color: '#22d3ee', glow: 'rgba(34,211,238,0.15)' };
  return               { label: 'Not started',  color: '#475569', glow: 'transparent'            };
};

const EXAM_CFG = {
  self_assessment: { color: '#22d3ee', icon: '📝', label: 'Practice' },
  test:            { color: '#a78bfa', icon: '🧪', label: 'Test'     },
  exam:            { color: '#f59e0b', icon: '📋', label: 'Exam'     },
} as const;
type ExamType = keyof typeof EXAM_CFG;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const PageSkeleton = () => {
  const t = usePageTheme();
  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, padding: '2rem 1rem', maxWidth: 1024, margin: '0 auto' }}>
      <Skeleton className="h-8 w-24 rounded-xl mb-5" style={{ background: t.cardBorder }} />
      <Skeleton className="h-64 w-full rounded-3xl mb-5" style={{ background: t.cardBorder }} />
      <div className="flex gap-2 mb-5">
        <Skeleton className="h-11 w-36 rounded-2xl" style={{ background: t.cardBorder }} />
        <Skeleton className="h-11 w-28 rounded-2xl" style={{ background: t.cardBorder }} />
      </div>
      {[1,2,3,4,5].map(i => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl mb-3"
          style={{ background: t.inputBg, animationDelay: `${i*80}ms` }} />
      ))}
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon, title, description,
}) => {
  const t = usePageTheme();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '5rem 1rem', borderRadius: 24,
      border: `1px solid ${t.cardBorder}`, background: t.inputBg,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, background: t.inputBg,
        border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 20,
      }}>{icon}</div>
      <p style={{ fontWeight: 700, color: t.textSec, fontSize: '1rem', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: '0.875rem', color: t.textTer, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>{description}</p>
    </div>
  );
};

const ProgressRing: React.FC<{ pct: number }> = ({ pct }) => {
  const size = 84, stroke = 6, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const grade = gradeInfo(pct);
  const t = usePageTheme();
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="cdRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} stroke={t.border} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" stroke="url(#cdRingGrad)"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontWeight: 900, fontSize: '1.125rem', color: t.textPri, lineHeight: 1 }}>{pct}%</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', boxShadow: `0 0 20px ${grade.glow}` }} />
    </div>
  );
};

// ── Topic Row ─────────────────────────────────────────────────────────────────
interface TopicRowProps {
  topic: Topic;
  idx: number;
  courseId: string;
  isCompleted: boolean;
  isExpanded: boolean;
  isMarking: boolean;
  hasStudentRole: boolean;
  hasInstructorRole: boolean;
  onToggle: () => void;
  onMarkDone: (e: React.MouseEvent, id: number) => void;
  onDeleteClick: (e: React.MouseEvent, id: number) => void;
}

const TopicRow: React.FC<TopicRowProps> = ({
  topic, idx, courseId, isCompleted, isExpanded, isMarking,
  hasStudentRole, hasInstructorRole, onToggle, onMarkDone, onDeleteClick,
}) => {
  const t = usePageTheme();
  const accentCompleted = t.isDark ? 'rgba(16,185,129,0.03)' : 'rgba(16,185,129,0.04)';
  const accentExpanded  = t.isDark ? 'rgba(34,211,238,0.03)' : 'rgba(8,145,178,0.04)';
  const borderCompleted = t.isDark ? 'rgba(16,185,129,0.2)'  : 'rgba(16,185,129,0.3)';
  const borderExpanded  = t.isDark ? 'rgba(34,211,238,0.2)'  : 'rgba(8,145,178,0.25)';

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden', transition: 'all 0.2s ease',
      border: isCompleted
        ? `1px solid ${borderCompleted}`
        : isExpanded
          ? `1px solid ${borderExpanded}`
          : `1px solid ${t.cardBorder}`,
      background: isCompleted ? accentCompleted : isExpanded ? accentExpanded : t.cardBg,
      boxShadow: isExpanded ? `0 4px 24px ${t.cyanGlow}` : 'none',
    }}>
      <button
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px 20px', textAlign: 'left', background: 'transparent',
          border: 'none', cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {/* Order badge */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem', fontWeight: 900,
          transition: 'all 0.15s ease',
          background: isCompleted ? 'rgba(16,185,129,0.15)' : isExpanded ? t.cyanDim : t.inputBg,
          border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.25)' : isExpanded ? t.borderAcc : t.border}`,
          color: isCompleted ? '#10b981' : isExpanded ? t.cyan : t.textTer,
        }}>
          {isCompleted
            ? <CheckCircle2 size={20} />
            : <span>{String((topic as any).order ?? idx + 1).padStart(2, '0')}</span>
          }
        </div>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isCompleted ? '#10b981' : t.textPri,
          }}>{topic.name}</p>
          {(topic as any).description && !isExpanded && (
            <p style={{
              fontSize: '0.75rem', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: t.textTer,
            }}>{(topic as any).description}</p>
          )}
        </div>

        {/* Right badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div className="hidden sm:flex" style={{
            alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
            fontSize: '0.625rem', fontWeight: 700,
            border: `1px solid ${t.border}`, background: t.inputBg, color: t.textTer,
          }}>
            <BookOpen size={10} /> Notes & Media
          </div>
          {isCompleted && (
            <div className="hidden sm:flex" style={{
              alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999,
              fontSize: '0.625rem', fontWeight: 900,
              background: 'rgba(16,185,129,0.1)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <Check size={10} /> Done
            </div>
          )}

          {/* INSTRUCTOR-2: Delete button */}
          {hasInstructorRole && (
            <div
              onClick={e => onDeleteClick(e, topic.id)}
              style={{
                width: 28, height: 28, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: t.inputBg, border: `1px solid ${t.border}`,
                color: t.textTer, transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)';
                (e.currentTarget as HTMLElement).style.color = '#f87171';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = t.inputBg;
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.color = t.textTer;
              }}
              title="Delete topic"
            >
              <Trash2 size={13} />
            </div>
          )}

          <div style={{
            width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.3s ease',
            background: isExpanded ? t.cyanDim : t.inputBg,
            transform: isExpanded ? 'rotate(90deg)' : 'none',
          }}>
            <ChevronRight size={14} color={isExpanded ? t.cyan : t.textTer} />
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ padding: '0 20px 20px', marginLeft: 56, borderTop: `1px solid ${t.border}` }}>
          {(topic as any).description && (
            <p style={{
              fontSize: '0.875rem', color: t.textSec, lineHeight: 1.7,
              paddingTop: 16, marginBottom: 16,
            }}>{(topic as any).description}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}
            className="sm:flex-row">

            {/* View lesson */}
            <Link to={`/courses/${courseId}/topics/${topic.id}`} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: 16, borderRadius: 14, textDecoration: 'none',
              transition: 'all 0.15s ease',
              background: t.isDark
                ? 'linear-gradient(135deg, rgba(34,211,238,0.85), rgba(6,182,212,0.75))'
                : 'linear-gradient(135deg, #0891b2, #0e7490)',
              border: `1px solid ${t.borderAcc}`,
              boxShadow: `0 4px 20px ${t.cyanGlow}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(0,0,0,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={16} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                    View Lesson
                  </p>
                  <p style={{ fontSize: '0.6875rem', marginTop: 2, color: 'rgba(255,255,255,0.6)' }}>
                    Notes · Images · PDFs · Videos
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="rgba(255,255,255,0.6)" />
            </Link>

            {/* INSTRUCTOR-4: Edit Content button */}
            {hasInstructorRole && (
              <Link to={`/courses/${courseId}/topics/${topic.id}/edit`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px 20px', borderRadius: 14, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.15s ease',
                background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
              }}>
                <Edit size={16} /> Edit Content
              </Link>
            )}

            {/* Student: Mark Done */}
            {hasStudentRole && (
              <button
                onClick={e => onMarkDone(e, topic.id)}
                disabled={isCompleted || isMarking}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '12px 20px', borderRadius: 14,
                  fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.15s ease',
                  background: isCompleted ? 'rgba(16,185,129,0.08)' : t.inputBg,
                  border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : t.border}`,
                  color: isCompleted ? '#10b981' : t.textSec,
                  cursor: isCompleted ? 'default' : 'pointer',
                }}
              >
                {isMarking
                  ? <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid currentColor', borderTopColor: 'transparent',
                      animation: 'spin 0.75s linear infinite',
                    }} />
                  : <Check size={16} />
                }
                {isCompleted ? 'Completed' : isMarking ? 'Saving…' : 'Mark Done'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

type LoadError = 'not_found' | 'network' | null;

interface TopicForm {
  name:        string;
  description: string;
  order:       string; // string so input is controlled cleanly; parsed on submit
}

const defaultTopicForm: TopicForm = { name: '', description: '', order: '' };

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate     = useNavigate();
  const { hasRole }  = useAuth();
  const t            = usePageTheme();

  const isInstructor = hasRole('instructor') || hasRole('admin');
  const isStudent    = hasRole('student');

  // ── Core state ─────────────────────────────────────────────────────────────
  const [course,          setCourse]          = useState<Course | null>(null);
  const [topics,          setTopics]          = useState<Topic[]>([]);
  const [exams,           setExams]           = useState<Exam[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [loadError,       setLoadError]       = useState<LoadError>(null);
  const [examError,       setExamError]       = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState('topics');
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set());
  const [expandedTopic,   setExpandedTopic]   = useState<number | null>(null);
  const [markingId,       setMarkingId]       = useState<number | null>(null);

  // INSTRUCTOR-1: Create topic modal state
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [topicForm,       setTopicForm]       = useState<TopicForm>(defaultTopicForm);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // INSTRUCTOR-2: Delete topic confirm state
  const [deletingTopicId,   setDeletingTopicId]   = useState<number | null>(null);
  const [isDeletingTopic,   setIsDeletingTopic]   = useState(false);

  // ── Load course + topics ───────────────────────────────────────────────────
  const loadCourseData = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setLoadError(null);
    const crsId = parseInt(courseId, 10);
    if (isNaN(crsId)) { setLoadError('not_found'); setIsLoading(false); return; }

    try {
      const courseData = await courseApi.getById(crsId);
      setCourse(courseData);
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      setLoadError(msg.includes('404') || msg.includes('not found') ? 'not_found' : 'network');
      setIsLoading(false);
      return;
    }

    try {
      const topicResult = await topicApi.getByCourse(crsId).catch(() => [] as Topic[]);
      setTopics([...topicResult].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)));
    } catch { setTopics([]); }

    // FIX-1: Load persisted completions (students only)
    if (isStudent) {
      try {
        const completionData = await topicApi.getCompleted(crsId);
        if (completionData?.completed_topic_ids) {
          setCompletedTopics(new Set(completionData.completed_topic_ids));
        }
      } catch {
        // Endpoint not yet implemented — silently ignore
      }
    }

    setIsLoading(false);
  }, [courseId, isStudent]);

  // ── Load exams (students only — instructors use exam-manage page) ──────────
  const loadExams = useCallback(async () => {
    if (!courseId || isInstructor) return;
    setExamError(null);
    try {
      const result = await examApi.getByCourse(parseInt(courseId, 10));
      setExams(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setExamError(err?.message ?? 'Failed to load exams');
      toast.error('Failed to load exams');
    }
  }, [courseId, isInstructor]);

  useEffect(() => { void loadCourseData(); }, [loadCourseData]);
  useEffect(() => { void loadExams(); },     [loadExams]);

  // ── Mark topic complete (students) ─────────────────────────────────────────
  const handleCompleteTopic = async (e: React.MouseEvent, topicId: number) => {
    e.stopPropagation();
    if (completedTopics.has(topicId) || markingId === topicId) return;
    setMarkingId(topicId);
    try {
      await topicApi.markComplete(parseInt(courseId!, 10), topicId);
      setCompletedTopics(prev => new Set([...prev, topicId]));
      toast.success('Topic marked as complete!');
    } catch {
      toast.error('Failed to update progress');
    } finally {
      setMarkingId(null);
    }
  };

  // INSTRUCTOR-1: Create topic ────────────────────────────────────────────────
  const handleCreateTopic = async () => {
    if (!topicForm.name.trim()) { toast.error('Topic name is required'); return; }
    if (!courseId) return;
    setIsCreatingTopic(true);
    try {
      const orderVal = topicForm.order.trim()
        ? Math.max(1, parseInt(topicForm.order, 10) || 1)
        : topics.length + 1;

      const created = await topicApi.create(parseInt(courseId, 10), {
        name:        topicForm.name.trim(),
        description: topicForm.description.trim() || undefined,
        order:       orderVal,
      });

      setTopics(prev =>
        [...prev, created].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
      );
      setShowCreateTopic(false);
      setTopicForm(defaultTopicForm);
      toast.success('Topic created successfully!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create topic');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // INSTRUCTOR-2: Delete topic ────────────────────────────────────────────────
  const handleDeleteTopic = async () => {
    if (deletingTopicId === null || !courseId) return;
    setIsDeletingTopic(true);
    try {
      await topicApi.delete(parseInt(courseId, 10), deletingTopicId);
      setTopics(prev => prev.filter(tp => tp.id !== deletingTopicId));
      if (expandedTopic === deletingTopicId) setExpandedTopic(null);
      toast.success('Topic deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete topic');
    } finally {
      setIsDeletingTopic(false);
      setDeletingTopicId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalCount     = topics.length;
  const completedCount = completedTopics.size;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const grade          = gradeInfo(progressPct);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  if (loadError || !course) {
    const isNotFound = loadError === 'not_found';
    return (
      <div style={{
        minHeight: '100vh', background: t.pageBg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 24, padding: '1rem',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, background: t.inputBg,
          border: `1px solid ${t.border}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isNotFound ? <BookOpen size={36} color={t.textTer} /> : <WifiOff size={36} color={t.textTer} />}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', color: t.textPri, marginBottom: 6 }}>
            {isNotFound ? 'Course not found' : 'Connection failed'}
          </p>
          <p style={{ fontSize: '0.875rem', color: t.textSec, maxWidth: 280 }}>
            {isNotFound
              ? 'This course may have been removed or the link is invalid.'
              : 'Unable to reach the server. Check your connection and retry.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/courses')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 14, fontSize: '0.875rem', fontWeight: 600,
            background: t.inputBg, border: `1px solid ${t.border}`,
            color: t.textSec, cursor: 'pointer',
          }}>
            <ChevronLeft size={16} /> All Courses
          </button>
          {!isNotFound && (
            <button onClick={() => void loadCourseData()} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 14, fontSize: '0.875rem', fontWeight: 600,
              background: t.cyanDim, border: `1px solid ${t.borderAcc}`,
              color: t.cyan, cursor: 'pointer',
            }}>
              <RefreshCw size={16} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, position: 'relative' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-8%',
          width: 520, height: 520, borderRadius: '50%',
          background: `radial-gradient(circle, ${t.glow1} 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: 420, height: 420, borderRadius: '50%',
          background: `radial-gradient(circle, ${t.glow2} 0%, transparent 70%)`,
          filter: 'blur(70px)',
        }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 1024, margin: '0 auto', padding: '24px 16px 112px' }}>

        {/* ── Top nav ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 8, marginBottom: 20,
        }}>
          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem',
            fontWeight: 500, color: t.textSec, background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: t.inputBg,
              border: `1px solid ${t.border}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={16} color={t.textSec} />
            </div>
            Back
          </button>

          {/* Student: Practice Quiz shortcut */}
          {isStudent && (
            <Link to={`/courses/${courseId}/self-assessment`} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 12, textDecoration: 'none', color: '#fff',
              fontSize: '0.875rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}>
              <Zap size={14} /> Practice Quiz
            </Link>
          )}

          {/* INSTRUCTOR-3: Manage assessment button */}
          {isInstructor && (
            <button onClick={() => navigate(`/courses/${courseId}/exam-manage`)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 12, cursor: 'pointer', color: '#fff',
              fontSize: '0.875rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              border: 'none',
            }}>
              <Settings size={14} /> Manage Exams
            </button>
          )}
        </div>

        {/* ── Hero card ── */}
        <div style={{
          borderRadius: 28, border: `1px solid ${t.cardBorder}`,
          background: t.cardBg, overflow: 'hidden',
          boxShadow: t.shadow, marginBottom: 20,
        }}>
          <div style={{
            height: 1, width: '100%',
            background: `linear-gradient(90deg, transparent, ${t.borderAcc}, transparent)`,
          }} />
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="md:flex-row md:items-start">
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  flexWrap: 'wrap', marginBottom: 12,
                }}>
                  <h1 style={{
                    fontWeight: 900, color: t.textPri, letterSpacing: '-0.03em',
                    lineHeight: 1, fontSize: 'clamp(2rem, 5vw, 3rem)', margin: 0,
                  }}>{course.code}</h1>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                    borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                    background: course.semester === 'FIRST'
                      ? (t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(14,165,233,0.08)')
                      : (t.isDark ? 'rgba(167,139,250,0.1)' : 'rgba(99,102,241,0.08)'),
                    color: course.semester === 'FIRST'
                      ? (t.isDark ? '#38bdf8' : '#0284c7')
                      : (t.isDark ? '#a78bfa' : '#6366f1'),
                    border: `1px solid ${course.semester === 'FIRST'
                      ? (t.isDark ? 'rgba(56,189,248,0.2)' : 'rgba(14,165,233,0.2)')
                      : (t.isDark ? 'rgba(167,139,250,0.2)' : 'rgba(99,102,241,0.2)')}`,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'currentColor', animation: 'pulse 2s ease infinite',
                    }} />
                    {semesterLabel(course.semester)}
                  </span>
                </div>
                <p style={{
                  fontSize: '1rem', color: t.textSec, lineHeight: 1.5,
                  marginBottom: 16, maxWidth: 560,
                }}>{course.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { icon: <Layers size={13} />,       text: `${totalCount} topic${totalCount !== 1 ? 's' : ''}` },
                    { icon: <FileQuestion size={13} />,  text: `${exams.length} exam${exams.length !== 1 ? 's' : ''}` },
                    { icon: <GraduationCap size={13} />, text: (course as any).department?.name ?? 'Department' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999, fontSize: '0.75rem',
                      fontWeight: 600, background: t.inputBg,
                      border: `1px solid ${t.border}`, color: t.textSec,
                    }}>
                      {item.icon}{item.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Student progress ring */}
              {isStudent && totalCount > 0 && (
                <div style={{
                  flexShrink: 0, borderRadius: 20, padding: '20px 28px',
                  minWidth: 172, textAlign: 'center',
                  background: t.inputBg, border: `1px solid ${t.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <ProgressRing pct={progressPct} />
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 900, color: grade.color, marginBottom: 4 }}>
                    {grade.label}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: t.textTer }}>
                    {completedCount}/{totalCount} done
                  </p>
                  <div style={{
                    height: 4, borderRadius: 999, overflow: 'hidden',
                    background: t.border, marginTop: 10,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 999, transition: 'width 0.7s ease',
                      width: `${progressPct}%`,
                      background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{
            display: 'inline-flex', gap: 4, padding: 4, borderRadius: 18,
            height: 'auto', background: t.inputBg, border: `1px solid ${t.border}`,
          }}>
            {[
              { value: 'topics', icon: <BookOpen size={16} />, label: 'Topics', count: totalCount },
              // Exams tab only for students
              ...(!isInstructor
                ? [{ value: 'exams', icon: <Trophy size={16} />, label: 'Exams', count: exams.length }]
                : []),
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} style={{
                borderRadius: 14, padding: '10px 20px', fontSize: '0.875rem',
                fontWeight: 600, height: 'auto', display: 'flex',
                alignItems: 'center', gap: 8,
              }}>
                {tab.icon}{tab.label}
                <span style={{
                  fontSize: '0.625rem', padding: '2px 6px', borderRadius: 999,
                  fontWeight: 900, background: t.border, color: t.textTer,
                }}>{tab.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Topics tab ── */}
          <TabsContent value="topics" style={{ marginTop: 20 }}>
            {/* INSTRUCTOR-1: Add Topic header button */}
            {isInstructor && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <p style={{ fontSize: '0.875rem', color: t.textSec, fontWeight: 600 }}>
                  {totalCount} topic{totalCount !== 1 ? 's' : ''} in this course
                </p>
                <button
                  onClick={() => { setTopicForm(defaultTopicForm); setShowCreateTopic(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 14, cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                    background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                    border: '1px solid rgba(34,211,238,0.3)',
                    boxShadow: '0 4px 20px rgba(34,211,238,0.2)',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                >
                  <Plus size={16} /> Add Topic
                </button>
              </div>
            )}

            {totalCount === 0 ? (
              <EmptyState
                icon={<BookOpen size={28} color={t.textTer} />}
                title="No courses yet"
                description={isInstructor
                  ? 'Click "Add Topic" above to create the first topic for this course.'
                  : 'Topics for this course haven\'t been added yet. Check back soon.'}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topics.map((tp, idx) => (
                  <TopicRow
                    key={tp.id}
                    topic={tp}
                    idx={idx}
                    courseId={courseId!}
                    isCompleted={completedTopics.has(tp.id)}
                    isExpanded={expandedTopic === tp.id}
                    isMarking={markingId === tp.id}
                    hasStudentRole={isStudent}
                    hasInstructorRole={isInstructor}
                    onToggle={() => setExpandedTopic(prev => prev === tp.id ? null : tp.id)}
                    onMarkDone={handleCompleteTopic}
                    onDeleteClick={(e, id) => { e.stopPropagation(); setDeletingTopicId(id); }}
                  />
                ))}

                {/* Student: Practice quiz CTA */}
                {isStudent && (
                  <div style={{
                    position: 'relative', overflow: 'hidden', borderRadius: 24,
                    padding: 28, marginTop: 12,
                    background: t.isDark
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
                    border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.15)'}`,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="sm:flex-row sm:items-center">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Star size={14} color="#818cf8" />
                          <p style={{
                            fontSize: '0.625rem', fontWeight: 900,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: '#818cf8', margin: 0,
                          }}>Practice Mode</p>
                        </div>
                        <p style={{ fontWeight: 900, fontSize: '1.25rem', color: t.textPri, marginBottom: 4 }}>
                          Ready to test yourself?
                        </p>
                        <p style={{ fontSize: '0.875rem', color: t.textSec }}>
                          100 questions quiz covering all topics.
                        </p>
                      </div>
                      <Link to={`/courses/${courseId}/self-assessment`} style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 24px', borderRadius: 18, textDecoration: 'none',
                        color: '#fff', fontWeight: 900, fontSize: '0.875rem',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
                      }}>
                        <ClipboardList size={16} /> Start Quiz
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Exams tab (students only) ── */}
          {!isInstructor && (
            <TabsContent value="exams" style={{ marginTop: 20 }}>
              {examError && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, padding: 16, borderRadius: 16, marginBottom: 16,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#f87171', margin: 0 }}>
                    ⚠️ {examError}
                  </p>
                  <button onClick={() => void loadExams()} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
                    borderRadius: 10, fontSize: '0.75rem', fontWeight: 700,
                    background: 'rgba(239,68,68,0.1)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                  }}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              )}

              {exams.length === 0 && !examError ? (
                <EmptyState
                  icon={<Lock size={28} color={t.textTer} />}
                  title="No assessment published yet"
                  description="Your instructor hasn't published any assessment for this course yet."
                />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 16,
                }}>
                  {exams.map(exam => {
                    const type  = (exam.exam_type as ExamType) in EXAM_CFG
                      ? (exam.exam_type as ExamType)
                      : 'exam';
                    const cfg    = EXAM_CFG[type];
                    const qCount = (exam as any).question_count ?? 0;
                    const accentBg  = t.isDark ? `${cfg.color}14` : `${cfg.color}0f`;
                    const accentBdr = `${cfg.color}30`;
                    return (
                      <div key={exam.id} style={{
                        position: 'relative', overflow: 'hidden',
                        borderRadius: 20, border: `1px solid ${t.cardBorder}`,
                        background: t.cardBg, transition: 'all 0.2s ease',
                        boxShadow: t.shadow,
                      }}>
                        <div style={{
                          height: 1, width: '100%',
                          background: `linear-gradient(90deg, transparent, ${cfg.color}55, transparent)`,
                        }} />
                        <div style={{ padding: 20 }}>
                          <div style={{
                            display: 'flex', alignItems: 'flex-start',
                            justifyContent: 'space-between', gap: 12, marginBottom: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
                              <span style={{
                                fontSize: '0.625rem', fontWeight: 900, padding: '4px 10px',
                                borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.07em',
                                background: accentBg, color: cfg.color, border: `1px solid ${accentBdr}`,
                              }}>{cfg.label}</span>
                            </div>
                            <span style={{
                              fontSize: '0.6875rem', fontWeight: 900, padding: '4px 10px',
                              borderRadius: 999, background: t.inputBg, color: t.textTer,
                              border: `1px solid ${t.border}`,
                            }}>{qCount}Q</span>
                          </div>
                          <h3 style={{
                            fontWeight: 700, fontSize: '0.875rem', color: t.textPri,
                            lineHeight: 1.4, marginBottom: 14,
                          }}>{exam.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 10px', borderRadius: 999, fontSize: '0.75rem',
                              background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
                            }}>
                              <Clock size={11} />{exam.duration_mins}m
                            </span>
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 10px', borderRadius: 999, fontSize: '0.75rem',
                              background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
                            }}>
                              🏆 {exam.total_marks} marks
                            </span>
                          </div>
                          <Link to={`/courses/${courseId}/exam/${exam.id}`} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 8, width: '100%', padding: '12px', borderRadius: 12,
                            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
                            color: type === 'exam' ? '#0b0f1a' : '#fff',
                            background: `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color}99)`,
                            border: `1px solid ${accentBdr}`,
                            boxShadow: `0 4px 20px ${cfg.color}18`,
                          }}>
                            <Play size={16} /> Start Assessment
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ══ Create Topic Modal ══ */}
      <Dialog
        open={showCreateTopic}
        onOpenChange={open => { if (!isCreatingTopic) setShowCreateTopic(open); }}
      >
        <DialogContent style={{ borderRadius: 28, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 900, fontSize: '1.125rem' }}>
              Add New Topic
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                Topic Name *
              </Label>
              <Input
                placeholder="e.g. Introduction to Photosynthesis"
                value={topicForm.name}
                onChange={e => setTopicForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreateTopic(); }}
                style={{ borderRadius: 12, height: 44 }}
              />
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                Description{' '}
                <span style={{ fontWeight: 400, color: t.textTer }}>(optional)</span>
              </Label>
              <Textarea
                placeholder="Brief summary of what this topic covers…"
                rows={3}
                value={topicForm.description}
                onChange={e => setTopicForm(p => ({ ...p, description: e.target.value }))}
                style={{ borderRadius: 12, resize: 'none' }}
              />
            </div>

            {/* Order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                Order{' '}
                <span style={{ fontWeight: 400, color: t.textTer }}>
                  (optional — defaults to {topics.length + 1})
                </span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder={String(topics.length + 1)}
                value={topicForm.order}
                onChange={e => setTopicForm(p => ({ ...p, order: e.target.value }))}
                style={{ borderRadius: 12, height: 44 }}
              />
            </div>
          </div>

          <DialogFooter style={{ gap: 8 }}>
            <button
              onClick={() => setShowCreateTopic(false)}
              disabled={isCreatingTopic}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem',
                background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
              }}
            >
              <X size={15} /> Cancel
            </button>
            <button
              onClick={() => void handleCreateTopic()}
              disabled={isCreatingTopic || !topicForm.name.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 12,
                cursor: (isCreatingTopic || !topicForm.name.trim()) ? 'default' : 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                border: '1px solid rgba(34,211,238,0.3)',
                opacity: (isCreatingTopic || !topicForm.name.trim()) ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {isCreatingTopic
                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                : <><Save size={15} /> Create Topic</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Delete Topic Confirm Modal ══ */}
      <Dialog
        open={deletingTopicId !== null}
        onOpenChange={() => { if (!isDeletingTopic) setDeletingTopicId(null); }}
      >
        <DialogContent style={{ borderRadius: 28, maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 900 }}>Delete Topic?</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: '0.875rem', color: t.textSec, padding: '8px 0', lineHeight: 1.6 }}>
            This will permanently delete the topic and <strong>all its lecture notes
            and media resources</strong>. This cannot be undone.
          </p>
          <DialogFooter style={{ gap: 8 }}>
            <button
              onClick={() => setDeletingTopicId(null)}
              disabled={isDeletingTopic}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem',
                background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDeleteTopic()}
              disabled={isDeletingTopic}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 12,
                cursor: isDeletingTopic ? 'default' : 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: '1px solid rgba(239,68,68,0.3)',
                opacity: isDeletingTopic ? 0.7 : 1,
              }}
            >
              {isDeletingTopic
                ? <><Loader2 size={15} className="animate-spin" /> Deleting…</>
                : <><Trash2 size={15} /> Delete Topic</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseDetailPage;