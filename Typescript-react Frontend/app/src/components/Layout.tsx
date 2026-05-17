// ============================================
// AESA — Layout (World-Class)
// PASTE TO: src/components/Layout.tsx
// ============================================

import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/Sidebar';
import { GraduationCap, Menu, Bell, Search } from 'lucide-react';

// ── Route guard ────────────────────────────────────────────────

const RouteGuard: React.FC = () => {
  const { user }    = useAuth();
  const location    = useLocation();
  if (!user) return null;

  const path        = location.pathname;
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  if (user.role === 'admin' && !isAdminPath && !path.startsWith('/profile'))
    return <Navigate to="/admin" replace />;
  if (user.role !== 'admin' && isAdminPath)
    return <Navigate to="/dashboard" replace />;
  return null;
};

// ── Mobile header ──────────────────────────────────────────────

const MobileHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { isDark } = useTheme();

  const bg     = isDark ? 'rgba(7,9,15,0.92)'  : 'rgba(255,255,255,0.92)';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const btnBg  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const iconC  = isDark ? '#6b7fa3' : '#64748b';
  const textC  = isDark ? '#f0f4ff' : '#0a101e';

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
      style={{
        background: bg,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32, height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(34,211,238,0.28)',
          }}
        >
          <GraduationCap size={16} color="#fff" strokeWidth={2.2} />
        </div>
        <div>
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: '1.0625rem',
              letterSpacing: '-0.04em',
              color: textC,
            }}
          >
            AESA
          </span>
          <span
            style={{
              fontSize: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isDark ? '#2e3f57' : '#94a3b8',
              marginLeft: 6,
            }}
          >
            Study
          </span>
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Notification bell (decorative for now) */}
        <button
          style={{
            width: 34, height: 34,
            borderRadius: 9,
            border: `1px solid ${border}`,
            background: btnBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Notifications"
        >
          <Bell size={15} color={iconC} strokeWidth={1.8} />
        </button>

        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          style={{
            width: 34, height: 34,
            borderRadius: 9,
            border: `1px solid ${border}`,
            background: btnBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          aria-label="Open navigation"
        >
          <Menu size={15} color={iconC} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

// ── Page content wrapper with subtle transition ────────────────

const PageContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      style={{
        animation: 'fadeUp 0.28s ease both',
        minHeight: '100%',
      }}
    >
      {children}
    </div>
  );
};

// ── Loading screen ─────────────────────────────────────────────

const LoadingScreen: React.FC = () => {
  const { isDark } = useTheme();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#07090f' : '#f4f6fb',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Animated logo */}
      <div
        style={{
          width: 48, height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(34,211,238,0.28)',
          animation: 'pulse-cyan 2s ease-in-out infinite',
        }}
      >
        <GraduationCap size={24} color="#fff" strokeWidth={2} />
      </div>

      {/* Spinner */}
      <div
        style={{
          width: 28, height: 28,
          border: `2px solid rgba(34,211,238,0.15)`,
          borderTop: `2px solid #22d3ee`,
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />

      <p
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: isDark ? '#4a5568' : '#94a3b8',
          letterSpacing: '0.02em',
        }}
      >
        Loading AESA…
      </p>
    </div>
  );
};

// ── Layout ─────────────────────────────────────────────────────

const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: isDark ? '#07090f' : '#f4f6fb',
      }}
    >
      <RouteGuard />

      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />

        {/* Page area */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            paddingTop: 0,
          }}
        >
          {/* Inner padding: accounts for mobile header height */}
          <div
            style={{
              paddingTop: 'clamp(56px, 5vw, 56px)',
              paddingBottom: '2rem',
              paddingLeft:  'clamp(1rem, 3vw, 2.5rem)',
              paddingRight: 'clamp(1rem, 3vw, 2.5rem)',
              maxWidth: 1280,
            }}
            className="lg:pt-10"
          >
            <PageContent>
              <Outlet />
            </PageContent>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;