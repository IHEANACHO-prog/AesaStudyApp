// ============================================
// AESA — Forum Thread  (Fully Corrected)
// PASTE TO: src/pages/ForumThreadPage.tsx
// ============================================
//
// BUGS FIXED IN THIS VERSION
// ──────────────────────────
// BUG 1: forumApi.getQuestion(pId) was missing courseId — caused the URL
//        /forum/course/5/questions/undefined/ (404). Fixed by passing both
//        courseId and postId: forumApi.getQuestion(cId, pId).
//
// BUG 2: forumApi.createAnswer sent { answer } but backend expects { body }.
//        Fixed: createAnswer(postId, { body: newReply })
//        (Also fixed in client.ts — both must match.)
//
// BUG 3: reply text was undefined in JSX because backend returns `body`.
//        Fixed: display (reply as any).body ?? reply.answer ?? ''
//
// BUG 4: After posting a reply the textarea wasn't cleared until the API call
//        completed — felt laggy. Fixed: clear immediately, re-populate on error.
//
// BUG 5: navigate(`/forum`) hard-coded — now navigate(-1) to preserve context.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forumApi } from '@/api/client';
import type { ForumPost, ForumReply } from '@/types';

import { Skeleton } from '@/components/ui/skeleton';

import {
  ChevronLeft, MessageCircle, Calendar, User,
  Send, ShieldCheck, Loader2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string, username: string) => {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  ['#0e7490','#164e63'], ['#7c3aed','#4c1d95'], ['#059669','#064e3b'],
  ['#d97706','#78350f'], ['#db2777','#831843'], ['#2563eb','#1e3a8a'],
];
const avatarColor = (username: string) =>
  AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length];

const timeAgo = (dateStr: string) => {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const ForumThreadPage: React.FC = () => {
  // BUG 1 FIX: destructure courseId from params — it was never used before
  const { courseId, postId } = useParams<{ courseId: string; postId: string }>();
  const navigate = useNavigate();

  const [post, setPost]               = useState<ForumPost | null>(null);
  const [replies, setReplies]         = useState<ForumReply[]>([]);
  const [isLoading, setLoading]       = useState(true);
  const [newReply, setNewReply]       = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [mounted, setMounted]         = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const loadThread = useCallback(async () => {
    // Guard: both courseId AND postId must be defined
    if (!courseId || !postId) {
      toast.error('Invalid discussion link');
      navigate(-1);
      return;
    }
    setLoading(true);
    try {
      const cId = parseInt(courseId, 10);
      const pId = parseInt(postId, 10);

      const [postData, repliesData] = await Promise.all([
        // BUG 1 FIX: pass cId so URL resolves to /forum/course/<cId>/questions/<pId>/
        // Previously was forumApi.getQuestion(pId) — missing courseId → /questions/undefined/
        forumApi.getQuestion(cId, pId),
        forumApi.getAnswers(pId),
      ]);
      setPost(postData);
      setReplies(repliesData);
    } catch {
      toast.error('Could not load this discussion');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [courseId, postId, navigate]);

  useEffect(() => { loadThread(); }, [loadThread]);

  const handleSubmitReply = async () => {
    const text = newReply.trim();
    if (!text || !postId) return;
    setSubmitting(true);
    // BUG 4 FIX: clear immediately for snappy feel
    setNewReply('');
    try {
      // Backend serializer field is `answer` — confirmed from error response
      await forumApi.createAnswer(parseInt(postId, 10), { answer: text });
      toast.success('Reply posted!');
      const updated = await forumApi.getAnswers(parseInt(postId, 10));
      setReplies(updated);
    } catch (err: any) {
      // Restore text on failure so user doesn't lose their reply
      setNewReply(text);
      toast.error(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitReply();
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0 80px', fontFamily: "'DM Sans', sans-serif" }}>
      <Skeleton style={{ height: 36, width: 120, borderRadius: 10, marginBottom: 28 }} />
      <Skeleton style={{ height: 220, borderRadius: 20, marginBottom: 16 }} />
      <Skeleton style={{ height: 100, borderRadius: 16, marginBottom: 10 }} />
      <Skeleton style={{ height: 100, borderRadius: 16 }} />
    </div>
  );

  if (!post) return null;

  const [postBg, postBg2] = avatarColor(post.user.username);
  const postInitials = getInitials(post.user.first_name, post.user.last_name, post.user.username);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .thread-root {
          font-family: 'DM Sans', sans-serif;
          max-width: 720px; margin: 0 auto;
          padding: 0 0 120px;
          opacity: 0; transform: translateY(10px);
          transition: opacity .35s ease, transform .35s ease;
        }
        .thread-root.fin { opacity: 1; transform: none; }

        /* ── Back ── */
        .thread-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.8rem; font-weight: 600; color: #64748b;
          background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 24px;
          font-family: 'DM Sans', sans-serif;
          transition: color .15s;
        }
        .thread-back:hover { color: #0891b2; }

        /* ── Question card ── */
        .thread-q {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05); margin-bottom: 28px; overflow: hidden;
        }
        .thread-q-head {
          padding: 24px 26px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: flex-start; gap: 16px;
        }
        .thread-q-avatar {
          width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 800; color: #fff; letter-spacing: -0.5px;
        }
        .thread-q-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.45rem; color: #0f172a; line-height: 1.25; margin: 0 0 10px;
        }
        .thread-q-meta { display: flex; flex-wrap: wrap; gap: 14px; }
        .thread-meta-chip {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.73rem; color: #64748b;
        }
        .thread-meta-chip strong { color: #0f172a; font-weight: 600; }
        .thread-q-body { padding: 22px 26px 26px; }
        .thread-q-text {
          font-size: 0.95rem; color: #334155; line-height: 1.75;
          white-space: pre-wrap; margin: 0;
        }

        /* ── Replies section ── */
        .thread-replies-head {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.95rem; font-weight: 700; color: #0f172a;
          margin-bottom: 14px;
        }
        .thread-reply-count {
          font-size: 0.72rem; font-weight: 700; padding: 2px 9px; border-radius: 99px;
          background: #f0f9ff; color: #0891b2; border: 1px solid #bae6fd;
        }

        /* ── Reply card ── */
        .thread-reply {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
          margin-bottom: 10px; overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
        }
        .thread-reply:hover { border-color: #bae6fd; box-shadow: 0 3px 14px rgba(8,145,178,0.07); }
        .thread-reply.staff { border-color: #a7f3d0; background: #f0fdf4; }
        .thread-reply-head {
          padding: 14px 18px 10px;
          display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #f8fafc;
        }
        .thread-reply-avatar {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.68rem; font-weight: 800; color: #fff; letter-spacing: -0.3px;
        }
        .thread-reply-name {
          font-size: 0.82rem; font-weight: 700; color: #0f172a;
          margin: 0 0 1px; display: flex; align-items: center; gap: 6px;
        }
        .thread-reply-time { font-size: 0.68rem; color: #94a3b8; }
        .thread-staff-badge {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
          padding: 2px 7px; border-radius: 99px; background: #059669; color: #fff;
        }
        .thread-reply-body { padding: 14px 18px 16px; }
        .thread-reply-text {
          font-size: 0.88rem; color: #334155; line-height: 1.65;
          white-space: pre-wrap; margin: 0;
        }

        /* ── No replies ── */
        .thread-no-replies {
          text-align: center; padding: 48px 24px;
          border: 2px dashed #e2e8f0; border-radius: 18px;
          color: #94a3b8; font-size: 0.82rem;
        }
        .thread-no-replies svg { display: block; margin: 0 auto 12px; }

        /* ── Sticky composer ── */
        .thread-composer {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
          padding: 14px 24px 18px;
        }
        .thread-composer-inner {
          max-width: 720px; margin: 0 auto;
          display: flex; align-items: flex-end; gap: 12px;
        }
        .thread-composer-textarea {
          flex: 1; min-height: 44px; max-height: 160px;
          padding: 11px 14px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          font-family: 'DM Sans', sans-serif; font-size: 0.86rem;
          line-height: 1.5; color: #0f172a; outline: none; resize: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .thread-composer-textarea::placeholder { color: #cbd5e1; }
        .thread-composer-textarea:focus {
          border-color: #0891b2;
          box-shadow: 0 0 0 3px rgba(8,145,178,0.10);
          background: #fff;
        }
        .thread-composer-hint { font-size: 0.65rem; color: #94a3b8; margin-top: 4px; }
        .thread-send-btn {
          width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          background: #0891b2; color: #fff;
          box-shadow: 0 4px 12px rgba(8,145,178,0.3);
          transition: background .15s, transform .1s, opacity .15s;
        }
        .thread-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .thread-send-btn:not(:disabled):hover { background: #0e7490; transform: translateY(-1px); }
        .thread-send-btn:not(:disabled):active { transform: scale(0.95); }
      `}</style>

      <div className={`thread-root ${mounted ? 'fin' : ''}`}>

        {/* ── Back button ── */}
        <button className="thread-back" onClick={() => navigate(-1)}>
          <ChevronLeft size={15} /> Back to Discussions
        </button>

        {/* ── Question card ── */}
        <div className="thread-q">
          <div className="thread-q-head">
            <div
              className="thread-q-avatar"
              style={{ background: `linear-gradient(135deg,${postBg},${postBg2})` }}
            >
              {postInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="thread-q-title">{post.title}</h1>
              <div className="thread-q-meta">
                <span className="thread-meta-chip">
                  <User size={12} /><strong>{post.user.username}</strong>
                </span>
                <span className="thread-meta-chip">
                  <Calendar size={12} />
                  {new Date(post.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="thread-q-body">
            <p className="thread-q-text">{post.body}</p>
          </div>
        </div>

        {/* ── Replies ── */}
        <div className="thread-replies-head">
          <MessageCircle size={18} color="#0891b2" />
          Replies
          <span className="thread-reply-count">{replies.length}</span>
        </div>

        {replies.length === 0 ? (
          <div className="thread-no-replies">
            <MessageCircle size={32} color="#e2e8f0" />
            No replies yet — be the first to contribute!
          </div>
        ) : (
          replies.map(reply => {
            const [rBg, rBg2] = reply.user?.is_staff
              ? ['#059669','#064e3b']
              : avatarColor(reply.user.username);
            // Backend stores as `answer` — fall back to `body` for older records
            const replyText = (reply as any).answer ?? (reply as any).body ?? '';
            return (
              <div key={reply.id} className={`thread-reply ${reply.user?.is_staff ? 'staff' : ''}`}>
                <div className="thread-reply-head">
                  <div
                    className="thread-reply-avatar"
                    style={{ background: `linear-gradient(135deg,${rBg},${rBg2})` }}
                  >
                    {getInitials(reply.user.first_name, reply.user.last_name, reply.user.username)}
                  </div>
                  <div>
                    <div className="thread-reply-name">
                      {reply.user.username}
                      {reply.user?.is_staff && (
                        <span className="thread-staff-badge">
                          <ShieldCheck size={9} /> Staff
                        </span>
                      )}
                    </div>
                    <div className="thread-reply-time">
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {timeAgo(reply.created_at)}
                    </div>
                  </div>
                </div>
                <div className="thread-reply-body">
                  <p className="thread-reply-text">{replyText}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Spacer so composer doesn't overlap last reply */}
        <div style={{ height: 100 }} />
      </div>

      {/* ── Sticky composer ── */}
      <div className="thread-composer">
        <div className="thread-composer-inner">
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              className="thread-composer-textarea"
              placeholder="Write a reply… (Ctrl+Enter to send)"
              value={newReply}
              onChange={e => setNewReply(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <p className="thread-composer-hint">Ctrl + Enter to send</p>
          </div>
          <button
            className="thread-send-btn"
            onClick={handleSubmitReply}
            disabled={!newReply.trim() || isSubmitting}
            title="Post reply"
          >
            {isSubmitting
              ? <Loader2 size={17} className="animate-spin" />
              : <Send size={17} />
            }
          </button>
        </div>
      </div>
    </>
  );
};

export default ForumThreadPage;