// ============================================
// ForumPage — Bug #9 Fixed (jargon → plain copy)
// PASTE TO: src/pages/ForumPage.tsx
// ============================================
//
// BUG-9 FIX: All technical jargon replaced with plain, student-friendly copy:
//   "No conversation nodes detected"        → "No discussions yet"
//   "Select a course above or adjust your search to browse the inquiry index."
//                                           → "Select a course above, or try a different search."
//   "Debate complex curricula blocks and share inquiries."
//                                           → "Ask questions, share knowledge, and get help from peers."
//   "Query keyword tokens across thread nodes..."  → "Search discussions…"
//   "Faculty Department"                    → "Department"
//   "Syllabus Focus"                        → "Course"
//   "Academic Level"                        → "Level"
//   "Dispatch Inquiry Node"                 → "New Discussion"
//   "Granular Details"                      → "Details"
//   "Explicate your variables..."           → "Describe your question…"
//   "Commit Discussion"                     → "Post Discussion"
//   "Discussion dispatched"                 → "Discussion posted!"
//   "Transmission failed"                   → "Failed to post. Please try again."
//   "Failed to index courses"               → "Failed to load courses"
//   "Discussion sync failed"                → "Failed to load discussions"
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { forumApi, courseApi, departmentApi, levelApi } from '@/api/client';
import { useTheme } from '@/contexts/ThemeContext';
import type { ForumPost, Course, Department, Level } from '@/types';

import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import {
  MessageSquare, Search, User, Clock,
  ChevronRight, BookOpen, Building2, Layers,
  Flame, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const useTokens = () => {
  const { isDark } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: {
      canvas:   isDark ? '#07090f' : 'transparent',
      surface:  isDark ? '#0f131a' : '#ffffff',
      elevated: isDark ? '#161b24' : '#f8fafc',
      subtle:   isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      brand:    isDark
        ? 'linear-gradient(135deg, #d97706, #b45309)'
        : 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    border: {
      subtle: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      active: isDark ? 'rgba(217, 119, 6, 0.4)' : 'rgba(217, 119, 6, 0.3)',
    },
    text: {
      primary:   isDark ? '#f4f6fb' : '#0a101e',
      secondary: isDark ? '#94a3b8' : '#52637a',
      muted:     isDark ? '#64748b' : '#9badbe',
      accent:    '#d97706',
    },
    shadow: isDark
      ? '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 4px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
    fonts: { main: "'DM Sans', sans-serif" },
    hues: isDark
      ? ['linear-gradient(to bottom, #d97706, #78350f)', 'linear-gradient(to bottom, #0891b2, #0e7490)']
      : ['linear-gradient(to bottom, #f59e0b, #d97706)', 'linear-gradient(to bottom, #0ea5e9, #0284c7)'],
  }), [isDark]);
};

const getInitials = (first: string, last: string, username: string) => {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// ── ForumPage Component ───────────────────────────────────────────────────────
const ForumPage: React.FC = () => {
  const t = useTokens();
  const [mounted, setMounted] = useState(false);

  const [posts,       setPosts]       = useState<ForumPost[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels,      setLevels]      = useState<Level[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);

  const [selectedLevel,      setSelectedLevel]      = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse,     setSelectedCourse]     = useState('');

  const [isLoading,    setIsLoading]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPost,      setNewPost]      = useState({ title: '', body: '' });
  const [hoveredId,    setHoveredId]    = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [depts, lvls] = await Promise.all([departmentApi.getAll(), levelApi.getAll()]);
        setDepartments(depts);
        setLevels(lvls);
        if (depts.length > 0) setSelectedDepartment(depts[0].id.toString());
        if (lvls.length > 0)  setSelectedLevel(lvls[0].id.toString());
      } catch {
        toast.error('Failed to load filters');
      }
    };
    loadMetadata();
  }, []);

  // Load courses when level/dept changes
  useEffect(() => {
    if (!selectedLevel || !selectedDepartment) return;
    setSelectedCourse('');
    setCourses([]);
    courseApi
      .getByLevelAndDepartment(parseInt(selectedLevel, 10), parseInt(selectedDepartment, 10))
      .then(setCourses)
      .catch(() => toast.error('Failed to load courses')); // BUG-9 FIX: plain copy
  }, [selectedLevel, selectedDepartment]);

  const loadPosts = useCallback(async () => {
    if (!selectedCourse) { setPosts([]); return; }
    setIsLoading(true);
    try {
      const data = await forumApi.getQuestions(parseInt(selectedCourse, 10));
      setPosts(data);
    } catch {
      toast.error('Failed to load discussions'); // BUG-9 FIX: plain copy
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.body.trim()) return;
    setIsSubmitting(true);
    try {
      await forumApi.createQuestion(parseInt(selectedCourse, 10), newPost);
      toast.success('Discussion posted!'); // BUG-9 FIX
      setIsCreateOpen(false);
      setNewPost({ title: '', body: '' });
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post. Please try again.'); // BUG-9 FIX
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.body.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div style={{
      maxWidth: 880, margin: '0 auto', padding: '0 0 100px',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease',
      fontFamily: t.fonts.main,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        .forum-select:focus { border-color: ${t.text.accent} !important; box-shadow: 0 0 0 2px ${t.text.accent}22; }
      `}</style>

      {/* Masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: t.bg.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: t.isDark ? '0 8px 20px rgba(217,119,6,0.3)' : 'none',
          }}>
            <MessageSquare size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '2.2rem', color: t.text.primary, margin: 0, fontWeight: 700, letterSpacing: '-0.03em' }}>
              Academic Forum
            </h1>
            {/* BUG-9 FIX: plain subtitle */}
            <p style={{ fontSize: '0.9rem', color: t.text.secondary, margin: 0 }}>
              Ask questions, share knowledge, and get help from peers.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          disabled={!selectedCourse}
          style={{
            padding: '12px 24px', borderRadius: 12, border: 'none', background: t.bg.brand,
            color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: selectedCourse ? 1 : 0.5,
            transition: 'all 0.2s ease', fontFamily: t.fonts.main,
          }}
        >
          + New Discussion
        </button>
      </div>

      {/* Filter Grid — BUG-9 FIX: plain filter labels */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
        padding: 24, background: t.bg.surface, borderRadius: 20,
        border: `1px solid ${t.border.subtle}`, boxShadow: t.shadow, marginBottom: 20,
      }}>
        {[
          { label: 'Level',      val: selectedLevel,      set: setSelectedLevel,      items: levels,      icon: <Layers    size={12}/> },
          { label: 'Department', val: selectedDepartment, set: setSelectedDepartment, items: departments, icon: <Building2 size={12}/> },
          { label: 'Course',     val: selectedCourse,     set: setSelectedCourse,     items: courses,     icon: <BookOpen  size={12}/> },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.icon} {f.label}
            </label>
            <select
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="forum-select"
              style={{
                height: 42, borderRadius: 10, border: `1px solid ${t.border.subtle}`,
                background: t.bg.elevated, color: t.text.primary, padding: '0 12px',
                outline: 'none', cursor: 'pointer', fontFamily: t.fonts.main, transition: 'all 0.2s',
              }}
            >
              <option value="">Select {f.label}…</option>
              {f.items.map((item: any) => (
                <option key={item.id} value={item.id.toString()} style={{ background: t.bg.surface }}>
                  {item.code ? `${item.code}: ${item.title}` : item.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Search Bar — BUG-9 FIX: plain placeholder */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: t.text.muted }} />
        <input
          placeholder="Search discussions…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', height: 52, padding: '0 52px', borderRadius: 14,
            background: t.bg.surface, border: `1px solid ${t.border.subtle}`,
            color: t.text.primary, outline: 'none', fontSize: '0.95rem',
            boxShadow: t.shadow, fontFamily: t.fonts.main,
          }}
        />
        {searchQuery && (
          <X
            size={16}
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: t.text.muted }}
          />
        )}
      </div>

      {/* Discussion List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 120, borderRadius: 18, background: t.bg.surface }} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((post, idx) => {
            const isHovered = hoveredId === post.id;
            const accent    = t.hues[idx % t.hues.length];
            return (
              <Link
                key={post.id}
                to={`/forum/${selectedCourse}/${post.id}`}
                onMouseEnter={() => setHoveredId(post.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex', padding: 24, background: t.bg.surface,
                  border: `1px solid ${isHovered ? t.border.active : t.border.subtle}`,
                  borderRadius: 18, textDecoration: 'none', position: 'relative',
                  boxShadow: isHovered ? t.shadow : 'none',
                  transform: isHovered ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent, opacity: isHovered ? 1 : 0.3 }} />
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, marginRight: 20,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0,
                }}>
                  {getInitials(post.user.first_name, post.user.last_name, post.user.username)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{
                      margin: 0, fontSize: '1.1rem', fontWeight: 600,
                      color: isHovered ? t.text.accent : t.text.primary,
                      transition: 'color 0.2s',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {post.title}
                    </h3>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '0.6rem', padding: '2px 8px', borderRadius: 99,
                        background: t.bg.subtle, color: t.text.accent,
                        border: `1px solid ${t.text.accent}44`, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                      }}>
                        <Flame size={10} /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: t.text.secondary, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {post.body}
                  </p>
                  <div style={{ display: 'flex', gap: 20, fontSize: '0.75rem', color: t.text.muted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User  size={13} color={t.text.accent} /> {post.user.username}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} /> {timeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} style={{
                  alignSelf: 'center', flexShrink: 0,
                  color: isHovered ? t.text.accent : t.text.muted,
                  transform: isHovered ? 'translateX(4px)' : 'none',
                  transition: 'all 0.2s',
                }} />
              </Link>
            );
          })}
        </div>
      ) : (
        // BUG-9 FIX: plain empty state copy
        <div style={{
          textAlign: 'center', padding: '80px 20px', background: t.bg.surface,
          borderRadius: 24, border: `1px solid ${t.border.subtle}`, boxShadow: t.shadow,
        }}>
          <MessageSquare size={44} style={{ color: t.text.muted, marginBottom: 16, opacity: 0.5 }} />
          <h3 style={{ color: t.text.primary, margin: '0 0 8px', fontWeight: 600 }}>
            {selectedCourse ? 'No discussions yet' : 'Select a course to get started'}
          </h3>
          <p style={{ color: t.text.secondary, fontSize: '0.9rem', maxWidth: 300, margin: '0 auto' }}>
            {selectedCourse
              ? 'Be the first to start a discussion for this course.'
              : 'Select a course above, or try a different search.'}
          </p>
        </div>
      )}

      {/* Create Post Dialog — BUG-9 FIX: plain copy throughout */}
      <Dialog open={isCreateOpen} onOpenChange={v => !isSubmitting && setIsCreateOpen(v)}>
        <DialogContent style={{
          background: t.bg.surface, border: `1px solid ${t.border.subtle}`,
          borderRadius: 24, padding: 32, fontFamily: t.fonts.main,
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: t.text.primary, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
            New Discussion
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.text.muted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>
                Title
              </label>
              <input
                placeholder="What's your question or topic?"
                value={newPost.title}
                onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                style={{ width: '100%', padding: 14, borderRadius: 12, background: t.bg.elevated, border: `1px solid ${t.border.subtle}`, color: t.text.primary, outline: 'none', fontFamily: t.fonts.main }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.text.muted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>
                Details
              </label>
              <textarea
                placeholder="Describe your question…"
                value={newPost.body}
                onChange={e => setNewPost({ ...newPost, body: e.target.value })}
                style={{ width: '100%', padding: 14, borderRadius: 12, background: t.bg.elevated, border: `1px solid ${t.border.subtle}`, color: t.text.primary, outline: 'none', minHeight: 140, resize: 'none', fontFamily: t.fonts.main }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ padding: '10px 20px', borderRadius: 10, background: 'none', border: `1px solid ${t.border.subtle}`, color: t.text.secondary, cursor: 'pointer', fontFamily: t.fonts.main, fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={isSubmitting || !newPost.title.trim()}
                style={{ padding: '10px 24px', borderRadius: 10, background: t.bg.brand, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: t.fonts.main, opacity: isSubmitting || !newPost.title.trim() ? 0.6 : 1 }}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Post Discussion'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ForumPage;