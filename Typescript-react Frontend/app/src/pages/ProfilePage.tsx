// ============================================
// ProfilePage — World-Class Redesign
// PASTE TO: src/pages/ProfilePage.tsx
// ============================================
//
// FIXES
// ─────
// FIX: resolveMediaUrl fallback changed from localhost:8000 to deployed URL
// FIX: "Joined Unknown" guard — only renders when date is genuinely parseable
// FIX: Avatar upload calls authApi.updateProfilePicture (FormData)

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { authApi } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import {
  Mail, Calendar, Save, Trash2, AlertTriangle,
  AlertCircle, Camera, Loader2, User, Shield,
  BookOpen, TrendingUp, Edit3, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Media URL resolver ────────────────────────────────────────────────────────
// FIX: fallback is now the deployed backend, not localhost:8000
const resolveMediaUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
    'https://aesastudyapp.onrender.com/api';
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
};

// ── Date formatter ─────────────────────────────────────────────────────────
const formatJoinDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── Role config ───────────────────────────────────────────────────────────────
const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  student:    { label: 'Student',    color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  instructor: { label: 'Instructor', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  admin:      { label: 'Admin',      color: '#f43f5e', bg: 'rgba(244,63,94,0.15)'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const { user, updateProfile, deleteAccount } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing]       = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [mounted, setMounted]           = useState(false);

  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '' });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        email:      user.email      || '',
      });
    }
  }, [user]);

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be smaller than 5 MB'); return; }
    setIsUploading(true);
    const fd = new FormData();
    fd.append('profile_picture', file);
    try {
      await authApi.updateProfilePicture(fd);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) setFormData({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '' });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try { await deleteAccount(); } catch { /* handled in context */ }
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <AlertCircle style={{ width: 48, height: 48, color: '#cbd5e1' }} />
    </div>
  );

  const avatarSrc   = resolveMediaUrl(user.profile_picture);
  const joinDate    = formatJoinDate(user.date_joined);
  const role        = roleConfig[user.role] ?? roleConfig.student;
  const displayName = (user.first_name && user.last_name)
    ? `${user.first_name} ${user.last_name}`
    : user.username;
  const initials = (user.first_name && user.last_name)
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user.username.slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

        .pp-root {
          font-family: 'Sora', sans-serif;
          max-width: 740px;
          padding-bottom: 80px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .pp-root.pp-in { opacity: 1; transform: none; }

        .pp-hero {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          background: #080d18;
          padding: 32px 32px 76px;
        }
        .pp-mesh {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 70% 90% at 0% 0%,   rgba(6,182,212,0.20)  0%, transparent 55%),
            radial-gradient(ellipse 55% 65% at 100% 100%, rgba(99,102,241,0.22) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 55% 45%,  rgba(16,185,129,0.10) 0%, transparent 55%);
        }
        .pp-noise {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
        .pp-hero-body { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 22px; }

        .pp-av-wrap { position: relative; flex-shrink: 0; cursor: pointer; }
        .pp-av-ring {
          width: 92px; height: 92px; border-radius: 50%; padding: 3px;
          background: linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #10b981 100%);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.07), 0 8px 30px rgba(0,0,0,0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pp-av-wrap:hover .pp-av-ring {
          transform: scale(1.05);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 10px 36px rgba(6,182,212,0.35);
        }
        .pp-av-inner {
          width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
          background: #151d2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 800; color: #06b6d4; letter-spacing: -1px;
        }
        .pp-av-inner img { width: 100%; height: 100%; object-fit: cover; }
        .pp-av-overlay {
          position: absolute; inset: 3px; border-radius: 50%;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s ease;
        }
        .pp-av-wrap:hover .pp-av-overlay { opacity: 1; }

        .pp-name { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.4px; margin: 0 0 3px; }
        .pp-uname { font-size: 0.78rem; color: rgba(148,163,184,0.75); margin: 0 0 13px; }
        .pp-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 11px; border-radius: 99px;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
          border: 1px solid;
        }
        .pp-join { display: flex; align-items: center; gap: 5px; font-size: 0.73rem; color: rgba(148,163,184,0.65); margin-top: 10px; }

        .pp-card {
          background: #fff; border-radius: 20px; border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: -42px;
          position: relative; z-index: 2; overflow: hidden;
          transition: box-shadow 0.2s ease;
        }
        .pp-card:hover { box-shadow: 0 8px 36px rgba(0,0,0,0.09); }

        .pp-card-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 26px 17px; border-bottom: 1px solid #f1f5f9;
        }
        .pp-section-tag {
          font-size: 0.63rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #94a3b8;
        }
        .pp-head-btns { display: flex; gap: 8px; }

        .pp-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 0.76rem; font-weight: 700; font-family: 'Sora', sans-serif;
          transition: all 0.15s ease;
        }
        .pp-btn-dark  { background: #0f172a; color: #fff; }
        .pp-btn-dark:hover { background: #1e293b; transform: translateY(-1px); }
        .pp-btn-cyan  { background: linear-gradient(135deg,#06b6d4,#0891b2); color: #fff; }
        .pp-btn-cyan:disabled { opacity: 0.5; cursor: not-allowed; }
        .pp-btn-ghost { background: #f1f5f9; color: #64748b; }
        .pp-btn-ghost:hover { background: #e2e8f0; }

        .pp-fields { display: grid; grid-template-columns: 1fr 1fr; }
        @media(max-width:540px){ .pp-fields { grid-template-columns: 1fr; } }

        .pp-field { padding: 19px 26px; border-bottom: 1px solid #f8fafc; }
        .pp-field:nth-child(odd):not(.pp-full) { border-right: 1px solid #f8fafc; }
        .pp-full { grid-column: 1/-1; }
        .pp-field:last-child { border-bottom: none; }

        .pp-flabel {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em;
          text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;
        }
        .pp-fval { font-size: 0.9rem; font-weight: 600; color: #0f172a; margin: 0; }
        .pp-fnil { color: #cbd5e1; font-style: italic; font-weight: 400; }
        .pp-input {
          width: 100%; padding: 8px 11px; border-radius: 8px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          font-size: 0.86rem; font-family: 'Sora',sans-serif; font-weight: 500; color: #0f172a;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .pp-input:focus { border-color: #06b6d4; box-shadow: 0 0 0 3px rgba(6,182,212,0.11); background: #fff; }
        .pp-locked {
          font-size: 0.62rem; background: #f1f5f9; color: #94a3b8;
          padding: 2px 8px; border-radius: 99px; font-weight: 600; margin-left: 8px;
        }

        .pp-danger {
          margin-top: 18px; background: #fff;
          border-radius: 18px; border: 1px solid #fee2e2;
          padding: 20px 26px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .pp-danger h3 { font-size: 0.86rem; font-weight: 700; color: #dc2626; margin: 0 0 2px; }
        .pp-danger p  { font-size: 0.73rem; color: #94a3b8; margin: 0; }
        .pp-btn-del {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; cursor: pointer; white-space: nowrap;
          font-size: 0.76rem; font-weight: 700; font-family: 'Sora',sans-serif;
          background: #fff; color: #dc2626; border: 1.5px solid #fecaca;
          transition: background 0.15s, border-color 0.15s;
        }
        .pp-btn-del:hover { background: #fef2f2; border-color: #f87171; }
      `}</style>

      <div className={`pp-root ${mounted ? 'pp-in' : ''}`}>

        <div className="pp-hero">
          <div className="pp-mesh" />
          <div className="pp-noise" />
          <div className="pp-hero-body">

            <div className="pp-av-wrap" onClick={handleImageClick} title="Change photo">
              <div className="pp-av-ring">
                <div className="pp-av-inner">
                  {avatarSrc ? <img src={avatarSrc} alt={user.username} /> : initials}
                </div>
              </div>
              <div className="pp-av-overlay">
                {isUploading
                  ? <Loader2 size={18} color="#fff" className="animate-spin" />
                  : <Camera  size={18} color="#fff" />
                }
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="pp-name">{displayName}</h1>
              <p className="pp-uname">@{user.username}</p>
              <span className="pp-badge" style={{ color: role.color, background: role.bg, borderColor: `${role.color}40` }}>
                {role.label}
              </span>
              {joinDate && (
                <div className="pp-join">
                  <Calendar size={11} />
                  <span>Member since {joinDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <span className="pp-section-tag">Personal Information</span>
            <div className="pp-head-btns">
              {isEditing ? (
                <>
                  <button className="pp-btn pp-btn-ghost" onClick={handleCancel}>
                    <X size={12} /> Cancel
                  </button>
                  <button className="pp-btn pp-btn-cyan" onClick={handleSave} disabled={isSaving}>
                    {isSaving
                      ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                      : <><Check size={12} /> Save Changes</>
                    }
                  </button>
                </>
              ) : (
                <button className="pp-btn pp-btn-dark" onClick={() => setIsEditing(true)}>
                  <Edit3 size={12} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="pp-fields">
            <div className="pp-field">
              <div className="pp-flabel"><User size={11} /><span>First Name</span></div>
              {isEditing
                ? <input className="pp-input" value={formData.first_name} onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))} />
                : <p className="pp-fval">{user.first_name || <span className="pp-fnil">Not set</span>}</p>
              }
            </div>

            <div className="pp-field">
              <div className="pp-flabel"><User size={11} /><span>Last Name</span></div>
              {isEditing
                ? <input className="pp-input" value={formData.last_name} onChange={e => setFormData(f => ({ ...f, last_name: e.target.value }))} />
                : <p className="pp-fval">{user.last_name || <span className="pp-fnil">Not set</span>}</p>
              }
            </div>

            <div className="pp-field pp-full">
              <div className="pp-flabel"><Mail size={11} /><span>Email Address</span></div>
              {isEditing
                ? <input className="pp-input" type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
                : <p className="pp-fval">{user.email || <span className="pp-fnil">Not set</span>}</p>
              }
            </div>

            <div className="pp-field pp-full">
              <div className="pp-flabel"><Shield size={11} /><span>Username</span></div>
              <p className="pp-fval" style={{ color: '#64748b', fontWeight: 500 }}>
                @{user.username}
                <span className="pp-locked">Cannot be changed</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pp-danger">
          <div>
            <h3>Delete Account</h3>
            <p>Permanently remove your account and all associated data. This cannot be undone.</p>
          </div>
          <button className="pp-btn-del" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Account
            </DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Yes, Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePage;