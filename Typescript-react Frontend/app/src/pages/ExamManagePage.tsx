// ============================================
// ExamManagePage — Upgraded (World-Class UI)
// PASTE TO: src/pages/ExamManagePage.tsx
// ============================================
//
// UPGRADES IN THIS VERSION
// ──────────────────────────
// UI-1:  usePageTheme() throughout — full light + dark support, matches all
//        other pages in the project (CourseDetailPage, ExamEditPage, etc.)
//
// UI-2:  Page structure matches CourseDetailPage hero-card pattern — ambient
//        blobs, gradient top border, stat pills, progress ring removed (N/A
//        here), consistent nav back button.
//
// UI-3:  Exam cards upgraded to match the exam card style inside
//        CourseDetailPage's Exams tab — type pill (📝 Practice / 🧪 Test /
//        📋 Exam), question count badge, duration + marks chips, coloured
//        accent top-border, hover glow.
//
// UI-4:  Create-exam modal matches ExamEditPage Dialog style — rounded-3xl,
//        gradient save button, proper field labels, Select for exam_type.
//
// UI-5:  Delete replaced window.confirm() with a proper Dialog matching
//        ExamEditPage's delete confirmation pattern.
//
// UI-6:  Loading skeleton matches PageSkeleton pattern from CourseDetailPage.
//
// UI-7:  Empty state matches EmptyState component style from CourseDetailPage.
//
// FIX-1: duration_mins used consistently (matches Exam type + ExamPage).
//        ExamManagePage was using duration_minutes — corrected.
//
// FIX-2: examApi.create(courseId, payload) — payload now uses duration_mins
//        so it round-trips correctly with the backend.
//
// FIX-3: Navigate to ExamEditPage passes ?level=&dept= query params so the
//        back button in ExamEditPage returns to the correct course page
//        (matches existing ExamEditPage behaviour).
//
// FIX-4: exam_type values lowercased to match EXAM_CFG keys ('self_assessment'
//        | 'test' | 'exam') — old code used 'TEST' | 'EXAM' uppercase which
//        would miss the cfg lookup and fall through to plain 'exam'.
// ============================================

import React, { useEffect, useState, useCallback, type FC } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { examApi } from '@/api/client';
import type { Exam } from '@/types';
import { usePageTheme } from '@/hooks/usePageTheme';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

import {
  ChevronLeft, Plus, Settings, Trash2,
  Clock, Trophy, FileQuestion, RefreshCw,
  WifiOff, Save, X, Loader2, Layers,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EXAM_CFG = {
  self_assessment: { color: '#22d3ee', icon: '📝', label: 'Practice' },
  test:            { color: '#a78bfa', icon: '🧪', label: 'Test'     },
  exam:            { color: '#f59e0b', icon: '📋', label: 'Exam'     },
} as const;
type ExamType = keyof typeof EXAM_CFG;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── Loading Skeleton ──────────────────────────────────────────────────────────
const PageSkeleton: FC = () => {
  const t = usePageTheme();
  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, padding: '2rem 1rem', maxWidth: 900, margin: '0 auto' }}>
      <Skeleton className="h-8 w-24 rounded-xl mb-5" style={{ background: t.cardBorder }} />
      <Skeleton className="h-40 w-full rounded-3xl mb-5" style={{ background: t.cardBorder }} />
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-36 w-full rounded-2xl mb-3"
          style={{ background: t.inputBg, animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
};

// ── Exam Card ─────────────────────────────────────────────────────────────────
interface ExamCardProps {
  assessment: Exam;
  courseId: string;
  levelId: string;
  deptId: string;
  onDelete: (id: number) => void;
  onNavigate: (id: number) => void;
}

const ExamCard: FC<ExamCardProps> = ({ exam, onDelete, onNavigate }) => {
  const t    = usePageTheme();
  const type = (exam.exam_type as ExamType) in EXAM_CFG
    ? (exam.exam_type as ExamType)
    : 'exam';
  const cfg      = EXAM_CFG[type];
  const qCount   = (exam as any).question_count ?? 0;
  const accentBg = t.isDark ? `${cfg.color}14` : `${cfg.color}0f`;
  const accentBdr= `${cfg.color}30`;

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 20, border: `1px solid ${t.cardBorder}`,
      background: t.cardBg, transition: 'all 0.2s ease',
      boxShadow: t.shadow,
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}40`;
        (e.currentTarget as HTMLElement).style.boxShadow  = `0 6px 28px ${cfg.color}18`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = t.cardBorder;
        (e.currentTarget as HTMLElement).style.boxShadow  = t.shadow;
      }}
    >
      {/* Coloured accent top stripe */}
      <div style={{
        height: 1, width: '100%',
        background: `linear-gradient(90deg, transparent, ${cfg.color}55, transparent)`,
      }} />

      <div style={{ padding: 20 }}>
        {/* Row 1 — type pill + question badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
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
            border: `1px solid ${t.border}`, flexShrink: 0,
          }}>{qCount}Q</span>
        </div>

        {/* Title */}
        <h3 style={{
          fontWeight: 700, fontSize: '0.9375rem', color: t.textPri,
          lineHeight: 1.4, marginBottom: 14,
        }}>{exam.title}</h3>

        {/* Chips — duration + marks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999, fontSize: '0.75rem',
            background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
          }}>
            <Clock size={11} />{exam.duration_mins ?? (exam as any).duration_minutes ?? '—'}m
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999, fontSize: '0.75rem',
            background: t.inputBg, border: `1px solid ${t.border}`, color: t.textSec,
          }}>
            🏆 {exam.total_marks} marks
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onNavigate(exam.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '10px', borderRadius: 12, cursor: 'pointer',
              fontWeight: 700, fontSize: '0.875rem', color: '#fff', transition: 'all 0.15s ease',
              background: `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color}99)`,
              border: `1px solid ${accentBdr}`,
              boxShadow: `0 4px 16px ${cfg.color}18`,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
          >
            <Settings size={15} /> Manage Questions
          </button>
          <button
            onClick={() => onDelete(exam.id)}
            style={{
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, cursor: 'pointer', border: `1px solid ${t.border}`,
              background: t.inputBg, color: t.textTer, transition: 'all 0.15s ease', flexShrink: 0,
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
            aria-label="Delete exam"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type LoadError = 'not_found' | 'network' | null;

interface ExamForm {
  title:         string;
  exam_type:     ExamType;
  duration_mins: number;
  total_marks:   number;
}

const defaultForm: ExamForm = {
  title:         '',
  exam_type:     'exam',
  duration_mins: 60,
  total_marks:   100,
};

const ExamManagePage: FC = () => {
  const { courseId }    = useParams<{ courseId: string }>();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const t               = usePageTheme();

  const levelId = searchParams.get('level') ?? '';
  const deptId  = searchParams.get('dept')  ?? '';

  const [exams,      setExams]      = useState<Exam[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<LoadError>(null);

  // Create modal
  const [showCreate,   setShowCreate]   = useState(false);
  const [form,         setForm]         = useState<ExamForm>(defaultForm);
  const [isSaving,     setIsSaving]     = useState(false);

  // Delete confirm
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await examApi.getByCourse(parseInt(courseId, 10));
      setExams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      setLoadError(msg.includes('404') || msg.includes('not found') ? 'not_found' : 'network');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void loadExams(); }, [loadExams]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Please enter an exam title'); return; }
    if (!courseId) return;
    setIsSaving(true);
    try {
      // FIX-2: send duration_mins, not duration_minutes
      const created = await examApi.create(parseInt(courseId, 10), form);
      setExams(prev => [...prev, created]);
      setShowCreate(false);
      setForm(defaultForm);
      toast.success('Exam created!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create exam');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deletingId === null || !courseId) return;
    setIsDeleting(true);
    try {
      await examApi.delete(parseInt(courseId, 10), deletingId);
      setExams(prev => prev.filter(e => e.id !== deletingId));
      toast.success('Exam deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // ── Navigate to ExamEditPage ───────────────────────────────────────────────
  // FIX-3: pass level + dept so ExamEditPage's back button returns correctly
  const goToEdit = (examId: number) => {
    navigate(`/courses/${courseId}/exam/${examId}/edit?level=${levelId}&dept=${deptId}`);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadError) {
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
          <WifiOff size={36} color={t.textTer} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', color: t.textPri, marginBottom: 6 }}>
            Failed to load exams
          </p>
          <p style={{ fontSize: '0.875rem', color: t.textSec, maxWidth: 280 }}>
            Check your connection and try again.
          </p>
        </div>
        <button
          onClick={() => void loadExams()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 14, fontSize: '0.875rem', fontWeight: 600,
            background: t.cyanDim, border: `1px solid ${t.borderAcc}`,
            color: t.cyan, cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalQuestions = exams.reduce((s, e) => s + ((e as any).question_count ?? 0), 0);

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

      <div style={{
        position: 'relative', maxWidth: 900, margin: '0 auto',
        padding: '24px 16px 96px',
      }}>

        {/* ── Top nav ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 8, marginBottom: 20,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.875rem', fontWeight: 500, color: t.textSec,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: t.inputBg,
              border: `1px solid ${t.border}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={16} color={t.textSec} />
            </div>
            Back
          </button>

          <button
            onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 14, cursor: 'pointer',
              fontWeight: 700, fontSize: '0.875rem', color: '#fff',
              background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
              border: '1px solid rgba(34,211,238,0.3)',
              boxShadow: '0 4px 20px rgba(34,211,238,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
          >
            <Plus size={16} /> Create New Assessment
          </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h1 style={{
                fontWeight: 900, color: t.textPri, letterSpacing: '-0.03em',
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', margin: 0, lineHeight: 1,
              }}>
                Manage Assessments
              </h1>
              <p style={{ fontSize: '0.9375rem', color: t.textSec, margin: 0 }}>
                Create assessments, add questions, and manage answer options for this course.
              </p>

              {/* Stat pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { icon: <FileQuestion size={13} />, text: `${exams.length} exam${exams.length !== 1 ? 's' : ''}` },
                  { icon: <Layers       size={13} />, text: `${totalQuestions} total question${totalQuestions !== 1 ? 's' : ''}` },
                  ...(exams.length > 0 ? [{
                    icon: <Trophy size={13} />,
                    text: `${exams.reduce((s, e) => s + (e.total_marks ?? 0), 0)} total marks`,
                  }] : []),
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
          </div>
        </div>

        {/* ── Exam grid / empty state ── */}
        {exams.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '5rem 1rem', borderRadius: 24,
            border: `1px solid ${t.cardBorder}`, background: t.inputBg,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: t.inputBg,
              border: `1px solid ${t.border}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <FileQuestion size={28} color={t.textTer} />
            </div>
            <p style={{ fontWeight: 700, color: t.textSec, fontSize: '1rem', marginBottom: 6 }}>
              No assessment yet
            </p>
            <p style={{
              fontSize: '0.875rem', color: t.textTer, textAlign: 'center',
              maxWidth: 280, lineHeight: 1.6, marginBottom: 24,
            }}>
              Create your first assessment to start adding questions and assessing students.
            </p>
            <button
              onClick={() => { setForm(defaultForm); setShowCreate(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 14, cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                border: '1px solid rgba(34,211,238,0.3)',
                boxShadow: '0 4px 20px rgba(34,211,238,0.25)',
              }}
            >
              <Plus size={16} /> Create First Exam
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {exams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                courseId={courseId!}
                levelId={levelId}
                deptId={deptId}
                onDelete={setDeletingId}
                onNavigate={goToEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ Create Exam Modal ══ */}
      <Dialog open={showCreate} onOpenChange={open => { if (!isSaving) setShowCreate(open); }}>
        <DialogContent style={{ borderRadius: 28, maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 900, fontSize: '1.125rem' }}>
              New Assessment
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>

            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                Title *
              </Label>
              <Input
                placeholder="e.g. Mid-Semester Test"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
                style={{ borderRadius: 12, height: 44 }}
              />
            </div>

            {/* Exam type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                Type *
              </Label>
              <Select
                value={form.exam_type}
                onValueChange={v => setForm(p => ({ ...p, exam_type: v as ExamType }))}
              >
                <SelectTrigger style={{ borderRadius: 12, height: 44 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 16 }}>
                  <SelectItem value="self_assessment">
                    <span style={{ fontWeight: 600 }}>📝 Practice / Self-Assessment</span>
                  </SelectItem>
                  <SelectItem value="test">
                    <span style={{ fontWeight: 600 }}>🧪 Test</span>
                  </SelectItem>
                  <SelectItem value="exam">
                    <span style={{ fontWeight: 600 }}>📋 Exam</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration + Marks side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                  Duration (mins)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_mins}
                  onChange={e => setForm(p => ({
                    ...p,
                    duration_mins: Math.max(1, parseInt(e.target.value) || 1),
                  }))}
                  style={{ borderRadius: 12, height: 44 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontWeight: 700, fontSize: '0.875rem', color: t.textSec }}>
                  Total Marks
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.total_marks}
                  onChange={e => setForm(p => ({
                    ...p,
                    total_marks: Math.max(1, parseInt(e.target.value) || 1),
                  }))}
                  style={{ borderRadius: 12, height: 44 }}
                />
              </div>
            </div>
          </div>

          <DialogFooter style={{ gap: 8 }}>
            <button
              onClick={() => setShowCreate(false)}
              disabled={isSaving}
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
              onClick={() => void handleCreate()}
              disabled={isSaving || !form.title.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 12, cursor: isSaving ? 'default' : 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                border: '1px solid rgba(34,211,238,0.3)',
                opacity: (!form.title.trim() || isSaving) ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {isSaving
                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                : <><Save size={15} /> Create Exam</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Delete Confirm Modal ══ */}
      <Dialog open={deletingId !== null} onOpenChange={() => { if (!isDeleting) setDeletingId(null); }}>
        <DialogContent style={{ borderRadius: 28, maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 900 }}>Delete Exam?</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: '0.875rem', color: t.textSec, padding: '8px 0', lineHeight: 1.6 }}>
            This will permanently delete the exam and <strong>all its questions and options</strong>.
            This cannot be undone.
          </p>
          <DialogFooter style={{ gap: 8 }}>
            <button
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
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
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 12,
                cursor: isDeleting ? 'default' : 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: '1px solid rgba(239,68,68,0.3)',
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              {isDeleting
                ? <><Loader2 size={15} className="animate-spin" /> Deleting…</>
                : <><Trash2 size={15} /> Delete Exam</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamManagePage;