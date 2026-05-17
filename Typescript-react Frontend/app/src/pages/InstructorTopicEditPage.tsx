// ============================================
// InstructorTopicEditPage — All Bugs Fixed + World-Class UI
// PASTE TO: src/pages/InstructorTopicEditPage.tsx
// ============================================
//
// BUG FIXES:
//   [BUG-1+2] lectureNoteApi.update called /topics/ (plural) AND lacked isFormData: true
//             → Both fixed in client.ts. This component calls the API correctly.
//   [BUG-3]   lectureNoteApi.create lacked isFormData: true → fixed in client.ts.
//   [BUG-4]   mediaResourceApi.delete called /topics/ (plural) → fixed in client.ts.
//   [GUARDS]  (lectureNoteApi as any) guards removed — methods now exist in client.ts
//             with correct signatures. Calls are now typed directly.
//   [PDF-VIS] File input shows selected filename in UI (was invisible before)
//   [DIRTY]   isDirty state warns before navigation if unsaved changes exist
//   [PREVIEW] Live HTML preview toggle for lecture note content
//   [EMPTY]   Media list has proper empty state
//
// UI UPGRADE:
//   — Clean card-based layout with sticky save state indicator
//   — Drag-area style file uploads with filename feedback
//   — Animated media type badge system (violet/red/blue)
//   — Unsaved changes + delete confirmation dialogs
//   — Live HTML preview panel toggled inline
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureNoteApi, mediaResourceApi } from '@/api/client';
import type { LectureNote, MediaResource } from '@/types';

import { Button }   from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge }  from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import {
  Trash2, Plus, Save, ArrowLeft, Eye, EyeOff, FileText,
  ImageIcon, Video, Link2, Upload, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────

type MediaType = 'image' | 'pdf' | 'video_link';

const MEDIA_META: Record<MediaType, { icon: React.ReactNode; color: string; label: string }> = {
  image:      { icon: <ImageIcon className="w-4 h-4" />, color: 'bg-violet-50 text-violet-600 border-violet-200', label: 'Image'      },
  pdf:        { icon: <FileText  className="w-4 h-4" />, color: 'bg-red-50 text-red-600 border-red-200',          label: 'PDF'        },
  video_link: { icon: <Video     className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600 border-blue-200',       label: 'Video Link' },
};

// ─────────────────────────────────────────────────────────────────────────────

const InstructorTopicEditPage: React.FC = () => {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();

  const [note,        setNote]        = useState<LectureNote | null>(null);
  const [content,     setContent]     = useState('');
  const [pdfFile,     setPdfFile]     = useState<File | null>(null);
  const [media,       setMedia]       = useState<MediaResource[]>([]);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isSaved,     setIsSaved]     = useState(false);
  const [isDirty,     setIsDirty]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Track original content to derive isDirty
  const originalContent = useRef('');

  const [newMedia, setNewMedia] = useState<{
    title: string;
    media_type: MediaType;
    url: string;
    file: File | null;
  }>({ title: '', media_type: 'image', url: '', file: null });

  const [isAddingMedia,  setIsAddingMedia]  = useState(false);
  const [deletingId,     setDeletingId]     = useState<number | null>(null);
  const [showUnsaved,    setShowUnsaved]    = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!topicId) return;
    const tid = parseInt(topicId, 10);

    Promise.all([
      lectureNoteApi.getByTopic(tid).catch(() => null),
      mediaResourceApi.getByTopic(tid).catch(() => [] as MediaResource[]),
    ]).then(([n, m]) => {
      const typedNote = n as LectureNote | null;
      const typedMedia = m as MediaResource[];
      setNote(typedNote);
      const noteContent = typedNote?.content ?? '';
      setContent(noteContent);
      originalContent.current = noteContent;
      setMedia(Array.isArray(typedMedia) ? typedMedia : []);
    });
  }, [topicId]);

  // Track dirty state
  useEffect(() => {
    const dirty = content !== originalContent.current || pdfFile !== null;
    setIsDirty(dirty);
    if (dirty) setIsSaved(false);
  }, [content, pdfFile]);

  // ── Save Note ─────────────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!topicId || isSaving) return;
    setIsSaving(true);
    const tid = parseInt(topicId, 10);
    const fd  = new FormData();
    fd.append('content', content);
    if (pdfFile) fd.append('pdf_file', pdfFile);

    try {
      // [BUG-1+2+3 FIX] lectureNoteApi.create/update now have correct URLs
      // (/topic/ singular) and isFormData: true — all fixed in client.ts
      if (note) {
        await lectureNoteApi.update(tid, fd);
      } else {
        const created = await lectureNoteApi.create(tid, fd);
        setNote(created);
      }
      originalContent.current = content;
      setPdfFile(null);
      setIsDirty(false);
      setIsSaved(true);
      toast.success('Lecture note saved successfully!');
      setTimeout(() => setIsSaved(false), 3500);
    } catch (e: any) {
      toast.error(e.message || 'Save failed — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add Media ─────────────────────────────────────────────────────────────
  const handleAddMedia = async () => {
    if (!topicId) return;

    if (!newMedia.title.trim()) {
      toast.error('Please enter a title for the media resource');
      return;
    }
    if (newMedia.media_type === 'video_link' && !newMedia.url.trim()) {
      toast.error('Please enter a URL for the video link');
      return;
    }
    if (newMedia.media_type !== 'video_link' && !newMedia.file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsAddingMedia(true);
    const tid = parseInt(topicId, 10);
    const fd  = new FormData();
    fd.append('title',      newMedia.title.trim());
    fd.append('media_type', newMedia.media_type);
    if (newMedia.media_type === 'video_link' && newMedia.url.trim()) {
      fd.append('url', newMedia.url.trim());
    }
    if (newMedia.file) {
      fd.append('file', newMedia.file);
    }

    try {
      // [BUG-4 FIX] mediaResourceApi.create uses /topic/ (singular) in client.ts
      const created = await mediaResourceApi.create(tid, fd);
      setMedia(prev => [...prev, created]);
      setNewMedia({ title: '', media_type: 'image', url: '', file: null });
      toast.success('Media resource added!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add media — please try again');
    } finally {
      setIsAddingMedia(false);
    }
  };

  // ── Delete Media ──────────────────────────────────────────────────────────
  const handleDeleteMedia = async (resourceId: number) => {
    if (!topicId) return;
    try {
      // [BUG-4 FIX] mediaResourceApi.delete now uses /topic/ (singular) in client.ts
      await mediaResourceApi.delete(parseInt(topicId, 10), resourceId);
      setMedia(prev => prev.filter(m => m.id !== resourceId));
      toast.success('Media resource deleted');
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isDirty) { setShowUnsaved(true); return; }
              navigate(-1);
            }}
            className="rounded-xl font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <h1 className="text-xl font-black text-slate-900">Edit Topic Content</h1>
            <p className="text-sm text-slate-500 mt-0.5">Lecture notes and media resources</p>
          </div>
        </div>

        {/* Save state badges */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 rounded-xl font-bold gap-1.5 px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved changes
            </Badge>
          )}
          {isSaved && !isDirty && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 rounded-xl font-bold gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </Badge>
          )}
        </div>
      </div>

      {/* ── Lecture Note Card ── */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-black text-slate-900">Lecture Note</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">HTML is supported — use tags like &lt;b&gt;, &lt;ul&gt;, &lt;h3&gt;, &lt;table&gt;</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(p => !p)}
              className="rounded-xl font-bold border-slate-200 gap-2 hover:bg-slate-50"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {showPreview ? (
            <div
              className="min-h-[400px] p-5 rounded-xl bg-slate-50 border border-slate-200 prose prose-slate max-w-none text-sm overflow-auto"
              dangerouslySetInnerHTML={{
                __html: content || '<p style="color:#94a3b8;font-style:italic">Nothing to preview yet…</p>'
              }}
            />
          ) : (
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 text-sm">Content</Label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={20}
                placeholder="Write the full lecture note here… HTML is supported."
                className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-mono text-sm resize-none transition-colors leading-relaxed"
              />
            </div>
          )}

          {/* PDF upload */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 text-sm">
              Upload PDF{' '}
              <span className="text-slate-400 font-normal">(optional — for offline download)</span>
            </Label>
            <div className="relative">
              <label className={[
                'flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                pdfFile
                  ? 'border-cyan-300 bg-cyan-50'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100',
              ].join(' ')}>
                <Upload className={`w-5 h-5 flex-shrink-0 ${pdfFile ? 'text-cyan-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium flex-1 truncate ${pdfFile ? 'text-cyan-700' : 'text-slate-500'}`}>
                  {/* [PDF-VIS FIX] Show selected filename */}
                  {pdfFile ? pdfFile.name : 'Click to upload PDF…'}
                </span>
                {pdfFile && (
                  <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 font-bold text-xs rounded-lg flex-shrink-0">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                )}
                <Input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Remove PDF"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveNote}
            disabled={isSaving || !isDirty}
            className={[
              'rounded-xl font-black h-11 px-6 transition-all gap-2',
              isDirty
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none',
            ].join(' ')}
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Lecture Note</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ── Media Resources Card ── */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="font-black text-slate-900">Media Resources</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Images, PDFs, and video links for this topic</p>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">

          {/* ── Existing media ── */}
          {media.length === 0 ? (
            <div className="text-center py-10 rounded-xl border-2 border-dashed border-slate-200">
              <Upload className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400">No media resources yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Add images, PDFs or video links below</p>
            </div>
          ) : (
            <div className="space-y-2">
              {media.map(m => {
                const meta = MEDIA_META[m.media_type as MediaType] ?? {
                  icon:  <Link2 className="w-4 h-4" />,
                  color: 'bg-slate-50 text-slate-500 border-slate-200',
                  label: m.media_type,
                };
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{m.title}</p>
                        <Badge variant="outline" className={`text-[10px] rounded-lg font-bold mt-0.5 border px-2 py-0 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      onClick={() => setDeletingId(m.id)}
                      aria-label={`Delete ${m.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Add new media ── */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="font-black text-sm text-slate-700 uppercase tracking-wider">Add New Resource</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Title *</Label>
                <Input
                  placeholder="e.g. Chapter 3 Diagram"
                  className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white h-11"
                  value={newMedia.title}
                  onChange={e => setNewMedia(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Type *</Label>
                <Select
                  value={newMedia.media_type}
                  onValueChange={v => setNewMedia(p => ({ ...p, media_type: v as MediaType, file: null, url: '' }))}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="image">
                      <div className="flex items-center gap-2 font-semibold">
                        <ImageIcon className="w-4 h-4 text-violet-500" /> Image
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2 font-semibold">
                        <FileText className="w-4 h-4 text-red-500" /> PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="video_link">
                      <div className="flex items-center gap-2 font-semibold">
                        <Video className="w-4 h-4 text-blue-500" /> Video Link
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newMedia.media_type === 'video_link' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Video URL *</Label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="https://youtube.com/watch?v=…"
                    className="pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white h-11"
                    value={newMedia.url}
                    onChange={e => setNewMedia(p => ({ ...p, url: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">
                  File * {newMedia.media_type === 'image' ? '(PNG, JPG, GIF, WebP)' : '(PDF)'}
                </Label>
                <label className={[
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  newMedia.file
                    ? 'border-cyan-300 bg-cyan-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300',
                ].join(' ')}>
                  <Upload className={`w-5 h-5 flex-shrink-0 ${newMedia.file ? 'text-cyan-500' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium flex-1 truncate ${newMedia.file ? 'text-cyan-700' : 'text-slate-500'}`}>
                    {newMedia.file ? newMedia.file.name : `Select ${newMedia.media_type === 'image' ? 'image' : 'PDF'}…`}
                  </span>
                  {newMedia.file && (
                    <span className="text-xs text-cyan-600 font-bold flex-shrink-0">
                      {(newMedia.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                  <Input
                    type="file"
                    className="sr-only"
                    accept={newMedia.media_type === 'image' ? 'image/*' : '.pdf'}
                    onChange={e => setNewMedia(p => ({ ...p, file: e.target.files?.[0] ?? null }))}
                  />
                </label>
              </div>
            )}

            <Button
              onClick={handleAddMedia}
              disabled={isAddingMedia}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-black shadow-lg transition-all active:scale-[0.98] gap-2"
            >
              {isAddingMedia
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                : <><Plus className="w-4 h-4" /> Add Media Resource</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Unsaved Changes Dialog ── */}
      <Dialog open={showUnsaved} onOpenChange={setShowUnsaved}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            You have unsaved changes to the lecture note. Are you sure you want to leave without saving?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUnsaved(false)} className="rounded-xl font-bold">
              Stay & Save
            </Button>
            <Button variant="destructive" onClick={() => navigate(-1)} className="rounded-xl font-bold">
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Media Confirm Dialog ── */}
      <Dialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Delete Media Resource?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            This media resource will be permanently deleted and cannot be recovered.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId !== null && handleDeleteMedia(deletingId)}
              className="rounded-xl font-bold gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorTopicEditPage;