(() => {
  'use strict';

  // ---------- Config ----------
  const FACE_PATH = 'assets/face.png';   // put the boy's face photo here
  const BEATS_PER_ROUND = 8;              // marker crosses the bar in 8 beats
  const TARGET_BEAT = 7;                  // Space should land on beat 7
  const WIN = { perfect: 0.07, great: 0.14, bad: 0.24 }; // seconds either side
  const POINTS = { perfect: 3, great: 2, bad: 1, miss: 0 };
  const ARROWS = { ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓' };
  const KEYS = Object.keys(ARROWS);

  // ---------- Default cartoon faces (SVG) ----------
  function faceSvg(skin, hair, mouth = 'smile', girl = false) {
    const m = mouth === 'smile'
      ? '<path d="M38 66 Q50 78 62 66" stroke="#7a2e1d" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<ellipse cx="50" cy="69" rx="7" ry="5" fill="#7a2e1d"/>';
    const hairPath = girl
      ? `<path d="M0 0 H100 V100 H86 V40 Q70 26 50 34 Q30 26 14 40 V100 H0Z" fill="${hair}"/>
         <path d="M70 8 l12 -6 v14z M70 8 l-12 -6 v14z" fill="#ff5ea8"/><circle cx="70" cy="8" r="3" fill="#ff9ccc"/>`
      : `<path d="M0 0 H100 V30 Q75 42 50 30 Q25 42 0 30Z" fill="${hair}"/>`;
    const lashes = girl ? '<path d="M29 43 l-4 -4 M71 43 l4 -4" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>' : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${skin}"/>${hairPath}
      <ellipse cx="35" cy="50" rx="5" ry="7" fill="#222"/><ellipse cx="65" cy="50" rx="5" ry="7" fill="#222"/>${lashes}
      <circle cx="37" cy="47" r="1.8" fill="#fff"/><circle cx="67" cy="47" r="1.8" fill="#fff"/>
      <circle cx="25" cy="62" r="6" fill="#ff8a8a" opacity=".5"/><circle cx="75" cy="62" r="6" fill="#ff8a8a" opacity=".5"/>
      ${m}</svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  const DEFAULT_FACE = { boy: faceSvg('#f2c094', '#2b1a10'), girl: faceSvg('#f2c094', '#3a1f12', 'smile', true) };

  // ---------- Build dancers ----------
  // Main character's gender picks the crew: a boy dances with girls, a girl dances with boys.
  const crew = document.getElementById('crew');
  const BACKUP = {
    boy: [
      ['back l2', faceSvg('#e8b98a', '#6b3b1a', 'o'), { shirt: '#5eea8a', pants: '#333', skin: '#e8b98a' }],
      ['back r2', faceSvg('#f6d0b0', '#111'), { shirt: '#c45eff', pants: '#2e2e6e', skin: '#f6d0b0' }],
      ['back l', faceSvg('#d9a77a', '#3a2a1a'), { shirt: '#4dc3ff', pants: '#553', skin: '#d9a77a' }],
      ['back r', faceSvg('#f2c094', '#8a4b20', 'o'), { shirt: '#ffd84d', pants: '#7a2e5a', skin: '#f2c094' }],
    ],
    girl: [
      ['back l2', faceSvg('#e8b98a', '#2b1a10', 'smile', true), { shirt: '#ff9ccc', dress: '#ff5ea8', pants: '#e8b98a', skin: '#e8b98a', hair: '#2b1a10' }],
      ['back r2', faceSvg('#f6d0b0', '#8a4b20', 'o', true), { shirt: '#9be7ff', dress: '#4dc3ff', pants: '#f6d0b0', skin: '#f6d0b0', hair: '#8a4b20' }],
      ['back l', faceSvg('#d9a77a', '#111', 'o', true), { shirt: '#fff3a0', dress: '#ffd84d', pants: '#d9a77a', skin: '#d9a77a', hair: '#111' }],
      ['back r', faceSvg('#f2c094', '#5a3418', 'smile', true), { shirt: '#c9f7d8', dress: '#5eea8a', pants: '#f2c094', skin: '#f2c094', hair: '#5a3418' }],
    ],
  };
  const MAIN_COLORS = {
    boy: { shirt: '#1d3fbf', pants: '#f4f4ff', skin: '#f2c094', shoe: '#ffd84d' },
    girl: { shirt: '#ff7fbf', dress: '#ff9fd2', pants: '#f2c094', skin: '#f2c094', shoe: '#fff', hair: '#3a1f12' },
  };
  function makeDancer(cls, face, colors, kind) {
    const main = cls.includes('main');
    const d = document.createElement('div');
    d.className = `dancer ${cls} ${kind} st-bounce`;
    Object.entries(colors).forEach(([k, v]) => d.style.setProperty('--' + k, v));
    const girl = kind === 'girl';
    const hat = main && !girl ? '<div class="part hat"><div class="stick"></div><div class="prop"></div><div class="ball"></div></div>' : '';
    const tiara = main && girl ? '<div class="part tiara"><i></i><i></i><i></i></div>' : '';
    d.innerHTML = `
      <div class="shadow"></div>
      <div class="spinner"><div class="body">
        ${main && !girl ? '<div class="part cape"></div>' : ''}
        ${girl ? '<div class="part hair-back"></div>' : ''}
        <div class="part arm l"></div><div class="part arm r"></div>
        <div class="part leg l"></div><div class="part leg r"></div>
        <div class="part neck"></div>
        <div class="part torso"></div>
        ${girl ? '<div class="part skirt"></div>' : ''}
        ${main && !girl ? '<div class="part bowtie"></div>' : ''}
        <div class="part head"><div class="ear l"></div><div class="ear r"></div><img class="face" alt="" src="${face}"></div>
        ${hat}${tiara}
      </div></div>`;
    crew.appendChild(d);
    return d;
  }

  let gender = 'boy', customFace = null, dancers = [], mainFace = null;
  try { if (localStorage.getItem('dance.gender') === 'girl') gender = 'girl'; } catch (e) { /* ignore */ }
  function buildCrew() {
    crew.innerHTML = '';
    const backKind = gender === 'boy' ? 'girl' : 'boy';
    dancers = BACKUP[backKind].map(([cls, face, colors]) => makeDancer(cls, face, colors, backKind));
    dancers.push(makeDancer('main', customFace || DEFAULT_FACE[gender], MAIN_COLORS[gender], gender));
    mainFace = dancers[dancers.length - 1].querySelector('.face');
  }
  buildCrew();

  // Face: uploaded (saved) > assets/face.png > cartoon default for the chosen gender
  function setMainFace(src) { customFace = src; mainFace.src = src; }
  function probeAssetFace() {
    const probe = new Image();
    probe.onload = () => setMainFace(FACE_PATH);
    probe.src = FACE_PATH;
  }
  let saved = null;
  try { saved = localStorage.getItem('dance.face'); } catch (e) { /* ignore */ }
  if (saved) setMainFace(saved); else probeAssetFace();
  document.getElementById('faceInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      // Downscale to keep localStorage small
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const s = 320, k = Math.min(img.width, img.height);
        c.width = c.height = s;
        c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, s, s);
        const url = c.toDataURL('image/jpeg', 0.88);
        setMainFace(url);
        try { localStorage.setItem('dance.face', url); } catch (err) { /* ignore */ }
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
  document.getElementById('faceReset').addEventListener('click', () => {
    try { localStorage.removeItem('dance.face'); } catch (e) { /* ignore */ }
    customFace = null;
    mainFace.src = DEFAULT_FACE[gender];
    probeAssetFace();
  });
  document.querySelectorAll('.gd').forEach((b) => {
    b.classList.toggle('on', b.dataset.gender === gender);
    b.addEventListener('click', () => {
      gender = b.dataset.gender;
      document.querySelectorAll('.gd').forEach((x) => x.classList.toggle('on', x === b));
      try { localStorage.setItem('dance.gender', gender); } catch (e) { /* ignore */ }
      buildCrew();
    });
  });

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const elArrows = $('arrows'), elMarker = $('marker'), elJudge = $('judge'), elMenu = $('menu');
  const ui = { score: $('score'), combo: $('combo'), level: $('level'), P: $('cntP'), G: $('cntG'), B: $('cntB'), M: $('cntM') };

  // ---------- Audio ----------
  let ctx = null, noise = null, master = null;
  function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, freq, t, dur, vol, freqEnd) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(t, dur, vol, hp) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = hp;
    env(g, t, 0.002, vol, dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  const kick = (t) => tone('sine', 140, t, 0.25, 0.9, 40);
  const snare = (t) => { hiss(t, 0.16, 0.35, 1200); tone('triangle', 200, t, 0.08, 0.25); };
  const hat = (t, v = 0.12) => hiss(t, 0.04, v, 7000);
  // ---- "Happy Birthday" (public domain) as an upbeat 4/4 dance loop ----
  // 8 bars x 4 beats = 32 beats = 4 rounds. Notes: [bar 1-8, start in eighths, length in eighths, MIDI]
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79;
  const SONG = [
    [1, 0, 2, A4], [1, 2, 2, G4], [1, 4, 2, C5], [1, 6, 5, B4],
    [2, 6, 1.5, G4], [2, 7.5, 0.5, G4],
    [3, 0, 2, A4], [3, 2, 2, G4], [3, 4, 2, D5], [3, 6, 5, C5],
    [4, 6, 1.5, G4], [4, 7.5, 0.5, G4],
    [5, 0, 2, G5], [5, 2, 2, E5], [5, 4, 2, C5], [5, 6, 2, B4],
    [6, 0, 4, A4], [6, 6, 1.5, F5], [6, 7.5, 0.5, F5],
    [7, 0, 2, E5], [7, 2, 2, C5], [7, 4, 2, D5], [7, 6, 5, C5],
    [8, 6, 1.5, G4], [8, 7.5, 0.5, G4], // pick-up "Hap-py" into the next loop
  ].map(([bar, e, len, m]) => ({ at: (bar - 1) * 8 + e, len, m }));
  const CHORDS = { C: { bass: 36, tones: [60, 64, 67] }, G: { bass: 43, tones: [59, 62, 67] }, F: { bass: 41, tones: [60, 65, 69] } };
  const HALVES = ['C', 'G', 'G', 'G', 'G', 'C', 'C', 'C', 'C', 'C', 'F', 'F', 'C', 'G', 'C', 'C']; // one chord per half bar
  const LOOP_BEATS = 32, INTRO_BEATS = 4;

  function lead(m, t, dur) {
    tone('square', midi(m), t, dur, 0.07);
    tone('triangle', midi(m + 12), t, dur, 0.05);
  }
  function scheduleBeat(b, t) {
    const beat = 60 / bpm, eighth = beat / 2;
    // Intro bar maps onto bar 8 of the loop, so the song's pick-up lands right before round 1
    const pos = ((b - INTRO_BEATS) % LOOP_BEATS + LOOP_BEATS) % LOOP_BEATS;
    const chord = CHORDS[HALVES[Math.floor(pos / 2)]];
    const intro = b < INTRO_BEATS;
    // Drums: four-on-the-floor, clap on 2 & 4, open hats on the off-beat
    kick(t);
    if (pos % 2 === 1) snare(t);
    hat(t, 0.05); hat(t + eighth, 0.16);
    if (pos === 0 && !intro) hiss(t, 0.8, 0.12, 4000); // crash at the top of the loop
    if (intro) return void SONG.filter((n) => n.at >= pos * 2 && n.at < pos * 2 + 2).forEach((n) => lead(n.m, t + (n.at - pos * 2) * eighth, n.len * eighth * 0.9));
    // Octave disco bass + off-beat chord stabs
    tone('square', midi(chord.bass), t, eighth * 0.8, 0.1);
    tone('square', midi(chord.bass + 12), t + eighth, eighth * 0.7, 0.08);
    chord.tones.forEach((m) => tone('triangle', midi(m), t + eighth, eighth * 0.5, 0.035));
    // Melody
    SONG.filter((n) => n.at >= pos * 2 && n.at < pos * 2 + 2)
      .forEach((n) => lead(n.m, t + (n.at - pos * 2) * eighth, n.len * eighth * 0.9));
  }
  // Crowd applause: lots of short band-passed noise claps, dense at first then thinning out
  function applause() {
    const t = ctx.currentTime;
    for (let i = 0; i < 90; i++) {
      const at = t + Math.pow(Math.random(), 1.6) * 1.8;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 1800; f.Q.value = 1.2;
      const v = (0.25 + Math.random() * 0.35) * (1 - (at - t) / 2.2);
      env(g, at, 0.001, Math.max(v, 0.01), 0.03 + Math.random() * 0.03);
      s.connect(f).connect(g).connect(master);
      const off = Math.random() * 0.4;
      s.start(at, off, 0.1); s.stop(at + 0.12);
    }
  }
  const sfx = {
    tap: () => tone('triangle', 880, ctx.currentTime, 0.06, 0.2),
    wrong: () => tone('sawtooth', 160, ctx.currentTime, 0.3, 0.25, 80),
    perfect: () => { [0, 4, 7, 12].forEach((s, i) => tone('triangle', 660 * Math.pow(2, s / 12), ctx.currentTime + i * 0.05, 0.15, 0.2)); applause(); },
    great: () => [0, 7].forEach((s, i) => tone('triangle', 660 * Math.pow(2, s / 12), ctx.currentTime + i * 0.06, 0.15, 0.2)),
    bad: () => tone('triangle', 440, ctx.currentTime, 0.15, 0.2),
    miss: () => tone('sawtooth', 220, ctx.currentTime, 0.35, 0.2, 110),
  };

  // ---------- Game state ----------
  let bpm = 110, playing = false, t0 = 0, nextBeatIdx = 0, nextBeatTime = 0, schedTimer = 0, raf = 0;
  let roundIdx = -1, round = null, lastBeatSeen = -99, pendingState = null;
  let score = 0, combo = 0, counts = { perfect: 0, great: 0, bad: 0, miss: 0 };

  const beatLen = () => 60 / bpm;
  const roundLen = () => beatLen() * BEATS_PER_ROUND;
  const now = () => ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  // Arrow plan: 4,5,6,7,8 arrows for 3 rounds each, then 9,10,11 for 3 rounds each, then 12 until the stage ends
  const PLAN = [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]], LAST_COUNT = 12;
  function planStep(k) {
    for (let i = 0, end = 0; i < PLAN.length; i++) { end += PLAN[i][1]; if (k < end) return i; }
    return PLAN.length;
  }
  const arrowCount = (k) => (PLAN[planStep(k)] || [LAST_COUNT])[0];
  const STAGE_SECONDS = 120; // one stage is about 2 minutes, rounded to whole rounds
  let totalRounds = 0, endTime = 0, lastSecShown = -1;
  const elTimer = $('timer');

  // Beat bar layout
  (function drawBar() {
    const ticks = $('ticks');
    for (let i = 1; i < BEATS_PER_ROUND; i++) {
      const t = document.createElement('i'); t.style.left = (i / BEATS_PER_ROUND * 100) + '%'; ticks.appendChild(t);
    }
  })();
  function layoutZones() {
    const c = TARGET_BEAT / BEATS_PER_ROUND * 100, rl = roundLen();
    [['zone-bad', WIN.bad], ['zone-great', WIN.great], ['zone-perfect', WIN.perfect]].forEach(([id, w]) => {
      const el = $(id); el.style.left = c + '%'; el.style.width = (w * 2 / rl * 100) + '%';
    });
  }

  function setDance(state) {
    // state: 'bounce' | 'm1'..'m4'; applied on the next beat so it stays in time
    pendingState = state;
  }
  function applyDance(state, spin) {
    dancers.forEach((d) => {
      d.classList.remove('st-bounce', 'st-m1', 'st-m2', 'st-m3', 'st-m4', 'spin');
      void d.offsetWidth; // restart animations on the beat
      d.classList.add('st-' + state);
      if (spin) d.classList.add('spin');
    });
  }

  function showJudge(kind, text) {
    elJudge.className = '';
    void elJudge.offsetWidth;
    elJudge.textContent = text || kind.toUpperCase();
    elJudge.className = kind + ' show';
  }
  function updateHud() {
    ui.score.textContent = score; ui.combo.textContent = combo;
    ui.level.textContent = planStep(Math.max(roundIdx, 0)) + 1;
    ui.P.textContent = counts.perfect; ui.G.textContent = counts.great; ui.B.textContent = counts.bad; ui.M.textContent = counts.miss;
  }

  function startRound(k) {
    roundIdx = k;
    const n = arrowCount(k);
    const seq = [];
    for (let i = 0; i < n; i++) seq.push(KEYS[Math.floor(Math.random() * 4)]);
    round = { seq, idx: 0, state: 'input', start: t0 + k * roundLen() };
    elArrows.className = '';
    elArrows.innerHTML = seq.map((key) => `<div class="arr">${ARROWS[key]}</div>`).join('');
    updateHud();
  }

  function judge(kind) {
    round.state = 'judged';
    counts[kind]++;
    score += POINTS[kind];
    if (kind === 'miss') {
      combo = 0;
      elArrows.classList.add('dead');
      setDance('bounce');
    } else {
      combo++;
      const moves = ['m1', 'm2', 'm3', 'm4'];
      pendingSpin = kind === 'perfect';
      setDance(moves[Math.floor(Math.random() * moves.length)]);
    }
    if (kind === 'perfect' || kind === 'great') confetti(kind === 'perfect' ? 40 : 15);
    showJudge(kind, kind === 'miss' ? 'MISS' : kind.toUpperCase() + (combo > 1 ? ' x' + combo : ''));
    sfx[kind]();
    updateHud();
  }
  let pendingSpin = false;

  const CONFETTI = ['#ff5ea8', '#ffd84d', '#4dc3ff', '#5eea8a', '#c45eff', '#fff'];
  function confetti(n) {
    const stage = document.getElementById('stage');
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = CONFETTI[i % CONFETTI.length];
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      c.style.animationDuration = (1.8 + Math.random()) + 's';
      stage.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (playing) stop(); return; }
    if (!playing) return;
    if (!KEYS.includes(e.key) && e.code !== 'Space') return;
    e.preventDefault();
    if (e.repeat || !round || round.state === 'judged' || now() < round.start) return;

    if (e.code === 'Space') {
      if (round.state !== 'ready') { judge('miss'); return; }
      const dt = Math.abs(now() - (round.start + TARGET_BEAT * beatLen()));
      judge(dt <= WIN.perfect ? 'perfect' : dt <= WIN.great ? 'great' : dt <= WIN.bad ? 'bad' : 'miss');
      return;
    }
    if (round.state !== 'input') return; // extra arrows after finishing are ignored
    const box = elArrows.children[round.idx];
    if (e.key === round.seq[round.idx]) {
      box.classList.add('hit');
      round.idx++;
      sfx.tap();
      if (round.idx === round.seq.length) { round.state = 'ready'; elArrows.classList.add('ready'); }
    } else {
      sfx.wrong();
      const zoneStart = round.start + TARGET_BEAT * beatLen() - WIN.bad;
      if (now() >= zoneStart) { box.classList.add('wrong'); judge('miss'); return; }
      // Before the bright zone: flash red, clear the sequence and let the player type it again
      round.idx = 0;
      const boxes = [...elArrows.children];
      boxes.forEach((b) => b.classList.remove('hit'));
      boxes.forEach((b) => b.classList.add('wrong'));
      const r = round;
      setTimeout(() => { if (round === r) boxes.forEach((b) => b.classList.remove('wrong')); }, 250);
    }
  }

  function scheduler() {
    while (nextBeatTime < ctx.currentTime + 0.12) {
      scheduleBeat(nextBeatIdx, nextBeatTime);
      nextBeatIdx++;
      nextBeatTime += beatLen();
    }
  }

  function loop() {
    if (!playing) return;
    const t = now();
    const rel = t - t0;
    // Countdown during the intro bar
    if (rel < 0) {
      const b = Math.floor(rel / beatLen()); // -4..-1
      if (b !== lastBeatSeen) { lastBeatSeen = b; showJudge('count', b === -1 ? 'NHẢY!' : String(-b - 1)); }
      elMarker.style.left = '0%';
      drawTimer(totalRounds * roundLen());
      raf = requestAnimationFrame(loop);
      return;
    }
    const k = Math.floor(rel / roundLen());
    if (k !== roundIdx) {
      if (round && round.state !== 'judged') judge('miss');
      if (k >= totalRounds) { finish(); return; }
      startRound(k);
    }
    drawTimer(endTime - t);
    // Too late for Space -> miss
    if (round.state !== 'judged' && t > round.start + TARGET_BEAT * beatLen() + WIN.bad) {
      judge('miss');
    }
    elMarker.style.left = ((t - round.start) / roundLen() * 100) + '%';
    // Apply queued dance change on each beat boundary
    const beatNo = Math.floor(rel / beatLen());
    if (beatNo !== lastBeatSeen) {
      lastBeatSeen = beatNo;
      if (pendingState) { applyDance(pendingState, pendingSpin); pendingState = null; pendingSpin = false; }
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    initAudio();
    ctx.resume();
    document.documentElement.style.setProperty('--beat', beatLen() + 's');
    layoutZones();
    score = 0; combo = 0; counts = { perfect: 0, great: 0, bad: 0, miss: 0 };
    roundIdx = -1; round = null; lastBeatSeen = -99; pendingState = null;
    elArrows.innerHTML = '';
    const begin = ctx.currentTime + 0.15;
    nextBeatIdx = 0; nextBeatTime = begin;
    t0 = begin + 4 * beatLen(); // one-bar intro with countdown
    totalRounds = Math.round(STAGE_SECONDS / roundLen());
    endTime = t0 + totalRounds * roundLen();
    lastSecShown = -1;
    $('result').hidden = true;
    applyDance('bounce');
    updateHud();
    playing = true;
    elMenu.classList.add('hidden');
    if (document.activeElement) document.activeElement.blur();
    schedTimer = setInterval(scheduler, 25);
    scheduler();
    raf = requestAnimationFrame(loop);
  }
  // Top-centre countdown; the last 5 seconds grow big with a beep each second
  function drawTimer(left) {
    const sec = Math.max(0, Math.ceil(left));
    if (sec === lastSecShown) return;
    lastSecShown = sec;
    if (sec <= 5 && sec > 0) {
      elTimer.textContent = sec;
      elTimer.className = '';
      void elTimer.offsetWidth;
      elTimer.className = 'alert';
      $('stage').classList.add('final');
      if (ctx) tone('square', 1046, ctx.currentTime, 0.12, 0.25);
    } else {
      elTimer.className = '';
      $('stage').classList.remove('final');
      elTimer.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
  }
  function finish() {
    stop();
    elTimer.className = '';
    elTimer.textContent = '0:00';
    $('stage').classList.remove('final');
    showJudge('count', 'HẾT GIỜ!');
    $('result').hidden = false;
    $('resScore').textContent = score;
    $('resDetail').textContent = `Perfect ${counts.perfect} · Great ${counts.great} · Bad ${counts.bad} · Miss ${counts.miss}`;
    $('start').textContent = '▶ Chơi lại';
  }
  function stop() {
    playing = false;
    clearInterval(schedTimer);
    cancelAnimationFrame(raf);
    applyDance('bounce');
    elMenu.classList.remove('hidden');
    $('start').focus();
  }

  document.addEventListener('keydown', onKey);
  $('start').addEventListener('click', start);
  document.querySelectorAll('.sp').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.sp').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); bpm = Number(b.dataset.bpm);
  }));
  // Prevent Space on a focused button from re-clicking during play
  document.addEventListener('keyup', (e) => { if (playing && e.code === 'Space') e.preventDefault(); });
  layoutZones();
  updateHud();
})();
