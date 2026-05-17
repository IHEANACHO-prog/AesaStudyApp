// ============================================
// AESA — Sidebar Navigation
// PASTE TO: src/components/Sidebar.tsx
// ============================================
// CHANGES FROM ORIGINAL:
//  • Theme toggle replaced with pill (Sun | Moon both visible)
//  • Active side is highlighted, inactive is dimmed
//  • Smooth sliding indicator animation
//  • FIXED: INSTRUCTOR_NAV "Exams" path was '/courses' (duplicate) → now '/exams'
//  • RENAMED: All "Exam/Exams" labels → "Assessment/Assessments" (UI only, backend untouched)
// ============================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  GraduationCap, LogOut, LayoutDashboard, BookOpen,
  MessageSquare, User, TrendingUp, Shield, FileQuestion,
  ChevronRight, Sun, Moon,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

interface SidebarProps {
  isMobileOpen:    boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  label: string;
  path:  string;
  icon:  React.ElementType;
  badge?: string;
}

// ── Nav maps ───────────────────────────────────────────────────

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',   path: '/dashboard',   icon: LayoutDashboard },
  { label: 'Courses',     path: '/courses',     icon: BookOpen        },
  { label: 'Performance', path: '/performance', icon: TrendingUp      },
  { label: 'Forum',       path: '/forum',       icon: MessageSquare   },
  { label: 'Profile',     path: '/profile',     icon: User            },
];

const INSTRUCTOR_NAV: NavItem[] = [
  { label: 'Dashboard',   path: '/dashboard', icon: LayoutDashboard },
  { label: 'Courses',     path: '/courses',   icon: BookOpen        },
  { label: 'Assessments', path: '/exams',     icon: FileQuestion    }, // ← FIXED path + RENAMED label
  { label: 'Forum',       path: '/forum',     icon: MessageSquare   },
  { label: 'Profile',     path: '/profile',   icon: User            },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin',   path: '/admin',   icon: Shield        },
  { label: 'Courses', path: '/courses', icon: BookOpen      },
  { label: 'Forum',   path: '/forum',   icon: MessageSquare },
  { label: 'Profile', path: '/profile', icon: User          },
];

// ── Helpers ────────────────────────────────────────────────────

const getInitials = (f: string, l: string, u: string) =>
  f && l ? `${f[0]}${l[0]}`.toUpperCase() : u.slice(0, 2).toUpperCase();

const roleMeta: Record<string, { label: string; color: string; bg: string }> = {
  admin:      { label: 'Admin',      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  instructor: { label: 'Instructor', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  student:    { label: 'Student',    color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
};

// ── Theme Pill Toggle ──────────────────────────────────────────

const ThemePill: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  const pillBg      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const pillBorder  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const activeBg    = isDark ? 'rgba(34,211,238,0.15)'  : 'rgba(8,145,178,0.12)';
  const activeBorder= isDark ? 'rgba(34,211,238,0.35)'  : 'rgba(8,145,178,0.30)';
  const activeColor = isDark ? '#22d3ee'                : '#0891b2';
  const inactiveC   = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
  const labelColor  = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

  return (
    <div style={{ padding: '0 16px', paddingBottom: 10 }}>
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 12px',
          borderRadius:   10,
          background:     isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          border:         `1px solid ${pillBorder}`,
        }}
      >
        <span
          style={{
            fontSize:      '0.8125rem',
            fontWeight:    500,
            color:         labelColor,
            letterSpacing: '-0.01em',
          }}
        >
          Mode:
        </span>

        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          2,
            background:   pillBg,
            border:       `1px solid ${pillBorder}`,
            borderRadius: 999,
            padding:      3,
          }}
        >
          {/* ── Sun button ── */}
          <button
            onClick={() => isDark && toggleTheme()}
            title="Light mode"
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            5,
              padding:        '4px 11px',
              borderRadius:   999,
              border:         !isDark ? `1px solid ${activeBorder}` : '1px solid transparent',
              background:     !isDark ? activeBg : 'transparent',
              color:          !isDark ? activeColor : inactiveC,
              fontSize:       '0.75rem',
              fontWeight:     !isDark ? 700 : 500,
              cursor:         isDark ? 'pointer' : 'default',
              transition:     'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              whiteSpace:     'nowrap',
            }}
          >
            <Sun  size={12} strokeWidth={!isDark ? 2.4 : 1.8} />
            Sun
          </button>

          {/* ── Moon button ── */}
          <button
            onClick={() => !isDark && toggleTheme()}
            title="Dark mode"
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            5,
              padding:        '4px 11px',
              borderRadius:   999,
              border:         isDark ? `1px solid ${activeBorder}` : '1px solid transparent',
              background:     isDark ? activeBg : 'transparent',
              color:          isDark ? activeColor : inactiveC,
              fontSize:       '0.75rem',
              fontWeight:     isDark ? 700 : 500,
              cursor:         !isDark ? 'pointer' : 'default',
              transition:     'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              whiteSpace:     'nowrap',
            }}
          >
            <Moon size={12} strokeWidth={isDark ? 2.4 : 1.8} />
            Moon
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sidebar content ────────────────────────────────────────────

const SidebarContent: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { user, logout, isInstructor, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const navItems = isAdmin ? ADMIN_NAV : isInstructor ? INSTRUCTOR_NAV : STUDENT_NAV;
  const homePath = isAdmin ? '/admin' : '/dashboard';
  const role     = roleMeta[user.role] ?? roleMeta.student;

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const bg          = isDark ? 'var(--sidebar-bg)' : '#ffffff';
  const borderColor = isDark ? 'var(--border-faint)' : 'rgba(0,0,0,0.06)';
  const textPri     = isDark ? 'var(--text-primary)'   : '#0a101e';
  const textSec     = isDark ? 'var(--text-secondary)' : '#52637a';
  const textTer     = isDark ? 'var(--text-tertiary)'  : '#9badbe';
  const surfaceSub  = isDark ? 'var(--bg-subtle)' : 'rgba(0,0,0,0.04)';
  const surfaceHov  = isDark ? 'var(--bg-hover)'  : 'rgba(0,0,0,0.06)';
  const accentColor = isDark ? '#22d3ee' : '#0891b2';

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ background: bg, borderRight: `1px solid ${borderColor}` }}
    >
      {/* ── Logo ── */}
      <div className="px-4 pt-6 pb-5">
        <Link
          to={homePath}
          onClick={onNavigate}
          className="flex items-center gap-3 group"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              width: 38, height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(34,211,238,0.30)',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '1.125rem',
                letterSpacing: '-0.04em',
                color: textPri,
                lineHeight: 1,
              }}
            >
              AESA
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: textTer,
                marginTop: 2,
              }}
            >
              {isAdmin ? 'Admin Panel' : isInstructor ? 'Instructor' : 'Student Portal'}
            </div>
          </div>
        </Link>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: borderColor, marginBottom: 8 }} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar">
        <div
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: textTer,
            padding: '4px 8px 6px',
          }}
        >
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={`${item.label}-${item.path}`}
              to={item.path}
              onClick={onNavigate}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="group"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  marginBottom: 2,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: active
                    ? (isDark ? 'rgba(34,211,238,0.09)' : 'rgba(8,145,178,0.07)')
                    : 'transparent',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = surfaceHov;
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Active bar */}
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '55%',
                      background: accentColor,
                      borderRadius: '0 3px 3px 0',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32, height: 32,
                      borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: active
                        ? (isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.12)')
                        : surfaceSub,
                      border: `1px solid ${active
                        ? (isDark ? 'rgba(34,211,238,0.25)' : 'rgba(8,145,178,0.20)')
                        : borderColor}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={active ? 2.2 : 1.8}
                      color={active ? accentColor : textSec}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 450,
                      color: active ? (isDark ? '#f0f4ff' : '#0a101e') : textSec,
                      letterSpacing: '-0.01em',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                {active && (
                  <ChevronRight size={12} color={accentColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: borderColor }} />

      {/* ── Theme Pill Toggle ── */}
      <div style={{ paddingTop: 10 }}>
        <ThemePill />
      </div>

      {/* ── User card ── */}
      <div className="px-3 pb-4">
        <div
          style={{
            borderRadius: 12,
            background: isDark
              ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.015) 100%)',
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <Link to="/profile" onClick={onNavigate} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 12px 10px',
                transition: 'opacity 0.15s ease',
              }}
            >
              <Avatar
                style={{
                  width: 36, height: 36,
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                  flexShrink: 0,
                }}
              >
                <AvatarImage src={user.profile_picture ?? undefined} alt={user.username} />
                <AvatarFallback
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #6366f1)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  {getInitials(user.first_name, user.last_name, user.username)}
                </AvatarFallback>
              </Avatar>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: textPri,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                </div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: textTer,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  @{user.username}
                </div>
              </div>

              {/* Role badge */}
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: role.bg,
                  color: role.color,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  border: `1px solid ${role.color}30`,
                }}
              >
                {role.label}
              </div>
            </div>
          </Link>

          {/* Divider */}
          <div style={{ height: 1, background: borderColor, margin: '0 12px' }} />

          {/* Sign out */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: textTer,
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'color 0.15s ease',
              borderRadius: '0 0 12px 12px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = textTer; }}
          >
            <LogOut size={14} strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main export ─────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const close = () => setIsMobileOpen(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 252px)' }}
      >
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed top-0 left-0 z-50 h-full flex flex-col lg:hidden"
        style={{
          width: 270,
          transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <SidebarContent onNavigate={close} />
      </aside>
    </>
  );
};

export default Sidebar;