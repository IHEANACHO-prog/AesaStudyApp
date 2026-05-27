// ============================================
// AESA — Courses Page (Instructor Assignment)
// PASTE TO: src/pages/CoursesPage.tsx
//
// CHANGES vs previous version:
//  [INST-1] Instructors see ALL courses in their department (not just assigned)
//  [INST-2] Each card shows Assigned / Unassigned badge — clicking toggles
//  [INST-3] Assignment state loaded from GET /api/courses/my-assignments/
//  [INST-4] Enroll button only shown for students
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { courseApi, departmentApi, levelApi, enrollmentApi } from '@/api/client';
import type { Course, Department, Level } from '@/types';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import {
  BookOpen, Plus, Search, User, ChevronRight, Building2,
  Layers, Info, GraduationCap, CheckCircle2, X, UserCheck, UserX,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Design tokens ─────────────────────────────────────────────

const useTokens = () => {
  const { isDark } = useTheme();
  return {
    isDark,
    bg:        isDark ? '#07090f'  : '#f4f6fb',
    raised:    isDark ? '#0c1120'  : '#ffffff',
    overlay:   isDark ? '#111827'  : '#ffffff',
    subtle:    isDark ? 'rgba(255,255,255,0.030)' : 'rgba(0,0,0,0.030)',
    hover:     isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.050)',
    active:    isDark ? 'rgba(34,211,238,0.09)'   : 'rgba(8,145,178,0.07)',
    border:    isDark ? 'rgba(255,255,255,0.07)'  : 'rgba(0,0,0,0.08)',
    borderStr: isDark ? 'rgba(255,255,255,0.12)'  : 'rgba(0,0,0,0.14)',
    borderAcc: isDark ? 'rgba(34,211,238,0.28)'   : 'rgba(8,145,178,0.30)',
    textPri:   isDark ? '#f0f4ff' : '#0a101e',
    textSec:   isDark ? '#8899b4' : '#52637a',
    textTer:   isDark ? '#3a4a60' : '#9badbe',
    cyan:      isDark ? '#22d3ee' : '#0891b2',
    cyanDim:   isDark ? 'rgba(34,211,238,0.10)' : 'rgba(8,145,178,0.08)',
    cyanGlow:  isDark ? 'rgba(34,211,238,0.18)' : 'rgba(8,145,178,0.15)',
    green:     isDark ? '#34d399' : '#059669',
    greenDim:  isDark ? 'rgba(52,211,153,0.10)' : 'rgba(5,150,105,0.08)',
    greenBorder: isDark ? 'rgba(52,211,153,0.25)' : 'rgba(5,150,105,0.22)',
    shadow:    isDark
      ? '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.055)'
      : '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)',
    shadowHov: isDark
      ? '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.09)'
      : '0 4px 20px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.09)',
  };
};

const getSemBadge = (sem: string, isDark: boolean) => {
  if (sem === 'FIRST') return {
    bg: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.10)',
    color: isDark ? '#38bdf8' : '#0284c7',
    border: isDark ? 'rgba(56,189,248,0.22)' : 'rgba(14,165,233,0.22)',
    label: '1st Sem',
  };
  return {
    bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.09)',
    color: isDark ? '#34d399' : '#059669',
    border: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(5,150,105,0.20)',
    label: '2nd Sem',
  };
};

// ── Skeleton ───────────────────────────────────────────────────

const CardSkeleton: React.FC<{ t: ReturnType<typeof useTokens> }> = ({ t }) => (
  <div style={{ background: t.raised, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} className="aesa-skeleton">
    <div style={{ width: 40, height: 40, borderRadius: 10, background: t.subtle }} />
    <div style={{ width: '60%', height: 18, borderRadius: 6, background: t.subtle }} />
    <div style={{ width: '80%', height: 14, borderRadius: 5, background: t.subtle }} />
    <div style={{ width: '45%', height: 14, borderRadius: 5, background: t.subtle }} />
    <div style={{ marginTop: 8, width: '100%', height: 1, background: t.border }} />
    <div style={{ width: '30%', height: 12, borderRadius: 4, background: t.subtle }} />
  </div>
);

// ── Assignment Badge ───────────────────────────────────────────

interface AssignBadgeProps {
  isAssigned:  boolean;
  loading:     boolean;
  onToggle:    (e: React.MouseEvent) => void;
  t:           ReturnType<typeof useTokens>;
}

const AssignBadge: React.FC<AssignBadgeProps> = ({ isAssigned, loading, onToggle, t }) => {
  const [hov, setHov] = useState(false);

  const base = isAssigned
    ? { bg: t.greenDim, color: t.green, border: t.greenBorder }
    : { bg: t.subtle,   color: t.textSec, border: t.border };

  const label = loading
    ? '…'
    : hov
      ? (isAssigned ? 'Unassigned' : 'Assigned')
      : (isAssigned ? 'Assigned' : 'Unassigned');

  const Icon = isAssigned ? UserCheck : UserX;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 999,
        border: `1px solid ${hov ? t.borderStr : base.border}`,
        background: hov ? (isAssigned ? 'rgba(239,68,68,0.08)' : t.cyanDim) : base.bg,
        color: hov ? (isAssigned ? '#ef4444' : t.cyan) : base.color,
        fontSize: '0.6875rem',
        fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.15s ease',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} strokeWidth={2.2} />
      {label}
    </button>
  );
};

// ── Course Card ────────────────────────────────────────────────

interface CourseCardProps {
  course:       Course;
  isEnrolled?:  boolean;
  isAssigned?:  boolean;
  onEnroll?:    (id: number) => void;
  onAssign?:    (id: number) => void;
  onUnassign?:  (id: number) => void;
  style?:       React.CSSProperties;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course, isEnrolled = false, isAssigned = false,
  onEnroll, onAssign, onUnassign, style,
}) => {
  const t = useTokens();
  const [hovered,    setHovered]    = useState(false);
  const [enrolling,  setEnrolling]  = useState(false);
  const [assigning,  setAssigning]  = useState(false);

  const hues = ['#22d3ee','#818cf8','#34d399','#fbbf24','#f472b6','#60a5fa'];
  const accentColor = hues[(course.id ?? 0) % hues.length];
  const accentDim   = accentColor + '18';
  const sem = getSemBadge(course.semester, t.isDark);

  const handleEnrollClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!onEnroll || isEnrolled || enrolling) return;
    setEnrolling(true);
    try { await onEnroll(course.id); } finally { setEnrolling(false); }
  };

  const handleAssignToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (assigning) return;
    setAssigning(true);
    try {
      if (isAssigned) { await onUnassign?.(course.id); }
      else            { await onAssign?.(course.id);   }
    } finally { setAssigning(false); }
  };

  return (
    <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: t.raised,
          border: `1px solid ${hovered ? t.borderStr : t.border}`,
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: hovered ? t.shadowHov : t.shadow,
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        className="animate-fade-up"
      >
        {/* Accent stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          borderRadius: '16px 16px 0 0',
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.2s ease',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: hovered ? accentColor + '25' : accentDim,
            border: `1px solid ${accentColor}${hovered ? '40' : '28'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}>
            <BookOpen size={18} color={accentColor} strokeWidth={2} />
          </div>

          {/* Semester badge */}
          <div style={{
            padding: '3px 9px', borderRadius: 999,
            background: sem.bg, color: sem.color, border: `1px solid ${sem.border}`,
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {sem.label}
          </div>
        </div>

        {/* Course code + title */}
        <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: t.textPri, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {course.code}
        </div>
        <div style={{
          fontSize: '0.8125rem', color: t.textSec, lineHeight: 1.5, marginBottom: 14,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {course.title}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
          {course.level && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={12} color={t.textTer} strokeWidth={1.8} />
              <span style={{ fontSize: '0.75rem', color: t.textSec }}>{course.level.name}</span>
            </div>
          )}
          {course.department && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={12} color={t.textTer} strokeWidth={1.8} />
              <span style={{ fontSize: '0.75rem', color: t.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {course.department.name}
              </span>
            </div>
          )}
          {course.instructor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} color={t.textTer} strokeWidth={1.8} />
              <span style={{ fontSize: '0.75rem', color: t.textSec }}>
                {course.instructor.user.first_name} {course.instructor.user.last_name}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Assignment toggle (instructors only) */}
          {(onAssign || onUnassign) && (
            <AssignBadge
              isAssigned={isAssigned}
              loading={assigning}
              onToggle={handleAssignToggle}
              t={t}
            />
          )}

          {/* Enroll button (students only) */}
          {onEnroll && (
            <button
              onClick={handleEnrollClick}
              disabled={isEnrolled || enrolling}
              style={{
                padding: '5px 14px', borderRadius: 8,
                border: isEnrolled ? `1px solid ${t.borderStr}` : 'none',
                background: isEnrolled ? t.subtle : enrolling ? t.cyanDim
                  : `linear-gradient(135deg, ${t.cyan}, ${t.isDark ? '#06b6d4' : '#0284c7'})`,
                color: isEnrolled ? t.textSec : (t.isDark ? '#001a20' : '#fff'),
                fontSize: '0.75rem', fontWeight: 700,
                cursor: isEnrolled || enrolling ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s ease',
                boxShadow: isEnrolled ? 'none' : `0 3px 10px ${t.cyanGlow}`,
              }}
            >
              {isEnrolled ? <><CheckCircle2 size={12} />Enrolled</> : enrolling ? 'Enrolling…' : 'Enroll'}
            </button>
          )}

          {/* No action — just a view arrow */}
          {!onEnroll && !onAssign && !onUnassign && (
            <span style={{ fontSize: '0.75rem', color: t.textTer }}>View Details</span>
          )}

          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: hovered ? t.cyanDim : t.subtle,
            border: `1px solid ${hovered ? t.borderAcc : t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s ease',
          }}>
            <ChevronRight size={13} color={hovered ? t.cyan : t.textTer} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Link>
  );
};

// ── Create Course Modal ────────────────────────────────────────

interface CreateModalProps {
  open: boolean; onClose: () => void; onCreated: () => void;
  levels: Level[]; departments: Department[];
}

const CreateModal: React.FC<CreateModalProps> = ({ open, onClose, onCreated, levels, departments }) => {
  const t = useTokens();
  const [form, setForm] = useState({ code: '', title: '', semester: 'FIRST' as 'FIRST' | 'SECOND', level: '', department: '' });

  const handleCreate = async () => {
    try {
      await courseApi.create({
        code: form.code, title: form.title, semester: form.semester,
        level: parseInt(form.level, 10), department: parseInt(form.department, 10),
      });
      toast.success('Course created!');
      onClose(); onCreated();
      setForm({ code: '', title: '', semester: 'FIRST', level: '', department: '' });
    } catch (err: any) { toast.error(err.message || 'Failed to create course'); }
  };

  const valid = form.code && form.title && form.level && form.department;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: t.overlay, border: `1px solid ${t.border}`, borderRadius: 18, color: t.textPri, maxWidth: 440 }}>
        <DialogHeader>
          <DialogTitle style={{ fontWeight: 800, letterSpacing: '-0.02em', color: t.textPri }}>Create New Course</DialogTitle>
          <DialogDescription style={{ color: t.textSec }}>Add a new course to the platform</DialogDescription>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          {[
            { id: 'code',  label: 'Course Code *',  placeholder: 'e.g., EDA 106',        key: 'code'  as const },
            { id: 'title', label: 'Course Title *',  placeholder: 'e.g., Arts & Culture', key: 'title' as const },
          ].map(field => (
            <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textSec }}>{field.label}</label>
              <input placeholder={field.placeholder} value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })} className="aesa-input" />
            </div>
          ))}
          {[
            { label: 'Semester *', key: 'semester' as const, options: [{ value: 'FIRST', label: 'First Semester' }, { value: 'SECOND', label: 'Second Semester' }], placeholder: 'Select semester' },
            { label: 'Level *', key: 'level' as const, options: levels.map(l => ({ value: String(l.id), label: l.name })), placeholder: 'Select level' },
            { label: 'Department *', key: 'department' as const, options: departments.map(d => ({ value: String(d.id), label: d.name })), placeholder: 'Select department' },
          ].map(sel => (
            <div key={sel.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: t.textSec }}>{sel.label}</label>
              <Select value={form[sel.key]} onValueChange={v => setForm({ ...form, [sel.key]: v })}>
                <SelectTrigger style={{ borderRadius: 10 }}><SelectValue placeholder={sel.placeholder} /></SelectTrigger>
                <SelectContent>{sel.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter style={{ gap: 8 }}>
          <button onClick={onClose} className="aesa-btn aesa-btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={!valid} className="aesa-btn aesa-btn-primary"
            style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'default' }}>
            <Plus size={15} />Create Course
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Page ──────────────────────────────────────────────────

const CoursesPage: React.FC = () => {
  const { instructorProfile, studentProfile, user } = useAuth();
  const t = useTokens();

  const [courses,          setCourses]         = useState<Course[]>([]);
  const [departments,      setDepartments]      = useState<Department[]>([]);
  const [levels,           setLevels]           = useState<Level[]>([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | 'FIRST' | 'SECOND'>('ALL');
  const [selectedLevel,    setSelectedLevel]    = useState('');
  const [selectedDept,     setSelectedDept]     = useState('');
  const [enrolledIds,      setEnrolledIds]      = useState<Set<number>>(new Set());
  const [assignedIds,      setAssignedIds]      = useState<Set<number>>(new Set());
  const [createOpen,       setCreateOpen]       = useState(false);

  // Load assignment IDs once on mount (instructor only)
  const fetchAssignments = useCallback(async () => {
    if (!instructorProfile) return;
    try {
      const data = await fetch('/api/courses/my-assignments/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('aesa_access')}` },
      }).then(r => r.json());
      setAssignedIds(new Set((data as any[]).map((a: any) => a.course_id)));
    } catch { /* silent */ }
  }, [instructorProfile?.id]);

  const fetchCourses = useCallback(async () => {
    if (!selectedLevel || !selectedDept) return;
    setIsLoading(true);
    try {
      const raw = await courseApi.getByLevelAndDepartment(
        parseInt(selectedLevel, 10),
        parseInt(selectedDept, 10),
      );
      setCourses(raw);
    } catch { toast.error('Failed to load courses'); }
    finally  { setIsLoading(false); }
  }, [selectedLevel, selectedDept]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const [depts, lvls] = await Promise.all([departmentApi.getAll(), levelApi.getAll()]);
        setDepartments(depts);
        setLevels(lvls);

        if (studentProfile) {
          const enrollments = await enrollmentApi.getMyEnrollments();
          setEnrolledIds(new Set(enrollments.map((e: any) => e.course.id)));
        }

        if (instructorProfile) {
          const myDept = String(instructorProfile.department);
          setSelectedDept(myDept || (depts[0]?.id ? String(depts[0].id) : ''));
        } else {
          if (depts.length > 0) setSelectedDept(String(depts[0].id));
        }
        if (lvls.length > 0) setSelectedLevel(String(lvls[0].id));
      } catch { toast.error('Failed to load metadata'); }
      finally { setIsLoading(false); }
    };
    void init();
  }, [user?.id, studentProfile?.id, instructorProfile?.id]);

  useEffect(() => { void fetchAssignments(); }, [fetchAssignments]);

  useEffect(() => {
    if (user && selectedLevel && selectedDept) void fetchCourses();
  }, [user?.id, selectedLevel, selectedDept, fetchCourses]);

  const handleAssign = async (courseId: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/assign/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('aesa_access')}` },
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || 'Failed to assign');
      }
      setAssignedIds(prev => new Set([...prev, courseId]));
      toast.success('Course assigned to you!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUnassign = async (courseId: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/unassign/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('aesa_access')}` },
      });
      if (!res.ok) throw new Error('Failed to unassign');
      setAssignedIds(prev => { const s = new Set(prev); s.delete(courseId); return s; });
      toast.success('Course unassigned.');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleEnroll = async (id: number) => {
    try {
      await courseApi.enroll(id);
      setEnrolledIds(prev => new Set([...prev, id]));
      toast.success('Enrolled successfully!');
    } catch (err: any) { toast.error(err.message || 'Enroll failed'); }
  };

  const filtered = courses.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    const matchSem    = selectedSemester === 'ALL' || c.semester === selectedSemester;
    return matchSearch && matchSem;
  });

  const semTabs: { value: 'ALL' | 'FIRST' | 'SECOND'; label: string }[] = [
    { value: 'ALL',    label: 'All Courses'   },
    { value: 'FIRST',  label: '1st Semester'  },
    { value: 'SECOND', label: '2nd Semester'  },
  ];

  const filtersReady = selectedLevel && selectedDept;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.cyanDim, border: `1px solid ${t.borderAcc}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={17} color={t.cyan} strokeWidth={2} />
            </div>
            <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: t.textPri, letterSpacing: '-0.03em', lineHeight: 1 }}>Courses</h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: t.textSec }}>
            {instructorProfile
              ? 'Browse your department courses and manage assignments'
              : 'Browse and manage your academic courses'}
          </p>
        </div>
        {instructorProfile && (
          <button className="aesa-btn aesa-btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />New Course
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="animate-fade-up" style={{ background: t.raised, border: `1px solid ${t.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, animationDelay: '0.04s' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px', position: 'relative' }}>
            <Search size={15} color={t.textTer} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Search courses…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="aesa-input" style={{ paddingLeft: 36 }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textTer, display: 'flex', alignItems: 'center' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger style={{ borderRadius: 10, height: 40 }}><SelectValue placeholder="Select Level" /></SelectTrigger>
              <SelectContent>{levels.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div style={{ flex: '0 1 190px' }}>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger style={{ borderRadius: 10, height: 40 }}><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {!filtersReady && !isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: t.cyanDim, border: `1px solid ${t.borderAcc}` }}>
            <Info size={14} color={t.cyan} />
            <span style={{ fontSize: '0.8125rem', color: t.textSec }}>
              Select a <strong style={{ color: t.textPri }}>level</strong> and <strong style={{ color: t.textPri }}>department</strong> to browse courses.
            </span>
          </div>
        )}
      </div>

      {/* Semester tabs */}
      <div className="animate-fade-up" style={{ display: 'flex', gap: 4, padding: '4px', background: t.subtle, border: `1px solid ${t.border}`, borderRadius: 12, width: 'fit-content', animationDelay: '0.08s' }}>
        {semTabs.map(tab => (
          <button key={tab.value} onClick={() => setSelectedSemester(tab.value)}
            style={{
              padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: selectedSemester === tab.value ? 700 : 500,
              color: selectedSemester === tab.value ? t.cyan : t.textSec,
              background: selectedSemester === tab.value ? t.active : 'transparent',
              transition: 'all 0.15s ease', letterSpacing: '-0.01em',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} className="stagger">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} t={t} />)}
        </div>
      ) : !filtersReady ? (
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: t.cyanDim, border: `1px solid ${t.borderAcc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Layers size={28} color={t.cyan} strokeWidth={1.6} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: t.textPri, marginBottom: 6 }}>Choose your filters</h3>
          <p style={{ color: t.textSec, fontSize: '0.875rem' }}>Select a level and department above to see available courses.</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              isEnrolled={enrolledIds.has(course.id)}
              isAssigned={assignedIds.has(course.id)}
              onEnroll={studentProfile ? handleEnroll : undefined}
              onAssign={instructorProfile ? handleAssign : undefined}
              onUnassign={instructorProfile ? handleUnassign : undefined}
              style={{ animationFillMode: 'both' }}
            />
          ))}
        </div>
      ) : (
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: t.subtle, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BookOpen size={28} color={t.textTer} strokeWidth={1.6} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: t.textPri, marginBottom: 6 }}>No courses found</h3>
          <p style={{ color: t.textSec, fontSize: '0.875rem' }}>
            {searchQuery ? 'Try adjusting your search query' : 'No courses available for the selected filters'}
          </p>
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchCourses} levels={levels} departments={departments} />
    </div>
  );
};

export default CoursesPage;