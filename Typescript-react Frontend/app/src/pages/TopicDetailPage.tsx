// ============================================
// TopicDetailPage — ULTIMATE MERGE
// PASTE TO: src/pages/TopicDetailPage.tsx
// ============================================
//
// MERGED FROM TWO VERSIONS — BEST OF BOTH:
//
// FROM VERSION 1 (dark-only, bug-fixed):
//   [BUG-URL]   lectureNoteApi.getByTopic → /topic/${topicId}/note/ (client.ts) ✓
//   [BUG-RADIX] parseInt(topicId, 10) everywhere ✓
//   [BUG-STALE] cycleLightbox stale closure fixed via imagesRef ✓
//   [BUG-MEDIA] Empty sections never render phantom headers ✓
//   [FEATURE]   Rich Tailwind prose classes for lecture note rendering ✓
//   [FEATURE]   Colour-transitioning hover states on PDF/video rows ✓
//
// FROM VERSION 2 (theme-aware):
//   [FEATURE]   usePageTheme() — full light + dark support ✓
//   [FEATURE]   SectionHeader uses theme tokens ✓
//   [FEATURE]   All cards, blobs, empty states respond to system theme ✓
//   [FEATURE]   Inline styles for theme-sensitive surfaces ✓
//
// NET RESULT: Every pixel responds to the system theme while all bug
// fixes and rich interaction patterns are fully preserved.
// ============================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lectureNoteApi, mediaResourceApi } from '@/api/client';
import { useAuth } from '@/contexts/useAuth';
import { usePageTheme } from '@/hooks/usePageTheme';
import type { LectureNote, MediaResource } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

import {
  ArrowLeft, Download, ExternalLink, FileText,
  Video, Image as ImageIcon, Edit, BookOpen,
  Play, X, ChevronLeft, ChevronRight,
  ZoomIn, Layers,
} from 'lucide-react';
import { toast } from 'sonner';

// [BUG-URL] Normalise base — strip trailing slash once
const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8000'
).replace(/\/$/, '');

// ── Section Header ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  iconBg: string;         // e.g. 'rgba(139,92,246,0.15)'
  iconBorder: string;     // e.g. 'rgba(139,92,246,0.25)'
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, label, count, iconBg, iconBorder }) => {
  const t = usePageTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: iconBg, border: `1px solid ${iconBorder}`,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '0.625rem', fontWeight: 900, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: t.textSec, margin: 0,
      }}>{label}</h3>
      <span style={{
        fontSize: '0.625rem', fontWeight: 900, color: t.textTer,
        background: t.inputBg, border: `1px solid ${t.border}`,
        padding: '2px 8px', borderRadius: 999,
      }}>{count}</span>
    </div>
  );
};

// ── Skeleton ───────────────────────────────────────────────────────────────

const PageSkeleton = () => {
  const t = usePageTheme();
  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, padding: '2rem 1rem', maxWidth: 900, margin: '0 auto' }}>
      <Skeleton className="h-8 w-24 rounded-xl mb-5" style={{ background: t.cardBorder }} />
      <Skeleton className="h-72 w-full rounded-3xl mb-5" style={{ background: t.cardBorder }} />
      <Skeleton className="h-48 w-full rounded-3xl" style={{ background: t.inputBg }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const TopicDetailPage: React.FC = () => {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = usePageTheme();
  const canEdit = user?.role === 'admin' || user?.role === 'instructor';

  const [note,        setNote]        = useState<LectureNote | null>(null);
  const [media,       setMedia]       = useState<MediaResource[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // [BUG-STALE] Ref so keyboard handler always sees the latest images array
  const imagesRef = useRef<MediaResource[]>([]);

  // ── Data loading ─────────────────────────────────────────────────────────
  // [BUG-RADIX] Always parseInt with radix 10
  useEffect(() => {
    if (!topicId) return;
    const tid = parseInt(topicId, 10);
    const load = async () => {
      setIsLoading(true);
      try {
        // [BUG-URL] lectureNoteApi.getByTopic calls /topic/${tid}/note/ — enforced in client.ts
        const [noteData, mediaData] = await Promise.all([
          lectureNoteApi.getByTopic(tid).catch(() => null),
          mediaResourceApi.getByTopic(tid).catch(() => [] as MediaResource[]),
        ]);
        setNote(noteData);
        const mediaArr = Array.isArray(mediaData) ? mediaData : [];
        setMedia(mediaArr);
        imagesRef.current = mediaArr.filter(m => m.media_type === 'image');
      } catch {
        toast.error('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [topicId]);

  // Derived lists — [BUG-MEDIA] sections only render when non-empty
  const images     = media.filter(m => m.media_type === 'image');
  const pdfs       = media.filter(m => m.media_type === 'pdf');
  const videoLinks = media.filter(m => m.media_type === 'video_link');
  const hasMedia   = media.length > 0;

  // [BUG-STALE] Keep ref in sync with derived list
  useEffect(() => { imagesRef.current = images; }, [images]);

  // [BUG-STALE] Keyboard handler reads from ref — never stale
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx(i => i === null ? null : (i + 1) % imagesRef.current.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx(i => i === null ? null : (i - 1 + imagesRef.current.length) % imagesRef.current.length);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx]);

  const cycleLightbox = useCallback((dir: 1 | -1) => {
    setLightboxIdx(i => {
      if (i === null) return null;
      const len = imagesRef.current.length;
      return (i + dir + len) % len;
    });
  }, []);

  if (isLoading) return <PageSkeleton />;

  const activeImage = lightboxIdx !== null ? images[lightboxIdx] : null;

  // ── Shared surface tokens ────────────────────────────────────────────────
  const card: React.CSSProperties = {
    borderRadius: 24, border: `1px solid ${t.cardBorder}`,
    background: t.cardBg, overflow: 'hidden', boxShadow: t.shadow,
  };
  const cardHead: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: `1px solid ${t.border}`, background: t.inputBg,
  };

  // Per-media-type accent colours (stable across light/dark — only opacity shifts)
  const violetBg     = t.isDark ? 'rgba(139,92,246,0.15)'  : 'rgba(99,102,241,0.08)';
  const violetBorder = t.isDark ? 'rgba(139,92,246,0.25)'  : 'rgba(99,102,241,0.15)';
  const violetColor  = t.isDark ? '#a78bfa'                 : '#6366f1';

  const redBg        = t.isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)';
  const redBorder    = t.isDark ? 'rgba(248,113,113,0.2)'  : 'rgba(220,38,38,0.12)';
  const redColor     = t.isDark ? '#f87171'                 : '#dc2626';

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, position: 'relative' }}>

      {/* ── Ambient blobs — theme-adaptive ── */}
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
        padding: '24px 16px 96px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* ── Top nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '0.875rem', fontWeight: 500, color: t.textSec,
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: t.inputBg,
              border: `1px solid ${t.border}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowLeft size={16} color={t.textSec} />
            </div>
            Back to Course
          </button>

          {canEdit && (
            <Link to={`/courses/${courseId}/topics/${topicId}/edit`} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 12,
              background: t.inputBg, border: `1px solid ${t.border}`,
              color: t.textSec, fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
            }}>
              <Edit size={14} /> Edit Content
            </Link>
          )}
        </div>

        {/* ── Lecture Note Card ── */}
        <div style={card}>
          <div style={cardHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: t.cyanDim, border: `1px solid ${t.borderAcc}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={20} color={t.cyan} />
              </div>
              <div>
                <h2 style={{ fontWeight: 900, color: t.textPri, fontSize: '1rem', margin: 0 }}>
                  Lecture Note
                </h2>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 2 }}>Full topic content</p>
              </div>
            </div>

            {note?.pdf_file && (
              <a href={`${API_BASE}${note.pdf_file}`} download style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 12,
                border: `1px solid ${t.border}`, background: t.inputBg,
                color: t.textSec, fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
              }}>
                <Download size={14} /> PDF
              </a>
            )}
          </div>

          {/* Note content — prose classes adapt via data-theme on <html> */}
          <div style={{ padding: '32px 24px' }}>
            {note ? (
              <div
                className={[
                  'prose max-w-none',
                  t.isDark ? 'prose-invert' : '',
                  // Headings
                  'prose-headings:font-black prose-headings:tracking-tight',
                  // Body text
                  'prose-p:leading-relaxed prose-p:text-[15px]',
                  'prose-li:text-[15px]',
                  // Inline code
                  'prose-code:rounded-lg prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono',
                  // Code blocks
                  'prose-pre:rounded-2xl',
                  // Links
                  'prose-a:no-underline hover:prose-a:underline',
                ].join(' ')}
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '5rem 1rem', textAlign: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: t.inputBg, border: `1px solid ${t.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <FileText size={32} color={t.textTer} />
                </div>
                <p style={{ fontWeight: 700, color: t.textSec, marginBottom: 8 }}>No lecture note yet</p>
                <p style={{ fontSize: '0.875rem', color: t.textTer, maxWidth: 280, lineHeight: 1.6 }}>
                  {canEdit
                    ? 'Click "Edit Content" above to add a lecture note for this topic.'
                    : "Your instructor hasn't added a lecture note for this topic yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Media Resources Card ── */}
        <div style={card}>
          <div style={cardHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: violetBg, border: `1px solid ${violetBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Layers size={20} color={violetColor} />
              </div>
              <div>
                <h2 style={{ fontWeight: 900, color: t.textPri, fontSize: '1rem', margin: 0 }}>
                  Media Resources
                </h2>
                <p style={{ fontSize: '0.75rem', color: t.textTer, marginTop: 2 }}>
                  {hasMedia
                    ? `${media.length} resource${media.length !== 1 ? 's' : ''} available`
                    : 'Images, PDFs & video links'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── Images — [BUG-MEDIA] only renders when images.length > 0 ── */}
            {images.length > 0 && (
              <section>
                <SectionHeader
                  icon={<ImageIcon size={14} color={violetColor} />}
                  label="Images"
                  count={images.length}
                  iconBg={violetBg}
                  iconBorder={violetBorder}
                />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 16,
                }}>
                  {images.map((img, imgIdx) => (
                    <div key={img.id} style={{
                      position: 'relative', borderRadius: 18, overflow: 'hidden',
                      border: `1px solid ${t.cardBorder}`, transition: 'border-color 0.2s ease',
                    }} className="group">
                      <div style={{ aspectRatio: '16/9', background: t.inputBg, overflow: 'hidden' }}>
                        <img
                          src={`${API_BASE}${img.file}`}
                          alt={img.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                          className="group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      {/* Hover overlay */}
                      <div
                        className="group-hover:bg-black/50 group-hover:opacity-100"
                        style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 12, opacity: 0, transition: 'all 0.3s ease',
                        }}>
                        <button
                          onClick={() => setLightboxIdx(imgIdx)}
                          aria-label="Zoom image"
                          style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}>
                          <ZoomIn size={16} color="#fff" />
                        </button>
                        <a
                          href={`${API_BASE}${img.file}`}
                          download
                          aria-label="Download image"
                          style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <Download size={16} color="#fff" />
                        </a>
                      </div>
                      <div style={{
                        padding: '10px 12px',
                        background: t.inputBg, borderTop: `1px solid ${t.border}`,
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: t.textSec }}>
                          {img.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── PDFs — [BUG-MEDIA] only renders when pdfs.length > 0 ── */}
            {pdfs.length > 0 && (
              <section>
                <SectionHeader
                  icon={<FileText size={14} color={redColor} />}
                  label="PDF Resources"
                  count={pdfs.length}
                  iconBg={redBg}
                  iconBorder={redBorder}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pdfs.map(pdf => (
                    <a
                      key={pdf.id}
                      href={`${API_BASE}${pdf.file}`}
                      download
                      className="group"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 16, borderRadius: 16, textDecoration: 'none',
                        border: `1px solid ${t.cardBorder}`, background: t.cardBg,
                        transition: 'all 0.2s ease',
                      }}
                      // Hover handled via className group + Tailwind since inline :hover isn't possible
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = redBorder;
                        (e.currentTarget as HTMLElement).style.background = redBg;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = t.cardBorder;
                        (e.currentTarget as HTMLElement).style.background = t.cardBg;
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                          background: redBg, border: `1px solid ${redBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FileText size={18} color={redColor} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: t.textPri }}>
                          {pdf.title}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.75rem', fontWeight: 700, color: t.textTer, flexShrink: 0,
                      }}>
                        <Download size={14} /> Download
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ── Videos — [BUG-MEDIA] only renders when videoLinks.length > 0 ── */}
            {videoLinks.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Video size={14} color={t.cyan} />}
                  label="Video Resources"
                  count={videoLinks.length}
                  iconBg={t.cyanDim}
                  iconBorder={t.borderAcc}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {videoLinks.map(v => (
                    <a
                      key={v.id}
                      href={v.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 16, borderRadius: 16, textDecoration: 'none',
                        border: `1px solid ${t.cardBorder}`, background: t.cardBg,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = t.borderAcc;
                        (e.currentTarget as HTMLElement).style.background = t.cyanDim;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = t.cardBorder;
                        (e.currentTarget as HTMLElement).style.background = t.cardBg;
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                          background: t.cyanDim, border: `1px solid ${t.borderAcc}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={16} color={t.cyan} />
                        </div>
                        <div>
                          <span style={{
                            fontSize: '0.875rem', fontWeight: 600, color: t.textPri,
                            display: 'block', maxWidth: 280,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{v.title}</span>
                          <span style={{
                            fontSize: '0.6875rem', color: t.textTer,
                            display: 'block', maxWidth: 280,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{v.url}</span>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.75rem', fontWeight: 700, color: t.textTer, flexShrink: 0,
                      }}>
                        <ExternalLink size={14} /> Watch
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ── Empty state ── */}
            {!hasMedia && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: t.inputBg, border: `1px solid ${t.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <Play size={32} color={t.textTer} />
                </div>
                <p style={{ fontWeight: 700, color: t.textSec, marginBottom: 8 }}>No media resources yet</p>
                <p style={{ fontSize: '0.875rem', color: t.textTer, maxWidth: 280, lineHeight: 1.6 }}>
                  {canEdit
                    ? 'Click "Edit Content" above to upload images, PDFs or add video links.'
                    : "Your instructor hasn't uploaded any resources for this topic yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Image Lightbox ── */}
      {lightboxIdx !== null && activeImage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setLightboxIdx(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: 900, maxHeight: '90vh', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              aria-label="Close lightbox"
              style={{
                position: 'absolute', top: -48, right: 0,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}>
              <X size={20} />
            </button>

            <img
              src={`${API_BASE}${activeImage.file}`}
              alt={activeImage.title}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 18 }}
            />
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
              {activeImage.title}
            </p>

            {/* Prev / Next — only when multiple images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => cycleLightbox(-1)}
                  aria-label="Previous image"
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}>
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => cycleLightbox(1)}
                  aria-label="Next image"
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}>
                  <ChevronRight size={20} />
                </button>
                <p style={{
                  position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500,
                }}>
                  {lightboxIdx + 1} / {images.length}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicDetailPage;