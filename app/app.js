// Leonida Trophy Atlas — tracker, filters, spoiler mode, export/import, roadmap.
// Loads only data/trophies.json (a file in app/); makes no network requests.
const EARNED_KEY = 'gta6-trophy-atlas-earned-v1';
const SPOILER_KEY = 'gta6-trophy-atlas-spoiler-v1';
const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const stagesEl = document.getElementById('stages');
const missableEl = document.getElementById('missableList');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const earnedFilterEl = document.getElementById('earnedFilter');
const spoilerEl = document.getElementById('spoiler');
const params = new URLSearchParams(location.search);
// Deep-link views used for screenshots and sharing: instead of scrolling,
// the requested section is moved to the top of the page at load, because
// headless Chrome screenshots do not repaint scrolled content reliably.
if (params.get('view') === 'roadmap') document.body.classList.add('shot-roadmap');
if (params.get('view') === 'missable') document.body.classList.add('shot-missable');
if (params.get('detail')) document.body.classList.add('shot-detail');

let trophies = [];
let earned = new Set(readJson(EARNED_KEY, []));
let kindFilter = params.get('kind') || 'all';
let openId = params.get('detail') ? Number(params.get('detail')) : null;

function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
}
function saveEarned() { localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort())); }
function kindLabel(t) { return t.kind === 'feats' ? 'Feats' : t.kind[0].toUpperCase() + t.kind.slice(1); }
function isStory(t) { return t.kind === 'story'; }

const STAGES = [
  { n: 1, title: 'Stage 1 — Story: Chapters 1–4 & the finale', note: 'Play the story in order. Chapters 1–4, then the final mission (gold). Do each named mission when it first appears.' },
  { n: 2, title: 'Stage 2 — Named missions & stranger strands', note: 'Breakfast Run, The Cartel Heist, Child’s Play, Headliners, VCIA Takedown, Operation Savage Glory, plus the final missions for Andy, Kenton, Billy, Randy and Tyrone — 8 stranger strands in total for the silver.' },
  { n: 3, title: 'Stage 3 — Activities & skills', note: '250 stunts, 9 activity types, 42 Shooting Range golds, 14 drone-race wins, 20 race wins, fishing vs Cal, arcade, bowling, hunting for Bret, 50 challenges, melee drive-by, Scooter Bros registrations.' },
  { n: 4, title: 'Stage 4 — Collectibles & exploration', note: '18 meditation spots, 3 card sets, WAiNK It at 100 locations, 100 vehicles discovered, all 52 areas of Leonida, all 8 garage properties.' },
  { n: 5, title: 'Stage 5 — Feats, combat & economy', note: 'Partner wanted-level escapes, 3 shops back-to-back, 5 in one Combat Focus, VCIA departure, Rhino, undetected jewelry robbery, 5 bank vaults, armored truck, one illegal operation per gang (9), Ocean Beach cocktail, showroom smash, 500 choices, second-try success, strange event, $250,000 laundered, $100,000 spent.' },
  { n: 6, title: 'Stage 6 — Platinum cleanup', note: 'Check the in-game completion stats, mop up the last few percent for 100% Completion (gold), and the platinum pops with it.' },
];

function renderStages() {
  stagesEl.replaceChildren();
  for (const s of STAGES) {
    const mine = trophies.filter((t) => t.stage === s.n);
    const done = mine.filter((t) => earned.has(t.name)).length;
    const li = document.createElement('li');
    const title = document.createElement('div'); title.className = 'stage-title'; title.textContent = s.title;
    const count = document.createElement('div'); count.className = 'stage-count'; count.textContent = `${done} / ${mine.length} earned in this stage`;
    const note = document.createElement('div'); note.className = 'stage-trophies'; note.textContent = s.note;
    const names = document.createElement('div'); names.className = 'stage-trophies'; names.textContent = mine.map((t) => t.name).join(' · ');
    li.append(title, count, note, names);
    stagesEl.append(li);
  }
}

function renderMissable() {
  const miss = trophies.filter((t) => t.missable);
  missableEl.replaceChildren();
  for (const t of miss) {
    const li = document.createElement('li');
    const tag = document.createElement('span'); tag.className = 'missable-tag'; tag.textContent = 'MISSABLE';
    const name = document.createElement('div'); name.className = 'm-name'; name.textContent = `${earned.has(t.name) ? '✓ ' : '⚠ '}${t.name} — ${t.grade}`;
    const why = document.createElement('div'); why.className = 'm-why'; why.textContent = `Official description: “${t.description}” — it names one mission or one-time moment, so do it when it first appears.`;
    li.append(tag, name, why);
    missableEl.append(li);
  }
}

function matches(t) {
  if (document.body.classList.contains('shot-detail') && openId && t.id !== openId) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedFilterEl.value === 'earned' && !earned.has(t.name)) return false;
  if (earnedFilterEl.value === 'unearned' && earned.has(t.name)) return false;
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.source || '')).toLowerCase().includes(q)) return false;
  return true;
}

function renderList() {
  const spoiler = spoilerEl.checked;
  listEl.replaceChildren();
  const shown = trophies.filter(matches);
  emptyEl.hidden = shown.length > 0;
  for (const t of shown) {
    const isEarned = earned.has(t.name);
    const hideSpoiler = spoiler && isStory(t) && !isEarned;
    const card = document.createElement('article');
    card.className = 'card' + (isEarned ? ' earned' : '') + (openId === t.id ? ' open' : '');
    card.id = 'trophy-' + t.id;
    const top = document.createElement('div'); top.className = 'card-top';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = isEarned; box.setAttribute('aria-label', 'Mark earned: ' + t.name);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => { if (box.checked) earned.add(t.name); else earned.delete(t.name); saveEarned(); renderAll(); });
    const body = document.createElement('div');
    const name = document.createElement('div'); name.className = 'card-name';
    name.textContent = hideSpoiler ? 'Hidden story trophy — earn it to reveal' : t.name;
    if (hideSpoiler) {
      // Spoiler-safe hover tip: hovering a hidden card briefly reveals its
      // name only; the description and guide stay hidden until earned.
      name.title = 'Spoiler-safe: hover to reveal the trophy name';
      name.addEventListener('mouseenter', () => { name.textContent = t.name; });
      name.addEventListener('mouseleave', () => { name.textContent = 'Hidden story trophy — earn it to reveal'; });
      card.title = 'Spoiler-safe: hover to reveal the trophy name — details stay hidden until earned';
    }
    const desc = document.createElement('div'); desc.className = hideSpoiler ? 'hidden-spoiler' : 'card-desc';
    desc.textContent = hideSpoiler ? 'Spoiler-safe mode hides this story trophy’s name and description until you earn it.' : '“' + t.description + '” — official description, as PlayStation publishes it.';
    const badges = document.createElement('div'); badges.className = 'badges';
    for (const [txt, cls] of [[t.grade, t.grade], [kindLabel(t), 'kind'], ...(t.missable ? [['MISSABLE', 'missable']] : []), ...(t.count ? [[`Count: ${t.count.toLocaleString()}`, 'kind']] : [])]) {
      const b = document.createElement('span'); b.className = 'badge ' + cls; b.textContent = txt; badges.append(b);
    }
    body.append(name, desc, badges);
    top.append(box, body);
    card.append(top);
    if (openId === t.id) {
      const guide = document.createElement('div'); guide.className = 'guide';
      const h = document.createElement('h3'); h.textContent = 'Guide — our own words';
      const p = document.createElement('p'); p.textContent = hideSpoiler ? 'Guide hidden by spoiler-safe mode until earned.' : t.guide;
      const src = document.createElement('p'); src.className = 'source';
      const strong = document.createElement('strong'); strong.textContent = 'Source: ';
      src.append(strong, document.createTextNode('PlayStation official trophy metadata (pre-release)'));
      const detail = document.createElement('p'); detail.className = 'source';
      detail.textContent = 'Guide source: ' + (t.source || 'PlayStation official trophy list (via PSNProfiles / Exophase)');
      guide.append(h, p, src, detail);
      card.append(guide);
    } else {
      const srcLine = document.createElement('div'); srcLine.className = 'source'; srcLine.textContent = 'Source: PlayStation official trophy metadata (pre-release)';
      const hint = document.createElement('div'); hint.className = 'source'; hint.textContent = 'Click to open the guide and its sources.';
      card.append(srcLine, hint);
    }
    card.addEventListener('click', () => { openId = openId === t.id ? null : t.id; renderList(); if (openId === t.id) document.getElementById('trophy-' + t.id).scrollIntoView({ block: 'nearest' }); });
    listEl.append(card);
  }
  document.getElementById('listHeading').textContent = `Full checklist — ${shown.length} of 55 trophies shown`;
}

function renderProgress() {
  const done = trophies.filter((t) => earned.has(t.name)).length;
  const other = trophies.filter((t) => t.id !== 1 && earned.has(t.name)).length;
  document.getElementById('progressText').textContent = `${done} of ${trophies.length} earned`;
  document.getElementById('progressPct').textContent = trophies.length ? Math.round((done / trophies.length) * 100) + '%' : '0%';
  document.getElementById('barFill').style.width = (trophies.length ? (done / trophies.length) * 100 : 0) + '%';
  document.getElementById('platProgress').textContent = `${other} / 54 other trophies`;
  const byGrade = {};
  for (const t of trophies) byGrade[t.grade] = (byGrade[t.grade] || 0) + (earned.has(t.name) ? 1 : 0);
  document.getElementById('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${g}: ${byGrade[g] || 0}`).join(' · ');
  const miss = trophies.filter((t) => t.missable);
  const missDone = miss.filter((t) => earned.has(t.name)).length;
  document.getElementById('progressSub').textContent = `Tick a trophy to mark it earned. Progress saved locally in your browser (LocalStorage). Clearing browser data will erase your checklist. Missable: ${missDone} / ${miss.length} done. Online trophies: none in this list — all 55 are earnable solo, offline.`;
}

function renderAll() { renderStages(); renderMissable(); renderList(); renderProgress(); }

document.getElementById('kindFilters').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-kind]'); if (!b) return;
  kindFilter = b.dataset.kind;
  document.querySelectorAll('#kindFilters button').forEach((x) => x.classList.toggle('active', x === b));
  renderList();
});
searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
earnedFilterEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', () => { localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0'); renderList(); });
spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';
if (kindFilter !== 'all') document.querySelectorAll('#kindFilters button').forEach((x) => x.classList.toggle('active', x.dataset.kind === kindFilter));

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = { app: 'gta6-trophy-guide-01', exportedAt: new Date().toISOString(), earned: [...earned].sort() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json'; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveEarned(); renderAll();
  } catch { alert('Invalid trophy save file'); }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set(); saveEarned(); renderAll();
});

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
// Keep the missable filter label honest: it always shows the true count.
const missableCount = trophies.filter((t) => t.missable).length;
const missableBtn = document.querySelector('#kindFilters button[data-kind="missable"]');
if (missableBtn) missableBtn.textContent = `Missable (${missableCount})`;
renderAll();
