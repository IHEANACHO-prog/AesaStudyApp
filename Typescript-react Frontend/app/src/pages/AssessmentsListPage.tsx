// ============================================
// AESA — Assessments Page
// PASTE TO: src/pages/AssessmentsListPage.tsx
// ============================================
//
// Shows ALL courses across all levels in the instructor's department.
// No instructor filtering — every course in the dept is shown.
// Clicking a card navigates to /courses/:courseId/exam-manage?level=&dept=
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { examApi, levelApi, departmentApi, courseApi } from '@/api/client';
import api from '@/api/client';
import {
  ClipboardList, FileQuestion, RefreshCw,
  BookOpen, ChevronRight, Settings,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

interface CourseCard {
  courseId:    number;
  courseCode:  string;
  courseTitle: string;
  semester:    string;
  levelName:   string;
  deptName:    string;
  levelId:     number;
  deptId:      number;
  examCount:   number;
}

// ── Helpers ────────────────────────────────────────────────────

const extractId = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val, 10) || 0;
  if (typeof val === 'object' && val !== null) {
    if ('id' in val) return typeof val.id === 'number' ? val.id : parseInt(val.id, 10) || 0;
    if ('pk' in val) return typeof val.pk === 'number' ? val.pk : parseInt(val.pk, 10) || 0;
  }
  return 0;
};

const extractStr = (val: any, fallback = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) return val.name ?? val.title ?? fallback;
  return fallback;
};

const semesterLabel = (s: string) => {
  if (!s) return '';
  if (s.includes('1') || s.toLowerCase().includes('first'))  return '1ST SEM';
  if (s.includes('2') || s.toLowerCase().includes('second')) return '2ND SEM';
  return s.toUpperCase();
};

const semesterColors = (s: string, isDark: boolean) => {
  const is1st = s.includes('1') || s.toLowerCase().includes('first');
  if (isDark) return { bg: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.10)' };
  return is1st
    ? { bg: '#e0f7fa', text: '#0891b2', border: '#b2ebf2' }
    : { bg: '#e8f5e9', text: '#16a34a', border: '#c8e6c9' };
};

// ── Component ──────────────────────────────────────────────────

const AssessmentsListPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { isDark }            = useTheme();
  const navigate              = useNavigate();

  // ── Palette ────────────────────────────────────────────────
  const bg          = isDark ? '#0d1117' : '#f4f6fb';
  const cardBg      = isDark ? '#161b22' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textPri     = isDark ? '#f0f4ff' : '#0a101e';
  const textSec     = isDark ? 'rgba(255,255,255,0.55)' : '#52637a';
  const textTer     = isDark ? 'rgba(255,255,255,0.30)' : '#9badbe';
  const accentColor = isDark ? '#22d3ee' : '#0891b2';
  const accentBg    = isDark ? 'rgba(34,211,238,0.10)' : 'rgba(8,145,178,0.08)';
  const accentBdr   = isDark ? 'rgba(34,211,238,0.20)' : 'rgba(8,145,178,0.15)';
  const hoverShadow = isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.10)';

  // ── Navigate to ExamManagePage ─────────────────────────────
  const goToManage = (c: CourseCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/courses/${c.courseId}/exam-manage?level=${c.levelId}&dept=${c.deptId}`);
  };

  // ── Fetch ALL courses in the instructor's department ───────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get instructor profile to find their department
      const profile = await api.auth.getCurrentUser();

      // Determine the instructor's department id
      const deptRaw = profile?.department ?? profile?.department_detail ?? profile?.dept ?? null;
      const instrDeptId = deptRaw ? extractId(deptRaw) : 0;

      // Fetch all levels and all departments
      const [levels, departments] = await Promise.all([
        levelApi.getAll(),
        departmentApi.getAll(),
      ]);

      // Determine which departments to scan:
      // If we know the instructor's dept, scan only that; otherwise scan all
      const deptsToScan = instrDeptId
        ? departments.filter(d => extractId(d) === instrDeptId)
        : departments;

      // If we still have no dept match (profile didn't expose it), scan all depts
      const finalDepts = deptsToScan.length > 0 ? deptsToScan : departments;

      // Fetch every level × dept combo in parallel
      const combos = await Promise.allSettled(
        levels.flatMap(lv =>
          finalDepts.map(dp =>
            courseApi.getByLevelAndDepartment(extractId(lv), extractId(dp))
              .then(list => list.map(c => ({
                ...c,
                _levelId:   extractId(lv),
                _deptId:    extractId(dp),
                _levelName: extractStr(lv),
                _deptName:  extractStr(dp),
              }))),
          ),
        ),
      );

      const all = combos
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Deduplicate by course id
      const seen = new Set<number>();
      const unique = all.filter(c => {
        const id = extractId(c.id ?? c.course_id ?? c.pk);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Sort by level then course code
      unique.sort((a, b) => {
        const lvDiff = (a._levelId ?? 0) - (b._levelId ?? 0);
        if (lvDiff !== 0) return lvDiff;
        return (a.code ?? '').localeCompare(b.code ?? '');
      });

      if (unique.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Fetch exam counts for all courses in parallel
      const results = await Promise.all(
        unique.map(async (c: any) => {
          const courseId    = extractId(c.id ?? c.course_id ?? c.pk ?? 0);
          const courseCode  = c.code  ?? c.course_code  ?? '';
          const courseTitle = c.title ?? c.course_title ?? c.name ?? `Course ${courseId}`;
          const semester    = c.semester ?? c.semester_name ?? '';
          const levelId     = c._levelId   ?? extractId(c.level      ?? c.level_id      ?? 0);
          const deptId      = c._deptId    ?? extractId(c.department ?? c.department_id ?? 0);
          const levelName   = c._levelName ?? extractStr(c.level_detail      ?? c.level,       '');
          const deptName    = c._deptName  ?? extractStr(c.department_detail ?? c.department,  '');

          if (!courseId) return null;

          let examCount = 0;
          try {
            const exams = await examApi.getByCourse(courseId);
            examCount = Array.isArray(exams) ? exams.length : 0;
          } catch { /* non-fatal */ }

          return {
            courseId, courseCode, courseTitle, semester,
            levelName, deptName, levelId, deptId, examCount,
          } as CourseCard;
        }),
      );

      setCourses(results.filter((r): r is CourseCard => r !== null));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: bg,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36,
            border: `3px solid ${accentColor}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ color: textSec, fontSize: '0.875rem' }}>Loading courses…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{
          background: isDark ? 'rgba(248,113,113,0.10)' : 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12,
          padding: '16px 20px', color: '#f87171', fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>{error}</span>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.30)',
            color: '#f87171', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', minHeight: '100vh', background: bg }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: accentBg,
            border: `1px solid ${accentBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={18} color={accentColor} strokeWidth={2} />
          </div>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800, color: textPri,
            letterSpacing: '-0.03em', margin: 0,
          }}>
            Assessments
          </h1>
        </div>
        <p style={{ color: textSec, fontSize: '0.875rem', margin: 0 }}>
          {courses.length === 0
            ? 'No courses found'
            : `${courses.length} course${courses.length !== 1 ? 's' : ''} — select one to manage its assessments`}
        </p>
      </div>

      {/* ── Empty state ── */}
      {courses.length === 0 ? (
        <div style={{
          background: cardBg, border: `1px solid ${borderColor}`,
          borderRadius: 16, padding: '56px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: accentBg,
            border: `1px solid ${accentBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <FileQuestion size={28} color={accentColor} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: textPri, margin: '0 0 8px' }}>
            No courses found
          </h3>
          <p style={{ color: textSec, fontSize: '0.875rem', margin: 0 }}>
            No courses have been created yet. Ask your admin to add courses.
          </p>
        </div>

      ) : (

        /* ── Course grid ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {courses.map(course => {
            const semLabel  = semesterLabel(course.semester);
            const semColors = semesterColors(course.semester, isDark);

            return (
              <div
                key={course.courseId}
                onClick={() => goToManage(course)}
                style={{
                  background: cardBg, border: `1px solid ${borderColor}`,
                  borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = hoverShadow;
                  (e.currentTarget as HTMLElement).style.transform  = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform  = 'translateY(0)';
                }}
              >
                {/* Card body */}
                <div style={{ padding: '20px 20px 16px', flex: 1 }}>

                  {/* Icon + badges */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', marginBottom: 14,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: accentBg,
                      border: `1px solid ${accentBdr}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <BookOpen size={18} color={accentColor} strokeWidth={2} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Exam count badge */}
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                        background: course.examCount > 0
                          ? accentBg
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        color: course.examCount > 0 ? accentColor : textTer,
                        border: `1px solid ${course.examCount > 0 ? accentBdr : borderColor}`,
                      }}>
                        {course.examCount > 0
                          ? `${course.examCount} exam${course.examCount !== 1 ? 's' : ''}`
                          : 'No exams'}
                      </span>

                      {/* Semester badge */}
                      {semLabel && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em',
                          padding: '3px 10px', borderRadius: 999,
                          background: semColors.bg, color: semColors.text,
                          border: `1px solid ${semColors.border}`,
                        }}>
                          {semLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course code */}
                  <h3 style={{
                    fontSize: '1.0625rem', fontWeight: 800, color: textPri,
                    margin: '0 0 4px', letterSpacing: '-0.01em',
                  }}>
                    {course.courseCode}
                  </h3>

                  {/* Course title */}
                  <p style={{
                    fontSize: '0.8125rem', fontWeight: 500, color: textSec,
                    margin: '0 0 14px', textTransform: 'uppercase',
                    letterSpacing: '0.04em', lineHeight: 1.4,
                  }}>
                    {course.courseTitle}
                  </p>

                  {/* Level + dept */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {course.levelName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: textSec }}>
                        <span style={{ fontSize: '0.85rem' }}>🎓</span> {course.levelName}
                      </div>
                    )}
                    {course.deptName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: textSec }}>
                        <span style={{ fontSize: '0.85rem' }}>🏛️</span> {course.deptName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div style={{
                  borderTop: `1px solid ${borderColor}`,
                  padding: '12px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <button
                    onClick={e => goToManage(course, e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: '0.8125rem', fontWeight: 600, color: accentColor,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <Settings size={14} strokeWidth={2.2} />
                    Manage Assessments
                  </button>
                  <ChevronRight size={16} color={textTer} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssessmentsListPage;