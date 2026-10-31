import s from '@/components/admin/admin-ui.module.css';

/** Cards page header controls (A12, A11): Quick import cards (only when `onImport` is given), Revert, Save. The Spot levels page reuses it without import, on one wrapping row. */
export function CardsHeaderActions(p: { dirty: boolean; busy: boolean; canSave: boolean; onImport?: () => void; onAdd?: () => void; onRevert: () => void; onSave: () => void }) {
  const font = 'Nunito, sans-serif';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
      {p.onImport && <button type="button" onClick={p.onImport} disabled={p.busy} className={`${s.btn} ${s.textBtn}`} style={{ height: 44, padding: '0 12px', borderRadius: 12, border: 'none', background: 'none', color: '#3F73B5', fontSize: 15, fontWeight: 700, fontFamily: font, cursor: 'pointer', opacity: p.busy ? 0.5 : 1 }}>Quick import cards</button>}
      {p.onAdd && <button type="button" onClick={p.onAdd} disabled={p.busy} className={s.btn} style={{ height: 44, padding: '0 20px', borderRadius: 12, border: 'none', background: '#3F73B5', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: font, cursor: 'pointer', opacity: p.busy ? 0.6 : 1 }}>Add level</button>}
      <button type="button" onClick={p.onRevert} disabled={!p.dirty || p.busy} className={`${s.btn} ${s.ghost}`} style={{ height: 44, padding: '0 20px', borderRadius: 12, border: '1.5px solid #E3D5C4', background: '#fff', color: '#4A3830', fontSize: 15, fontWeight: 700, fontFamily: font, cursor: 'pointer', opacity: p.dirty ? 1 : 0.5 }}>Revert</button>
      <button type="button" onClick={p.onSave} disabled={!p.canSave} className={s.btn} style={{ height: 44, padding: '0 22px', borderRadius: 12, border: 'none', background: '#5A4038', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: font, cursor: 'pointer', opacity: p.canSave ? 1 : 0.6 }}>Save</button>
    </div>
  );
}
