'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_SOUND_BYTES, cardAudioType } from './CardPanel';
import { ghostBtn } from './editor-parts';
import { mediaUrl, uploadToLibrary, MAX_IMAGE_BYTES } from '@/lib/media';
import { listLibrary } from '@/lib/media/library';
import { cropToSquare } from '@/lib/crop/render';
import type { Crop } from '@/lib/crop/geometry';
import { useSoundPreview } from './useSoundPreview';
import { PlayButton } from './PlayButton';
import { CropDialog } from './CropDialog';

/** Picture types the library accepts (the same as the Cards and Spot pictures). */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
/** Bitmap pictures are cropped to a square before upload (A24). SVG is stored as it is. */
const CROP_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** A phone photo is often over 2 MB before the crop; the 2 MB limit applies to the cropped result (A24). */
const MAX_CROP_INPUT_BYTES = 20 * 1024 * 1024;

const fileName = (path: string): string => path.split('/').pop() ?? path;

/** Admin buttons: the dark primary of "Save changes", the blue of "Quick import", and the ghost used across the editors. */
const primaryBtn = { height: 46, padding: '0 26px', borderRadius: 12, border: 'none', background: '#5A4038', color: '#fff', fontWeight: 700, fontFamily: 'Nunito, sans-serif', fontSize: 15, cursor: 'pointer' } as const;
const uploadBtn = { height: 42, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3F73B5', color: '#fff', fontWeight: 700, fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer' } as const;
const cancelBtn = { ...ghostBtn, height: 46, padding: '0 22px', fontSize: 15 } as const;
/** The dialog's height: the list scrolls inside it; the header and footer stay put. */
const DIALOG_HEIGHT = 'min(600px, calc(100vh - 32px))';

/** Header icons: a picture frame for images, a sol note (eighth note) for sounds. */
const TitleIcon = ({ kind }: { kind: 'image' | 'audio' }) => (kind === 'image' ? (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A4038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
) : (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A4038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
));

/**
 * "Choose from library" modal (A23, A24). Clicking an item only highlights it; OK applies it (a preview until the page saves).
 * Cancel, Escape or a click outside leave everything as it was. "Upload new" uploads the file at once and lists it.
 */
export function MediaLibraryDialog({ kind, onChoose, onClose, startCrop, onCropped }: {
  kind: 'image' | 'audio'; onChoose: (path: string) => void; onClose: () => void;
  /** The crop to start from when a picture is cropped (Spot's picture B starts from picture A's crop). */
  startCrop?: Crop;
  /** Called after a cropped picture is uploaded, with the crop that was used. */
  onCropped?: (crop: Crop) => void;
}) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** A picked bitmap waiting in the crop window; nothing is uploaded until Save. */
  const [cropping, setCropping] = useState<File | null>(null);
  const preview = useSoundPreview();
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let live = true;
    listLibrary(kind).then(
      (p) => { if (live) setPaths(p); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [kind]);

  // The page behind does not scroll while the library is open.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, []);

  useEffect(() => {
    // A key the crop window already handled (Esc cancels the crop) must not close the library too.
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // OK applies the highlighted file. The preview stops first; the dialog closes after.
  function ok() {
    if (!selected) return;
    preview.stop();
    onChoose(selected);
    onClose();
  }

  /** Save in the crop window: crops the picked file to the chosen square, uploads it and lists it. */
  async function saveCrop(crop: Crop) {
    const picked = cropping;
    if (!picked) return;
    setCropping(null);
    setUploadError(null);
    setUploading(true);
    try {
      const square = await cropToSquare(picked, crop);
      if (square.size > MAX_IMAGE_BYTES) throw new Error('Image must be 2 MB or smaller.');
      const path = await uploadToLibrary(kind, square);
      setPaths((list) => [...new Set([...(list ?? []), path])].sort());
      onCropped?.(crop);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  /** Checks the file like the page uploads do, uploads it, and lists it without choosing it. */
  async function upload(picked: File) {
    setUploadError(null);
    let file = picked;
    if (kind === 'image') {
      if (!IMAGE_TYPES.includes(file.type)) return setUploadError('Use a PNG, JPG, WebP or SVG picture.');
      if (CROP_TYPES.includes(file.type)) {
        if (file.size > MAX_CROP_INPUT_BYTES) return setUploadError('Picture must be 20 MB or smaller.');
        return setCropping(file);
      }
      if (file.size > MAX_IMAGE_BYTES) return setUploadError('Image must be 2 MB or smaller.');
    } else {
      const type = cardAudioType(file.type);
      if (!type) return setUploadError('Use an MP3, M4A or WAV sound.');
      if (file.size > MAX_SOUND_BYTES) return setUploadError('Sound must be 10 MB or smaller.');
      // the bucket only knows the standard names (e.g. Chrome calls .m4a "audio/x-m4a")
      if (type !== file.type) file = new File([file], file.name, { type });
    }
    setUploading(true);
    try {
      const path = await uploadToLibrary(kind, file);
      setPaths((list) => [...new Set([...(list ?? []), path])].sort());
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || paths === null;
  let body: React.ReactNode;
  if (failed) body = <p role="alert" style={{ margin: 0, color: '#A8484F' }}>Could not load the library.</p>;
  else if (paths === null) body = <p style={{ margin: 0, color: '#6E5A4E' }}>Loading...</p>;
  else if (paths.length === 0) body = <p style={{ margin: 0, color: '#6E5A4E' }}>Nothing in the library yet.</p>;
  else if (kind === 'image') body = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
      {paths.map((p) => {
        const name = fileName(p);
        const url = mediaUrl(p);
        const on = selected === p;
        return (
          <li key={p}>
            <button type="button" aria-label={`Choose ${name}`} aria-pressed={on} data-selected={on ? 'true' : 'false'} onClick={() => setSelected(p)}
              style={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 12, background: '#fff', cursor: 'pointer', border: on ? '3px solid #5A4038' : '1.5px solid #E3D5C4', padding: 0 }}>
              {url && <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
  else body = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {paths.map((p) => {
        const name = fileName(p);
        const on = selected === p;
        const playing = preview.isPlaying(p);
        return (
          <li key={p} data-selected={on ? 'true' : 'false'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: on ? '#F6EADC' : '#FBF4E9', border: on ? '2px solid #5A4038' : '1.5px solid transparent', boxSizing: 'border-box' }}>
            <PlayButton playing={playing} label={`${playing ? 'Pause' : 'Play'} ${name}`} onClick={() => preview.toggle(p, mediaUrl(p))} />
            <button type="button" aria-label={`Choose ${name}`} aria-pressed={on} onClick={() => setSelected(p)}
              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#4A3830', fontFamily: 'Nunito, sans-serif', overflowWrap: 'anywhere' }}>
              {name}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const title = kind === 'image' ? 'Image Library' : 'Sound Library';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(74,56,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', zIndex: 50 }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, height: DIALOG_HEIGHT, overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(74,56,48,0.3)', display: 'flex', flexDirection: 'column', fontFamily: 'Nunito, sans-serif', color: '#4A3830' }}>
        {/* header: title and Upload new stay fixed */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '24px 28px 16px' }}>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><TitleIcon kind={kind} />{title}</h2>
          <input ref={fileInput} type="file" hidden accept={kind === 'image' ? 'image/*' : 'audio/*'} aria-label={`Upload new ${kind === 'image' ? 'picture' : 'sound'}`}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} style={{ ...uploadBtn, opacity: busy ? 0.6 : 1, cursor: busy ? 'default' : 'pointer' }}>
            {uploading ? 'Uploading...' : 'Upload new'}
          </button>
        </div>
        {(uploadError || uploading) && (
          <div style={{ flex: 'none', padding: '0 28px 12px' }}>
            {uploadError && <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700 }}>{uploadError}</p>}
            {uploading && <p role="status" style={{ margin: 0, color: '#6E5A4E', fontWeight: 700 }}>Uploading your file. It will appear in the list when it is done.</p>}
          </div>
        )}
        {/* only the list scrolls; scrolling it does not scroll the page behind */}
        <div data-library-list style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 28px 16px' }}>
          {body}
        </div>
        {/* footer: Cancel and OK stay fixed */}
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', padding: '16px 28px 24px', borderTop: '1px solid #F1E7DA' }}>
          <button type="button" autoFocus onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="button" aria-label="OK" onClick={ok} disabled={!selected} style={{ ...primaryBtn, opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'default' }}>OK</button>
        </div>
      </div>
      {cropping && <CropDialog file={cropping} start={startCrop} onCancel={() => setCropping(null)} onSave={saveCrop} />}
    </div>
  );
}
