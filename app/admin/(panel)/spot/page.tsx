'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLevelComplete, loadLevels, moveLevel, newLevel, saveLevels, type ELevel } from '@/lib/spot/adminLevels';
import { aspectsClose } from '@/lib/spot/validate';
import { naturalSize } from '@/lib/spot/imageSize';
import { MAX_IMAGE_BYTES, addPending, clearPending, mediaUrl, svgToPending } from '@/lib/media';
import { checkSvg } from '@/lib/quizImport';
import { CardsHeaderActions } from '@/components/admin/CardsHeaderActions';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SPOT_IMG_TYPES, SpotLevelPanel } from '@/components/admin/SpotLevelPanel';
import s from '@/components/admin/admin-ui.module.css';

/** Spot the Differences level builder (A14-A16). Nothing is uploaded or written until Save. */
export default function SpotPage() {
  const [saved, setSaved] = useState<ELevel[] | null>(null);
  const [draft, setDraft] = useState<ELevel[] | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const asked = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const fresh = await loadLevels();
      setSaved(fresh); setDraft(fresh);
      return true;
    } catch (e) { setError((e as Error).message); return false; }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // picked files live in memory until Save; free their previews when leaving
  useEffect(() => () => clearPending(), []);

  const dirty = useMemo(() => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false), [draft, saved]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // read each picture's shape once, to warn when A and B differ (A14)
  const paths = useMemo(() => [...new Set((draft ?? []).flatMap((l) => [l.a, l.b]).filter((p): p is string => !!p))], [draft]);
  useEffect(() => {
    for (const p of paths) {
      if (asked.current.has(p)) continue;
      asked.current.add(p);
      const url = mediaUrl(p);
      if (url) void naturalSize(url).then((sz) => { if (sz) setRatios((r) => ({ ...r, [p]: sz.w / sz.h })); });
    }
  }, [paths]);

  if (!draft || !saved) {
    return (
      <>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Spot the Differences</h1>
        {error ? <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700 }}>{error}</p> : <p style={{ color: '#7A6458' }}>Loading…</p>}
      </>
    );
  }

  const incomplete = draft.filter((l) => !isLevelComplete(l)).length;
  const canSave = dirty && incomplete === 0 && !busy;

  const touch = () => { setNotice(null); setError(null); setWarning(null); };
  const edit = (id: string, patch: Partial<ELevel>) => { touch(); setDraft(draft.map((l) => (l.id === id ? { ...l, ...patch } : l))); };
  const say = (id: string, text: string | null) => setMsgs((m) => { const n = { ...m }; if (text) n[id] = text; else delete n[id]; return n; });

  function pick(id: string, side: 'a' | 'b', f: File) {
    if (!SPOT_IMG_TYPES.includes(f.type)) return say(id, 'Use a PNG, JPG, WebP or SVG picture.');
    if (f.size > MAX_IMAGE_BYTES) return say(id, 'Image must be 2 MB or smaller.');
    try {
      const path = addPending(f); // preview only; uploaded when you press Save
      say(id, null);
      edit(id, { [side]: path });
    } catch (e) { say(id, (e as Error).message); }
  }

  function applySvg(id: string, side: 'a' | 'b', code: string) {
    const r = checkSvg(code); // same rules as the Quiz import
    if ('error' in r) return say(id, `${r.error}.`);
    say(id, null);
    edit(id, { [side]: svgToPending(r.svg) });
  }

  function add() { touch(); setDraft([...draft!, newLevel()]); }

  function revert() {
    clearPending(); // nothing was uploaded, so there is nothing to delete
    setDraft(saved); setMsgs({}); touch();
  }

  async function doSave() {
    if (!draft || !saved || !canSave) return;
    setBusy(true); touch();
    const r = await saveLevels(saved, draft);
    if (r.error) { setError(r.error); setBusy(false); return; }
    if (r.warning) setWarning(r.warning);
    if (await load()) { clearPending(); setMsgs({}); setNotice('Saved'); }
    setBusy(false);
  }

  const shapeOff = (l: ELevel) => {
    const a = l.a ? ratios[l.a] : null;
    const b = l.b ? ratios[l.b] : null;
    return !!a && !!b && !aspectsClose(a, b);
  };

  const doomed = confirm !== null ? draft[confirm] : null;
  let status = 'All changes saved.';
  if (busy) status = 'Saving…';
  else if (incomplete) status = `${incomplete} ${incomplete === 1 ? 'level needs' : 'levels need'} two pictures and 3 to 10 spots before you can save.`;
  else if (dirty) status = 'Unsaved changes. Press Save to keep them.';
  else if (notice) status = notice;

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FBF4E9', padding: '12px 0', margin: '-12px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, boxShadow: '0 8px 8px -8px rgba(90,64,56,0.18)' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Spot the Differences</h1>
          <p style={{ margin: '6px 0 0', color: '#7A6458', fontSize: 15 }}>Two pictures and 3 to 10 spots per level. Turn a level off to keep it as a draft; you can still preview it as the child.</p>
        </div>
        <div style={{ flex: '0 0 auto', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <CardsHeaderActions dirty={dirty} busy={busy} canSave={canSave} onRevert={revert} onSave={doSave} />
          <span role="status" style={{ fontSize: 13, color: '#7A6458', maxWidth: 420, textAlign: 'right' }}>{status}</span>
        </div>
      </div>

      {error && <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700, fontSize: 14 }}>{error}</p>}
      {warning && <p role="status" style={{ margin: 0, color: '#7A5410', fontWeight: 700, fontSize: 14 }}>{warning}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {draft.map((l, i) => (
          <SpotLevelPanel
            key={l.id} l={l} n={i + 1} count={draft.length} message={msgs[l.id] ?? null} shapeWarning={shapeOff(l)}
            onEdit={(patch) => edit(l.id, patch)}
            onPick={(side, f) => pick(l.id, side, f)}
            onSvg={(side, code) => applySvg(l.id, side, code)}
            onMove={(dir) => { touch(); setDraft(moveLevel(draft, i, dir)); }}
            onAskDelete={() => setConfirm(i)}
          />
        ))}
        <button type="button" onClick={add} className={`${s.btn} ${s.dash}`} style={{ minHeight: 96, borderRadius: 18, border: '2px dashed #D9C6B2', background: 'transparent', color: '#5A4038', fontSize: 16, fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add level
        </button>
      </div>

      {doomed && (
        <ConfirmDialog
          title={`Delete level ${confirm! + 1}?`}
          body="The level will be removed when you save, and its picture files are freed then. Revert brings it back until you save."
          button="Delete level"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { touch(); setDraft(draft.filter((_, k) => k !== confirm)); say(doomed.id, null); setConfirm(null); }}
        />
      )}
    </>
  );
}
