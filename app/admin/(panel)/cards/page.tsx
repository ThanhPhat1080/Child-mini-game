'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { duplicateWords, isCardComplete, loadCards, newCard, saveCards, type ECard } from '@/lib/memory/adminCards';
import { LEVELS, pairsOf } from '@/lib/memory/deck';
import { sayWord } from '@/lib/memory/cards';
import { MAX_IMAGE_BYTES, addPending, clearPending, svgToPending } from '@/lib/media';
import { checkSvg } from '@/lib/quizImport';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CARD_IMG_TYPES, CardPanel, MAX_SOUND_BYTES, cardAudioType, poolHealth } from '@/components/admin/CardPanel';
import s from '@/components/admin/admin-ui.module.css';

/** Memory Match card pool (A11) with pool health (A13). Nothing is uploaded or written until Save (T15). */
export default function CardsPage() {
  const [saved, setSaved] = useState<ECard[] | null>(null);
  const [draft, setDraft] = useState<ECard[] | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await loadCards();
      setSaved(fresh); setDraft(fresh);
      return true;
    } catch (e) { setError((e as Error).message); return false; }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // picked files live in memory until Save (T15); free their previews when leaving
  useEffect(() => () => clearPending(), []);

  const dirty = useMemo(() => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false), [draft, saved]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!draft || !saved) {
    return (
      <>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Memory cards</h1>
        {error ? <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700 }}>{error}</p> : <p style={{ color: '#7A6458' }}>Loading…</p>}
      </>
    );
  }

  const incomplete = draft.filter((c) => !isCardComplete(c)).length;
  const canSave = dirty && incomplete === 0 && !busy;
  const dups = duplicateWords(draft);
  const active = draft.filter((c) => c.active).length;

  const touch = () => { setNotice(null); setError(null); setWarning(null); };
  const edit = (id: string, patch: Partial<ECard>) => { touch(); setDraft(draft.map((c) => (c.id === id ? { ...c, ...patch } : c))); };
  const say = (id: string, text: string | null) => setMsgs((m) => { const n = { ...m }; if (text) n[id] = text; else delete n[id]; return n; });

  function pick(id: string, picked: File, kind: 'image' | 'audio') {
    let f = picked;
    if (kind === 'image') {
      if (!CARD_IMG_TYPES.includes(f.type)) return say(id, 'Use a PNG, JPG, WebP or SVG picture.');
      if (f.size > MAX_IMAGE_BYTES) return say(id, 'Image must be 2 MB or smaller.');
    } else {
      const type = cardAudioType(f.type);
      if (!type) return say(id, 'Use an MP3, M4A or WAV sound.');
      if (f.size > MAX_SOUND_BYTES) return say(id, 'Sound must be 10 MB or smaller.');
      // the bucket only knows the standard names (e.g. Chrome calls .m4a "audio/x-m4a")
      if (type !== f.type) f = new File([f], f.name, { type });
    }
    try {
      const path = addPending(f); // preview only; uploaded when you press Save
      say(id, null);
      edit(id, { [kind]: path });
    } catch (e) { say(id, (e as Error).message); }
  }

  function applySvg(id: string, code: string) {
    // same rules as the Quiz import: no scripts, handlers, embeds or outside links; valid XML; normalized text
    const r = checkSvg(code);
    if ('error' in r) return say(id, `${r.error}.`);
    say(id, null);
    edit(id, { image: svgToPending(r.svg) }); // identical drawings share one pending file
  }

  function add() {
    const c = newCard();
    touch();
    setDraft([...draft!, c]);
    setFocusId(c.id);
  }

  function revert() {
    clearPending(); // nothing was uploaded, so there is nothing to delete
    setDraft(saved); setMsgs({}); touch();
  }

  async function doSave() {
    if (!draft || !saved || !canSave) return;
    setBusy(true); touch();
    const r = await saveCards(saved, draft);
    if (r.error) { setError(r.error); setBusy(false); return; }
    if (r.warning) setWarning(r.warning);
    if (await load()) { clearPending(); setMsgs({}); setNotice('Saved'); }
    setBusy(false);
  }

  const doomed = confirm !== null ? draft[confirm] : null;
  let status = 'All changes saved.';
  if (busy) status = 'Saving…';
  else if (incomplete) status = `${incomplete} ${incomplete === 1 ? 'card needs' : 'cards need'} a picture and a word before you can save.`;
  else if (dirty) status = 'Unsaved changes. Press Save to keep them.';
  else if (notice) status = notice;

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FBF4E9', padding: '12px 0', margin: '-12px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, boxShadow: '0 8px 8px -8px rgba(90,64,56,0.18)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Memory cards</h1>
          <p style={{ margin: '6px 0 0', color: '#7A6458', fontSize: 15 }}>Pictures and words for the Memory Match game. Turn a card off to keep it out of the game.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={revert} disabled={!dirty || busy} className={`${s.btn} ${s.ghost}`} style={{ height: 44, padding: '0 20px', borderRadius: 12, border: '1.5px solid #E3D5C4', background: '#fff', color: '#4A3830', fontSize: 15, fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', opacity: dirty ? 1 : 0.5 }}>Revert</button>
            <button type="button" onClick={doSave} disabled={!canSave} className={s.btn} style={{ height: 44, padding: '0 22px', borderRadius: 12, border: 'none', background: '#5A4038', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', opacity: canSave ? 1 : 0.6 }}>Save</button>
          </div>
          <span role="status" style={{ fontSize: 13, color: '#7A6458', maxWidth: 420, textAlign: 'right' }}>{status}</span>
        </div>
      </div>

      {error && <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700, fontSize: 14 }}>{error}</p>}
      {warning && <p role="status" style={{ margin: 0, color: '#7A5410', fontWeight: 700, fontSize: 14 }}>{warning}</p>}

      <section style={{ background: '#fff', borderRadius: 18, padding: '18px 22px', boxShadow: '0 1px 0 #EADCC8', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Levels</h2>
        <p data-testid="pool-health" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{poolHealth(active)}</p>
        <p style={{ margin: 0, fontSize: 13, color: '#7A6458' }}>
          Each level needs {LEVELS.map((l) => pairsOf(l)).join(' / ')} active cards ({LEVELS.join(' / ')} cards on the table).{dirty ? ' Counts include unsaved changes.' : ''}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
        {draft.map((c, i) => (
          <CardPanel
            key={c.id} c={c} n={i + 1} autoFocus={c.id === focusId}
            duplicate={dups.has(c.word.trim().toLowerCase())} message={msgs[c.id] ?? null}
            onEdit={(patch) => edit(c.id, patch)}
            onPickImage={(f) => pick(c.id, f, 'image')}
            onPickAudio={(f) => pick(c.id, f, 'audio')}
            onSvg={(code) => applySvg(c.id, code)}
            onPlay={() => sayWord({ word: c.word.trim(), audio_path: c.audio })}
            onAskDelete={() => setConfirm(i)}
          />
        ))}
        <button type="button" onClick={add} className={`${s.btn} ${s.dash}`} style={{ minHeight: 200, borderRadius: 18, border: '2px dashed #D9C6B2', background: 'transparent', color: '#5A4038', fontSize: 16, fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add card
        </button>
      </div>

      {doomed && (
        <ConfirmDialog
          title={`Delete “${doomed.word.trim() || `card ${confirm! + 1}`}”?`}
          body="The card will be removed when you save, and its picture and sound files are freed then. Revert brings it back until you save."
          button="Delete card"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { touch(); setDraft(draft.filter((_, k) => k !== confirm)); say(doomed.id, null); setConfirm(null); }}
        />
      )}
    </>
  );
}
