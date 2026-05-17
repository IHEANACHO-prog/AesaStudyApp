// ============================================
// usePageTheme — Design token hook
// PASTE TO: src/hooks/usePageTheme.ts
// ============================================
//
// Reads isDark directly from ThemeContext (ThemeContext.tsx)
// which sets both data-theme and class="dark|light" on <html>.
//
// Returns a flat token object used by:
//   • CourseDetailPage.tsx
//   • TopicDetailPage.tsx
// ============================================

import { useTheme } from '@/contexts/ThemeContext';

// ── Token shape ───────────────────────────────────────────────────────────────

export interface PageTheme {
  isDark: boolean;

  // Page / surface backgrounds
  pageBg:     string;   // outermost page background
  cardBg:     string;   // card / panel background
  inputBg:    string;   // input fields, inner wells, tab bars
  cardBorder: string;   // subtle card border

  // Border colours
  border:     string;   // default border
  borderAcc:  string;   // cyan/accent border

  // Text colours
  textPri:    string;   // primary / heading text
  textSec:    string;   // secondary / body text
  textTer:    string;   // tertiary / muted text

  // Cyan accent (primary brand colour)
  cyan:       string;   // solid cyan for icons, text
  cyanDim:    string;   // semi-transparent cyan background

  // Ambient glow colours for background blobs
  glow1:      string;   // top-right blob
  glow2:      string;   // bottom-left blob

  // Box shadow
  shadow:     string;
}

// ── Token maps ────────────────────────────────────────────────────────────────

const DARK: PageTheme = {
  isDark:     true,

  pageBg:     '#070c18',
  cardBg:     'rgba(255,255,255,0.018)',
  inputBg:    'rgba(255,255,255,0.035)',
  cardBorder: 'rgba(255,255,255,0.07)',

  border:     'rgba(255,255,255,0.07)',
  borderAcc:  'rgba(34,211,238,0.25)',

  textPri:    '#e2e8f0',
  textSec:    '#94a3b8',
  textTer:    '#475569',

  cyan:       '#22d3ee',
  cyanDim:    'rgba(34,211,238,0.1)',

  glow1:      'rgba(34,211,238,0.05)',
  glow2:      'rgba(139,92,246,0.05)',

  shadow:     '0 4px 32px rgba(0,0,0,0.5)',
};

const LIGHT: PageTheme = {
  isDark:     false,

  pageBg:     '#f1f5f9',
  cardBg:     '#ffffff',
  inputBg:    '#f8fafc',
  cardBorder: '#e2e8f0',

  border:     '#e2e8f0',
  borderAcc:  'rgba(8,145,178,0.3)',

  textPri:    '#0f172a',
  textSec:    '#475569',
  textTer:    '#94a3b8',

  cyan:       '#0891b2',
  cyanDim:    'rgba(8,145,178,0.08)',

  glow1:      'rgba(8,145,178,0.07)',
  glow2:      'rgba(99,102,241,0.06)',

  shadow:     '0 2px 16px rgba(15,23,42,0.08)',
};

// ── Hook ─────────────────────────────────────────────────────

export function usePageTheme(): PageTheme {
  const { isDark } = useTheme();
  return isDark ? DARK : LIGHT;
}