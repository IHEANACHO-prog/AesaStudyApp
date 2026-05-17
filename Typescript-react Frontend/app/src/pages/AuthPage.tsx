// ============================================
// AESA Study Platform — Auth Page (Dark Theme — matches Dashboard)
// PASTE TO: src/pages/AuthPage.tsx
// ============================================
//
// ADMIN ACCESS POLICY
// ─────────────────────────────────────────────
// Admin (superuser) accounts are NOT self-registerable via this UI.
// The admin role is created exclusively via Django's createsuperuser command.
// Admin login still works through the standard Sign In tab — the login()
// call in handleLogin reads the returned role and routes to /admin as before.
// registerAdmin import is intentionally kept for potential server-side use.
//
// PUBLIC REGISTRATION: Student and Instructor only.
// ─────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { departmentApi, levelApi } from '@/api/client';
import type { Department, Level } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import {
  AlertCircle, Loader2, GraduationCap, User, Lock, Hash,
  Briefcase, Mail, Eye, EyeOff, CheckCircle2,
  ArrowRight, BookOpen, XCircle,
} from 'lucide-react';

// Admin is NOT a self-registerable role — superuser is created via Django CLI only.
type UserRole = 'student' | 'instructor';

// ── Validation helpers ────────────────────────────────────────────────────────

const validators = {
  username:  (v: string) => v.length < 3 ? 'At least 3 characters' : /\s/.test(v) ? 'No spaces allowed' : null,
  email:     (v: string) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email' : null,
  password:  (v: string) => v.length > 0 && v.length < 8 ? 'Minimum 8 characters' : null,
  idField:   (v: string) => v.length > 0 && v.trim().length < 5 ? 'At least 5 characters' : null,
  firstName: (v: string) => v.length > 0 && v.trim().length < 2 ? 'Too short' : null,
  lastName:  (v: string) => v.length > 0 && v.trim().length < 2 ? 'Too short' : null,
};

const passwordStrength = (p: string): { score: number; label: string; color: string } => {
  if (!p) return { score: 0, label: '', color: '' };
  let score = 0;
  if (p.length >= 8)  score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score: 1, label: 'Weak',       color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair',       color: '#f97316' };
  if (score === 3) return { score: 3, label: 'Good',       color: '#eab308' };
  if (score === 4) return { score: 4, label: 'Strong',     color: '#22c55e' };
  return              { score: 5, label: 'Very Strong',  color: '#06b6d4' };
};

// ── Background — deep navy matching the dashboard ─────────────────────────────

const Background: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    {/* Base: same deep navy as dashboard */}
    <div className="absolute inset-0" style={{ backgroundColor: '#0a0f1e' }} />
    {/* Subtle cyan glow top-right */}
    <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(0,188,212,0.08) 0%, transparent 70%)' }} />
    {/* Subtle blue glow bottom-left */}
    <div className="absolute -bottom-32 -left-16 w-[400px] h-[400px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(30,64,175,0.10) 0%, transparent 70%)' }} />
    {/* Subtle grid overlay matching dashboard */}
    <div className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `linear-gradient(rgba(0,188,212,0.6) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,188,212,0.6) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
  </div>
);

// ── Shared design tokens matching dashboard ───────────────────────────────────
// Card bg:      #0d1526 (same as dashboard sidebar)
// Input bg:     #111827
// Border:       rgba(255,255,255,0.07)
// Cyan accent:  #00bcd4 / #06b6d4
// Text primary: #e2e8f0

const CARD_BG     = '#0d1526';
const INPUT_BG    = '#111827';
const BORDER      = 'rgba(255,255,255,0.07)';
const CYAN        = '#06b6d4';
const CYAN_DIM    = 'rgba(6,182,212,0.12)';
const CYAN_BORDER = 'rgba(6,182,212,0.35)';

// ── Field label ───────────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <Label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
    {children}
    {required && <span style={{ color: CYAN, fontSize: '10px', fontWeight: 900 }}>*</span>}
  </Label>
);

// ── Inline validation ─────────────────────────────────────────────────────────

const FieldError: React.FC<{ message: string | null; touched: boolean }> = ({ message, touched }) => {
  if (!touched || !message) return null;
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
      <XCircle style={{ width: '12px', height: '12px', flexShrink: 0 }} />
      {message}
    </p>
  );
};

const FieldSuccess: React.FC<{ show: boolean; message?: string }> = ({ show, message = 'Looks good' }) => {
  if (!show) return null;
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
      <CheckCircle2 style={{ width: '12px', height: '12px', flexShrink: 0 }} />
      {message}
    </p>
  );
};

// ── Eye toggle ────────────────────────────────────────────────────────────────

const EyeToggle: React.FC<{ show: boolean; onToggle: () => void }> = ({ show, onToggle }) => (
  <button type="button" onClick={onToggle}
    style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
    {show ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
  </button>
);

// ── Password strength bar ─────────────────────────────────────────────────────

const StrengthBar: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = passwordStrength(password);
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: '3px', flex: 1, borderRadius: '99px', backgroundColor: i <= score ? color : 'rgba(255,255,255,0.07)', transition: 'background-color 0.3s' }} />
        ))}
      </div>
      <p style={{ fontSize: '11px', fontWeight: 700, color }}>{label}</p>
    </div>
  );
};

// ── Styled input with icon ────────────────────────────────────────────────────

const FieldInput: React.FC<{
  icon:          React.ElementType;
  type?:         string;
  placeholder:   string;
  value:         string;
  onChange:      (v: string) => void;
  onBlur?:       () => void;
  required?:     boolean;
  minLength?:    number;
  autoComplete?: string;
  rightSlot?:    React.ReactNode;
  status?:       'ok' | 'error' | 'none';
  disabled?:     boolean;
}> = ({
  icon: Icon, type = 'text', placeholder, value, onChange, onBlur,
  required, minLength, autoComplete, rightSlot, status = 'none', disabled,
}) => {
  const borderColor =
    status === 'ok'    ? 'rgba(52,211,153,0.45)' :
    status === 'error' ? 'rgba(248,113,113,0.45)' :
    BORDER;
  const bgColor =
    status === 'ok'    ? 'rgba(52,211,153,0.06)' :
    status === 'error' ? 'rgba(248,113,113,0.06)' :
    INPUT_BG;
  const iconColor =
    status === 'ok'    ? '#34d399' :
    status === 'error' ? '#f87171' :
    '#475569';

  return (
    <div style={{ position: 'relative' }}>
      <Icon style={{
        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
        width: '15px', height: '15px', color: iconColor, pointerEvents: 'none', zIndex: 1,
      }} />
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{
          width: '100%', height: '44px', paddingLeft: '42px', paddingRight: rightSlot ? '48px' : '14px',
          borderRadius: '10px', border: `1px solid ${borderColor}`, backgroundColor: bgColor,
          color: '#e2e8f0', fontSize: '14px', fontWeight: 600, outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.2s, background-color 0.2s',
          opacity: disabled ? 0.4 : 1,
        }}
        onFocus={e => { if (status === 'none') e.currentTarget.style.borderColor = CYAN_BORDER; }}
        onBlurCapture={e => { if (status === 'none') e.currentTarget.style.borderColor = BORDER; }}
      />
      {rightSlot && (
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1 }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, registerStudent, registerInstructor, registerAdmin, isAuthenticated, user } = useAuth();

  const [activeTab, setActiveTab]             = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole]       = useState<UserRole>('student');
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [departments, setDepartments]         = useState<Department[]>([]);
  const [levels, setLevels]                   = useState<Level[]>([]);
  const [isDataLoading, setIsDataLoading]     = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [commonData, setCommonData] = useState({
    username: '', password: '', first_name: '', last_name: '', email: '',
  });
  const [roleData, setRoleData] = useState({
    matric_number: '', staff_id: '', department: '', level: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = useCallback((field: string) => setTouched(p => ({ ...p, [field]: true })), []);
  const touchOnChange = useCallback((field: string, setter: (v: string) => void) =>
    (v: string) => { touch(field); setter(v); }, [touch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (activeTab !== 'register') return;
    const load = async () => {
      setIsDataLoading(true);
      setError(null);
      try {
        const [depts, lvls] = await Promise.all([departmentApi.getAll(), levelApi.getAll()]);
        setDepartments(depts);
        setLevels(lvls);
      } catch {
        setError('Cannot reach server. Is Django running on port 8000?');
      } finally {
        setIsDataLoading(false);
      }
    };
    load();
  }, [activeTab, registerRole]);

  const handleRoleChange = (v: UserRole) => {
    setRegisterRole(v);
    setError(null);
    setSuccess(null);
    setTouched({});
  };

  const handleTabChange = (v: string) => {
    setActiveTab(v as 'login' | 'register');
    setError(null);
    setSuccess(null);
    setTouched({});
  };

  const regErrors = {
    firstName: validators.firstName(commonData.first_name),
    lastName:  validators.lastName(commonData.last_name),
    username:  validators.username(commonData.username),
    email:     validators.email(commonData.email),
    password:  validators.password(commonData.password),
    confirm:   confirmPassword && commonData.password !== confirmPassword ? 'Passwords do not match' : null,
    idField:   registerRole === 'student'
                 ? validators.idField(roleData.matric_number)
                 : validators.idField(roleData.staff_id),
  };

  const isRegValid =
    !regErrors.firstName && !regErrors.lastName && !regErrors.username &&
    !regErrors.email && !regErrors.password && !regErrors.confirm && !regErrors.idField &&
    commonData.first_name.trim() !== '' && commonData.last_name.trim() !== '' &&
    commonData.username.trim() !== '' && commonData.email.trim() !== '' &&
    commonData.password.trim() !== '' && confirmPassword.trim() !== '' &&
    roleData.department !== '' && roleData.level !== '' &&
    (registerRole === 'student' ? roleData.matric_number.trim() !== '' : roleData.staff_id.trim() !== '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await login(loginData.username, loginData.password);
      navigate(res.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, username: true, email: true, password: true, confirm: true, idField: true });
    if (!isRegValid) { setError('Please fix the errors above before continuing.'); return; }
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const base = { ...commonData, department: parseInt(roleData.department, 10), level: parseInt(roleData.level, 10) };
      if (registerRole === 'student') {
        await registerStudent({ ...base, matric_number: roleData.matric_number.trim() });
      } else {
        await registerInstructor({ ...base, staff_id: roleData.staff_id.trim(), level: [parseInt(roleData.level, 10)] });
      }
      setSuccess('Account created successfully! Please sign in.');
      setActiveTab('login');
      setCommonData({ username: '', password: '', first_name: '', last_name: '', email: '' });
      setRoleData({ matric_number: '', staff_id: '', department: '', level: '' });
      setConfirmPassword('');
      setTouched({});
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const pwStrength     = passwordStrength(commonData.password);
  const passwordsMatch  = confirmPassword !== '' && commonData.password === confirmPassword;
  const confirmStatus   = confirmPassword === '' ? 'none' : passwordsMatch ? 'ok' : 'error';

  const roleConfig = [
    { id: 'student'    as UserRole, label: 'Student',    icon: GraduationCap, desc: 'Enrolled learner' },
    { id: 'instructor' as UserRole, label: 'Instructor',  icon: Briefcase,     desc: 'Course instructor' },
  ];

  // ── Shared select style matching dashboard ──────────────────────────────────
  const selectTriggerStyle: React.CSSProperties = {
    height: '44px', borderRadius: '10px', backgroundColor: INPUT_BG,
    border: `1px solid ${BORDER}`, color: '#e2e8f0', fontSize: '13px', fontWeight: 600,
  };

  return (
    <>
      <Background />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        .field-group { animation: fadeIn 0.2s ease; }
        input::placeholder { color: #334155 !important; }
        input:focus { border-color: ${CYAN_BORDER} !important; }
        /* Scrollbar matching dark theme */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.2); border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* ── Brand header ── */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            {/* Logo — matches dashboard icon style */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #0891b2 0%, #0ea5e9 50%, #2563eb 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(6,182,212,0.25), 0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <GraduationCap style={{ width: '36px', height: '36px', color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>AESA</h1>
              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, marginTop: '6px', letterSpacing: '0.03em' }}>
                Adaptive Learning &amp; Self‑Assessment Platform
              </p>
            </div>
            {/* Feature badges — matching dashboard pill style */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {['Smart Courses', 'Live Exams', 'Analytics'].map(f => (
                <span key={f} style={{
                  fontSize: '10px', fontWeight: 700, color: '#94a3b8',
                  border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '99px',
                  padding: '3px 12px', backgroundColor: 'rgba(255,255,255,0.03)', letterSpacing: '0.06em',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* ── Auth card — mirrors dashboard card style ── */}
          <div style={{
            borderRadius: '20px', border: `1px solid ${BORDER}`,
            backgroundColor: CARD_BG, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}>

            {/* Tab headers */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
              {[
                { value: 'login',    label: 'Sign In' },
                { value: 'register', label: 'Create Account' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  style={{
                    flex: 1, padding: '16px', fontSize: '13px', fontWeight: 800,
                    letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer',
                    color: activeTab === tab.value ? '#e2e8f0' : '#475569',
                    position: 'relative', transition: 'color 0.2s',
                  }}
                >
                  {tab.label}
                  {/* Active indicator — cyan line matching dashboard active states */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: '25%', right: '25%', height: '2px',
                    borderRadius: '99px',
                    background: `linear-gradient(90deg, ${CYAN}, #3b82f6)`,
                    opacity: activeTab === tab.value ? 1 : 0,
                    transform: activeTab === tab.value ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'opacity 0.3s, transform 0.3s',
                  }} />
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Alerts */}
              {error && (
                <div style={{
                  borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <AlertCircle style={{ width: '16px', height: '16px', color: '#f87171', flexShrink: 0 }} />
                  <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>{error}</span>
                </div>
              )}
              {success && (
                <div style={{
                  borderRadius: '10px', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px', color: '#34d399', flexShrink: 0 }} />
                  <span style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 600 }}>{success}</span>
                </div>
              )}

              {/* ─────────────────── SIGN IN ─────────────────── */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <FieldLabel required>Username</FieldLabel>
                    <FieldInput icon={User} placeholder="your_username"
                      value={loginData.username}
                      onChange={v => setLoginData(p => ({ ...p, username: v }))}
                      autoComplete="username" required />
                  </div>

                  <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <FieldLabel required>Password</FieldLabel>
                    <FieldInput icon={Lock} type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={v => setLoginData(p => ({ ...p, password: v }))}
                      autoComplete="current-password" required
                      rightSlot={<EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />} />
                  </div>

                  <button
                    disabled={isLoading} type="submit"
                    style={{
                      width: '100%', height: '46px', borderRadius: '10px',
                      background: isLoading ? 'rgba(6,182,212,0.4)' : `linear-gradient(135deg, #0891b2, #2563eb)`,
                      border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                      color: '#fff', fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      marginTop: '4px', boxShadow: '0 4px 20px rgba(6,182,212,0.2)',
                      transition: 'opacity 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {isLoading
                      ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />Signing in…</>
                      : <><span>Sign In</span><ArrowRight style={{ width: '16px', height: '16px' }} /></>
                    }
                  </button>

                  <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', fontWeight: 500 }}>
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => handleTabChange('register')}
                      style={{ color: CYAN, fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                      Create one free
                    </button>
                  </p>
                </form>
              )}

              {/* ─────────────────── CREATE ACCOUNT ─────────────────── */}
              {activeTab === 'register' && (
                <>
                  {/* Role selector */}
                  <div className="field-group">
                    <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                      I am a…
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {roleConfig.map(({ id, label, icon: Icon, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleRoleChange(id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '14px 10px', borderRadius: '12px', cursor: 'pointer',
                            border: `2px solid ${registerRole === id ? CYAN_BORDER : BORDER}`,
                            backgroundColor: registerRole === id ? CYAN_DIM : 'rgba(255,255,255,0.02)',
                            color: registerRole === id ? CYAN : '#64748b',
                            transition: 'all 0.2s',
                            boxShadow: registerRole === id ? `0 0 16px rgba(6,182,212,0.1)` : 'none',
                          }}
                        >
                          <Icon style={{ width: '22px', height: '22px', marginBottom: '6px' }} />
                          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>{label}</span>
                          <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Name row */}
                    <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <FieldLabel required>First Name</FieldLabel>
                        <input
                          placeholder="First" required
                          value={commonData.first_name}
                          onChange={e => { touch('firstName'); setCommonData(p => ({ ...p, first_name: e.target.value })); }}
                          style={{
                            height: '44px', padding: '0 12px', borderRadius: '10px',
                            border: `1px solid ${touched.firstName && regErrors.firstName ? 'rgba(248,113,113,0.45)' : touched.firstName && commonData.first_name ? 'rgba(52,211,153,0.45)' : BORDER}`,
                            backgroundColor: touched.firstName && regErrors.firstName ? 'rgba(248,113,113,0.06)' : touched.firstName && commonData.first_name ? 'rgba(52,211,153,0.06)' : INPUT_BG,
                            color: '#e2e8f0', fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box', width: '100%',
                          }}
                        />
                        <FieldError message={regErrors.firstName} touched={!!touched.firstName} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <FieldLabel required>Last Name</FieldLabel>
                        <input
                          placeholder="Last" required
                          value={commonData.last_name}
                          onChange={e => { touch('lastName'); setCommonData(p => ({ ...p, last_name: e.target.value })); }}
                          style={{
                            height: '44px', padding: '0 12px', borderRadius: '10px',
                            border: `1px solid ${touched.lastName && regErrors.lastName ? 'rgba(248,113,113,0.45)' : touched.lastName && commonData.last_name ? 'rgba(52,211,153,0.45)' : BORDER}`,
                            backgroundColor: touched.lastName && regErrors.lastName ? 'rgba(248,113,113,0.06)' : touched.lastName && commonData.last_name ? 'rgba(52,211,153,0.06)' : INPUT_BG,
                            color: '#e2e8f0', fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box', width: '100%',
                          }}
                        />
                        <FieldError message={regErrors.lastName} touched={!!touched.lastName} />
                      </div>
                    </div>

                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <FieldLabel required>Username</FieldLabel>
                      <FieldInput icon={User} placeholder="Choose a username"
                        value={commonData.username}
                        onChange={touchOnChange('username', v => setCommonData(p => ({ ...p, username: v })))}
                        onBlur={() => touch('username')}
                        autoComplete="username" required
                        status={!touched.username ? 'none' : regErrors.username ? 'error' : commonData.username ? 'ok' : 'none'} />
                      <FieldError message={regErrors.username} touched={!!touched.username} />
                      <FieldSuccess show={!!touched.username && !regErrors.username && !!commonData.username} message="Username is valid" />
                    </div>

                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <FieldLabel required>Email Address</FieldLabel>
                      <FieldInput icon={Mail} type="email" placeholder="you@example.com"
                        value={commonData.email}
                        onChange={touchOnChange('email', v => setCommonData(p => ({ ...p, email: v })))}
                        onBlur={() => touch('email')}
                        autoComplete="email" required
                        status={!touched.email ? 'none' : regErrors.email ? 'error' : commonData.email ? 'ok' : 'none'} />
                      <FieldError message={regErrors.email} touched={!!touched.email} />
                    </div>

                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <FieldLabel required>Password</FieldLabel>
                      <FieldInput icon={Lock} type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={commonData.password}
                        onChange={touchOnChange('password', v => setCommonData(p => ({ ...p, password: v })))}
                        onBlur={() => touch('password')}
                        autoComplete="new-password" required minLength={8}
                        rightSlot={<EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />}
                        status={!touched.password || !commonData.password ? 'none' : regErrors.password ? 'error' : pwStrength.score >= 3 ? 'ok' : 'none'} />
                      <StrengthBar password={touched.password ? commonData.password : ''} />
                      <FieldError message={regErrors.password} touched={!!touched.password} />
                    </div>

                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <FieldLabel required>Confirm Password</FieldLabel>
                      <FieldInput icon={Lock} type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={v => { touch('confirm'); setConfirmPassword(v); }}
                        onBlur={() => touch('confirm')}
                        autoComplete="new-password" required
                        status={!touched.confirm ? 'none' : confirmStatus}
                        rightSlot={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {touched.confirm && passwordsMatch && <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399' }} />}
                            <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />
                          </div>
                        } />
                      <FieldError message={regErrors.confirm} touched={!!touched.confirm} />
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', backgroundColor: BORDER, margin: '2px 0' }} />

                    {/* ID field */}
                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <FieldLabel required>{registerRole === 'student' ? 'Matric Number' : 'Staff ID'}</FieldLabel>
                      <FieldInput icon={Hash}
                        placeholder={registerRole === 'student' ? 'e.g. 2020/UNN/12345' : 'e.g. UNN/STF/001'}
                        value={registerRole === 'student' ? roleData.matric_number : roleData.staff_id}
                        onChange={v => {
                          touch('idField');
                          setRoleData(p => ({ ...p, [registerRole === 'student' ? 'matric_number' : 'staff_id']: v }));
                        }}
                        onBlur={() => touch('idField')}
                        required
                        status={!touched.idField ? 'none' : regErrors.idField ? 'error' : (registerRole === 'student' ? roleData.matric_number : roleData.staff_id).trim() ? 'ok' : 'none'} />
                      <FieldError message={regErrors.idField} touched={!!touched.idField} />
                    </div>

                    {/* Dept + Level */}
                    {isDataLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', color: '#64748b' }}>
                        <Loader2 style={{ width: '15px', height: '15px', color: CYAN, animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading departments &amp; levels…</span>
                      </div>
                    ) : (
                      <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                            Department <span style={{ color: CYAN, fontSize: '10px', fontWeight: 900 }}>*</span>
                          </p>
                          <Select value={roleData.department} onValueChange={v => setRoleData(p => ({ ...p, department: v }))}>
                            <SelectTrigger style={selectTriggerStyle}>
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl" style={{ backgroundColor: '#0d1526', border: `1px solid ${BORDER}` }}>
                              {departments.length === 0
                                ? <SelectItem value="__none" disabled style={{ color: '#475569' }}>No departments</SelectItem>
                                : departments.map(d => (
                                    <SelectItem key={d.id} value={String(d.id)} style={{ color: '#cbd5e1', fontWeight: 600 }}>{d.name}</SelectItem>
                                  ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                            Level <span style={{ color: CYAN, fontSize: '10px', fontWeight: 900 }}>*</span>
                          </p>
                          <Select value={roleData.level} onValueChange={v => setRoleData(p => ({ ...p, level: v }))}>
                            <SelectTrigger style={selectTriggerStyle}>
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl" style={{ backgroundColor: '#0d1526', border: `1px solid ${BORDER}` }}>
                              {levels.length === 0
                                ? <SelectItem value="__none" disabled style={{ color: '#475569' }}>No levels</SelectItem>
                                : levels.map(l => (
                                    <SelectItem key={l.id} value={String(l.id)} style={{ color: '#cbd5e1', fontWeight: 600 }}>{l.name}</SelectItem>
                                  ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading || isDataLoading}
                      style={{
                        width: '100%', height: '46px', borderRadius: '10px', border: 'none',
                        cursor: isLoading || isDataLoading ? 'not-allowed' : 'pointer',
                        background: isRegValid
                          ? `linear-gradient(135deg, #0891b2, #2563eb)`
                          : 'rgba(255,255,255,0.06)',
                        color: isRegValid ? '#fff' : '#475569',
                        fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        marginTop: '4px',
                        boxShadow: isRegValid ? '0 4px 20px rgba(6,182,212,0.18)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isLoading
                        ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />Creating account…</>
                        : <><BookOpen style={{ width: '16px', height: '16px' }} />Complete Registration<ArrowRight style={{ width: '16px', height: '16px' }} /></>
                      }
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>
              AESA Study Platform V1.0 · Adaptive eLearning
            </p>
            <p style={{ color: '#334155', fontSize: '10px', fontWeight: 500, margin: 0 }}>
              Developed by{' '}
              <span style={{ color: CYAN, fontWeight: 800 }}>Iheanacho C.M</span>
              {' '}· UNN (Arts Education) · 2026
            </p>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default AuthPage;