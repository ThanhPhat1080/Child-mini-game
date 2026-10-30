/** The current object's word (F3): large, in a rounded peach bar, with a speaker button that says it again. Picture-free: the word is the child-facing text the admin typed. */
/** Words longer than this use the smaller size, so they fit on at most two lines in the fixed-height bar. */
const LONG_WORD = 18;

export function FindPrompt({ word, onSay, keyId }: { word: string; onSay: () => void; keyId: number }) {
  const fontSize = word.length > LONG_WORD ? 48 : 96;
  return (
    <div
      data-find-prompt
      style={{ display: 'flex', alignItems: 'center', gap: 28, width: 'fit-content', maxWidth: 1600, margin: '0 auto', padding: '12px 16px 12px 56px', borderRadius: 70, background: '#FCEFE2', border: '8px solid #F2C9A8', boxShadow: '0 8px 0 #EADCC8', boxSizing: 'border-box' }}
    >
      <span
        key={keyId}
        data-find-word
        className="hm-find-word"
        style={{ fontFamily: "'Baloo 2', 'Nunito', sans-serif", fontSize, fontWeight: 700, lineHeight: 1.1, color: '#B5703A', overflowWrap: 'anywhere' }}
      >
        {word}
      </span>
      <button
        type="button"
        aria-label="Say the word again"
        onClick={onSay}
        className="hm-tap"
        style={{ width: 110, height: 110, flex: 'none', borderRadius: 55, border: 'none', background: '#fff', boxShadow: '0 8px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
      >
        <svg aria-hidden="true" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#B5703A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></svg>
      </button>
    </div>
  );
}
