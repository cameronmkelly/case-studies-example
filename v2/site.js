(function () {
'use strict';

/* ---------- data ---------- */
const CASES = DATA.cases;
const BY = Object.fromEntries(CASES.map(c => [c.number, c]));
const SK = {
  Triggers:    { full: 'Know your strengths, vulnerabilities and triggers', short: 'Self-knowledge',        doing: 'knowing my strengths, vulnerabilities and triggers' },
  Uncertainty: { full: 'Get used to uncertainty and conflict',              short: 'Uncertainty',           doing: 'getting used to uncertainty and conflict' },
  Outward:     { full: 'Understand yourself but also shift focus outward',  short: 'Outward focus',         doing: 'shifting my focus outward' },
  Values:      { full: 'Choose among competing values',                     short: 'Competing values',      doing: 'choosing among competing values' },
  Adaptive:    { full: 'Distinguish between technical and adaptive',        short: 'Technical or adaptive', doing: 'telling technical problems from adaptive ones' },
  Process:     { full: 'Understand the process challenge',                  short: 'Process challenge',     doing: 'understanding the process challenge' }
};
const SKEYS = Object.keys(SK);
const BOOK = DATA.parts.flatMap(p => p.cases);
const MODES = { book: 'the Book', index: 'the Index', guide: 'the Guide', search: 'Search', plan: 'the Planner', street: 'the Neighborhood' };
const ORD = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mins = c => Math.max(1, Math.ceil(c.words / 230));
const minLabel = c => mins(c) + ' min';
const chip = s => `<li class="chip" style="--c:var(--${s})">${esc(SK[s].full)}</li>`;
const shared = (a, b) => a.skills.filter(s => b.skills.includes(s)).length;

function box(area, prefix) {
  return {
    get(k, d) { try { const v = area.getItem(prefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { area.setItem(prefix + k, JSON.stringify(v)); } catch (e) {} }
  };
}
let local, sess;
try { local = box(localStorage, 'tlal2.'); sess = box(sessionStorage, 'tlal2.'); }
catch (e) { const none = { getItem: () => null, setItem: () => {} }; local = box(none, ''); sess = box(none, ''); }

/* Where the reader came from. Previous and next on a case follow this list. */
let ctx = sess.get('ctx', { mode: 'book', list: BOOK });
function setCtx(mode, list) { ctx = { mode, list }; sess.set('ctx', ctx); }

let read = new Set(local.get('read', []));
let plan = local.get('plan', []).filter(n => BY[n]);
const savePlan = () => local.set('plan', plan);

/* ---------- router ---------- */
let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const seg = path.split('/');
  const params = new URLSearchParams(query || '');
  const view = seg[0] || 'lobby';
  document.body.dataset.view = view;
  document.getElementById('bar').style.width = '0';
  const active = view === 'case' ? ctx.mode : view === 'packet' ? 'plan' : view;
  document.querySelectorAll('.ways a').forEach(a => a.toggleAttribute('aria-current', a.dataset.m === active));
  window.scrollTo(0, 0);
  ({ lobby, book, index: indexView, guide, search, plan: planner, street, packet, case: showCase }[view] || lobby)(seg, params);
}
addEventListener('hashchange', route);

/* ---------- lobby ---------- */
function lobby() {
  const doors = [
    ['book',   'read them in order, like a book',      'The Book', 'Six parts, twenty chapters. It remembers where you stopped.'],
    ['index',  'look something up',                    'The Index', 'Every topic, workplace, skill and title from A to Z.'],
    ['guide',  'be pointed to the right one',          'The Guide', 'Finish one sentence about what you are facing.'],
    ['search', 'find a word or a phrase',              'Search', 'Searches the full text and shows the passages.'],
    ['plan',   'plan a class session',                 'The Planner', 'Compare cases by skill, build a list, print a packet.'],
    ['street', 'walk around and see what is there',    'The Neighborhood', 'One building for each workplace the cases come from.']
  ];
  app.innerHTML = `<section class="lobby">
    <p class="eyebrow">Twenty cases · six ways in</p>
    <h1>I want to&hellip;</h1>
    <ol class="doors">${doors.map(d => `<li><a href="#/${d[0]}">
      <span class="say">${d[1]}</span>
      <span class="what"><b>${d[2]}</b>${d[3]}</span></a></li>`).join('')}</ol>
    <div class="teaser"><span class="eyebrow">Or start from a question</span>
      <a id="tq" href="#"></a>
      <button class="link" id="another">Show another question</button></div>
  </section>`;
  let last = -1;
  const draw = () => {
    let i; do { i = Math.floor(Math.random() * CASES.length); } while (i === last);
    last = i;
    const a = document.getElementById('tq');
    a.textContent = CASES[i].compelling_question;
    a.href = '#/case/' + CASES[i].number;
  };
  document.getElementById('another').onclick = draw;
  document.getElementById('tq').onclick = () => setCtx('book', BOOK);
  draw();
}

/* ---------- 1. the Book ---------- */
function book() {
  setCtx('book', BOOK);
  const last = local.get('last', null);
  const resume = BY[last] && !read.has(last) ? last : BOOK.find(n => !read.has(n));
  const done = BOOK.filter(n => read.has(n)).length;
  const btn = done === 0 ? `<a class="btn" href="#/case/${BOOK[0]}">Begin with chapter one</a>`
    : resume ? `<a class="btn" href="#/case/${resume}">Continue: ${esc(BY[resume].title)}</a>`
    : `<a class="btn" href="#/case/${BOOK[0]}">Read it again</a>`;
  let ch = 0;
  app.innerHTML = `<section class="book">
    <div class="titlepage">
      <p class="eyebrow">The Book</p>
      <h1>Think Like a Leader</h1>
      <p class="sub">Twenty cases in six parts, written by students of the BAS in Leadership and Management</p>
      <p>${btn}</p>
      <p class="meta">${done ? `${done} of ${BOOK.length} read` : 'About ' + CASES.reduce((t, c) => t + mins(c), 0) + ' minutes of reading in all'}${done ? ' · <button class="link" id="reset">Clear my place</button>' : ''}</p>
    </div>
    <h2 class="contents">Contents</h2>
    <ol class="toc">${DATA.parts.map((p, i) => `<li class="part">
      <div class="parthead"><span class="eyebrow">Part ${ORD[i]}</span><h3>${esc(p.title)}</h3><p>${esc(p.blurb)}</p></div>
      <ol>${p.cases.map(n => { const c = BY[n]; ch++; return `<li class="${read.has(n) ? 'read' : ''}"><a href="#/case/${n}">
        <span class="no">${ch}</span><span class="t">${esc(c.title)}<small>${esc(c.setting)}</small></span><span class="dots"></span><span class="pg">${read.has(n) ? 'read' : minLabel(c)}</span></a></li>`; }).join('')}</ol>
    </li>`).join('')}</ol>
  </section>`;
  const r = document.getElementById('reset');
  if (r) r.onclick = () => { read = new Set(); local.set('read', []); local.set('last', null); book(); };
}

/* ---------- 2. the Index ---------- */
function indexEntries() {
  const m = new Map();
  const add = (term, n, kind, key) => {
    key = (key || term).toLowerCase();
    if (!m.has(key)) m.set(key, { term, kind, key, nums: new Set() });
    m.get(key).nums.add(n);
  };
  CASES.forEach(c => {
    c.topics.forEach(t => add(t, c.number, 'topic'));
    c.skills.forEach(s => add(SK[s].full, c.number, 'skill'));
    add(c.setting.charAt(0).toLowerCase() + c.setting.slice(1), c.number, 'place');
    add(c.sector.toLowerCase() + ' workplaces', c.number, 'place');
    const t = c.title.match(/^(The|A|An) (.*)$/);
    add(t ? `${t[2]}, ${t[1]}` : c.title, c.number, 'title');
  });
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
}
function indexView() {
  setCtx('index', CASES.map(c => c.number));
  const all = indexEntries();
  app.innerHTML = `<section class="idx">
    <p class="eyebrow">The Index</p>
    <h1>Index</h1>
    <p class="lede">Numbers are case numbers. <i>Italic</i> entries are titles, <b>bold</b> entries are the six leadership skills, and the rest are topics and workplaces.</p>
    <div class="idxbar">
      <input type="search" id="iq" placeholder="Narrow the index" aria-label="Narrow the index">
      <div class="letters" id="letters"></div>
    </div>
    <div class="cols" id="cols"></div>
    <div class="peek" id="peek" aria-live="polite"></div>
  </section>`;
  const cols = document.getElementById('cols'), letters = document.getElementById('letters'), peek = document.getElementById('peek');
  const draw = q => {
    const rows = all.filter(e => !q || e.key.includes(q));
    const groups = {};
    rows.forEach(e => { const L = e.key[0].toUpperCase(); (groups[L] = groups[L] || []).push(e); });
    const ls = Object.keys(groups).sort();
    letters.innerHTML = ls.map(L => `<button data-l="${L}">${L}</button>`).join('');
    cols.innerHTML = ls.length ? ls.map(L => `<section id="L-${L}"><h2>${L}</h2><ul>${groups[L].map(e =>
      `<li class="${e.kind}"><span class="term">${esc(e.term)}</span><span class="dots"></span><span class="locs">${[...e.nums].sort((a, b) => a - b).map(n =>
        `<a href="#/case/${n}" data-n="${n}" aria-label="Case ${n}: ${esc(BY[n].title)}">${n}</a>`).join(', ')}</span></li>`).join('')}</ul></section>`).join('')
      : '<p class="empty">Nothing in the index matches that.</p>';
  };
  draw('');
  document.getElementById('iq').oninput = e => draw(e.target.value.trim().toLowerCase());
  letters.onclick = e => { const L = e.target.dataset.l; if (L) document.getElementById('L-' + L).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const show = e => {
    const a = e.target.closest && e.target.closest('a[data-n]');
    if (!a) return;
    const c = BY[a.dataset.n];
    peek.innerHTML = `<b>Case ${c.number} · ${esc(c.title)}</b><span>${esc(c.compelling_question)}</span>`;
    peek.classList.add('on');
  };
  cols.addEventListener('mouseover', show);
  cols.addEventListener('focusin', show);
  cols.addEventListener('mouseleave', () => peek.classList.remove('on'));
}

/* ---------- 3. the Guide ---------- */
const TIMES = { any: 'any amount of time', short: 'only a few minutes', long: 'time for a long one' };
let g = sess.get('guide', { sit: null, skill: null, time: 'any', open: 'sit' });
function guide() {
  const sit = DATA.situations.find(s => s.id === g.sit);
  const blank = (k, text, empty) => `<span class="blank${empty ? ' empty' : ''}${g.open === k ? ' open' : ''}" role="button" tabindex="0" data-b="${k}" aria-expanded="${g.open === k}">${esc(text)}</span>`;
  const opts = {
    sit: DATA.situations.map(s => [s.id, s.phrase]),
    skill: [[null, 'whichever skill fits']].concat(SKEYS.map(s => [s, SK[s].doing])),
    time: Object.entries(TIMES)
  }[g.open];
  let result = '<p class="prompt">Choose a situation and a case will appear here.</p>';
  if (sit) {
    const ranked = sit.cases.map((n, i) => {
      const c = BY[n];
      return { c, s: (g.skill && c.skills.includes(g.skill) ? 100 : 0) + (g.time === 'short' ? -mins(c) : g.time === 'long' ? mins(c) : 0) - i * 0.1 };
    }).sort((a, b) => b.s - a.s).map(r => r.c);
    setCtx('guide', ranked.map(c => c.number));
    const top = ranked[0];
    const miss = g.skill && !top.skills.includes(g.skill);
    result = `<div class="pick">
      <p class="eyebrow">${miss ? 'No case for this situation features that skill. The closest one is' : 'Read this one'}</p>
      <h2><a href="#/case/${top.number}">${esc(top.title)}</a></h2>
      <p class="cq">${esc(top.compelling_question)}</p>
      <p class="why">It is set in a ${esc(top.setting.charAt(0).toLowerCase() + top.setting.slice(1))} and takes about ${mins(top)} minutes to read.</p>
      <ul class="chips">${top.skills.map(chip).join('')}</ul>
      <p><a class="btn" href="#/case/${top.number}">Read this case</a></p>
    </div>
    ${ranked.length > 1 ? `<div class="also"><p class="eyebrow">Also for this situation</p><ul>${ranked.slice(1).map(c =>
      `<li><a href="#/case/${c.number}">${esc(c.title)}</a><span class="meta">${esc(c.setting)} · ${minLabel(c)}</span></li>`).join('')}</ul></div>` : ''}`;
  }
  app.innerHTML = `<section class="guide">
    <p class="eyebrow">The Guide</p>
    <h1 class="madlib">I am dealing with ${blank('sit', sit ? sit.phrase : 'choose a situation', !sit)}.
      I would like to practice ${blank('skill', g.skill ? SK[g.skill].doing : 'whichever skill fits')},
      and I have ${blank('time', TIMES[g.time])}.</h1>
    ${opts ? `<ul class="opts" id="opts">${opts.map(o => `<li><button data-v="${o[0] == null ? '' : o[0]}"${String(g[g.open]) === String(o[0]) ? ' aria-current="true"' : ''}>${esc(o[1])}</button></li>`).join('')}</ul>` : ''}
    <div class="result">${result}</div>
  </section>`;
  app.querySelectorAll('.blank').forEach(b => {
    b.onclick = () => { const k = b.dataset.b; g.open = g.open === k ? null : k; sess.set('guide', g); guide(); app.querySelector(`.blank[data-b=${k}]`).focus(); };
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.onclick(); } };
  });
  const o = document.getElementById('opts');
  if (o) o.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    g[g.open] = b.dataset.v || null;
    g.open = null;
    sess.set('guide', g); guide();
  };
}

/* ---------- 4. Search ---------- */
const SECNAME = { summary: 'Summary', case: 'The Case', questions: 'Questions' };
const PASSAGES = CASES.map(c => {
  const out = [];
  Object.keys(SECNAME).forEach(sec => {
    const d = document.createElement('div');
    d.innerHTML = c.html[sec];
    d.querySelectorAll('p,li').forEach((el, i) => out.push({ sec, i, text: el.textContent }));
  });
  return out;
});
const hilite = (text, toks) => esc(text).replace(new RegExp('(' + toks.map(t => rx(esc(t))).join('|') + ')', 'gi'), '<mark>$1</mark>');
function snippet(text, toks) {
  const low = text.toLowerCase();
  const at = Math.min(...toks.map(t => low.indexOf(t)).filter(i => i >= 0));
  let a = Math.max(0, at - 90), b = Math.min(text.length, at + 170);
  if (a > 0) a = text.indexOf(' ', a) + 1;
  if (b < text.length) b = text.lastIndexOf(' ', b);
  return (a > 0 ? '… ' : '') + hilite(text.slice(a, b), toks) + (b < text.length ? ' …' : '');
}
function search(seg, params) {
  const topics = {};
  CASES.forEach(c => c.topics.forEach(t => topics[t] = (topics[t] || 0) + 1));
  const tries = ['burnout', 'trust', 'promotion', 'policy', 'turnover', 'complaints', 'budget', 'overtime'];
  app.innerHTML = `<section class="search">
    <p class="eyebrow">Search</p>
    <h1><label for="q">Search inside the cases</label></h1>
    <input type="search" id="q" placeholder="A word, a name, a phrase" autocomplete="off" value="${esc(params.get('q') || '')}">
    <p class="try" id="try">Try ${tries.map(t => `<button class="link" data-t="${t}">${t}</button>`).join(' ')}</p>
    <p class="count" id="count" aria-live="polite"></p>
    <div id="results"></div>
  </section>`;
  const input = document.getElementById('q'), out = document.getElementById('results'), count = document.getElementById('count');
  const run = () => {
    const q = input.value.trim();
    try { history.replaceState(null, '', q ? '#/search?q=' + encodeURIComponent(q) : '#/search'); } catch (e) {}
    const toks = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (!toks.length) { out.innerHTML = ''; count.textContent = ''; return; }
    const res = [];
    CASES.forEach((c, ci) => {
      const hits = PASSAGES[ci].filter(p => { const t = p.text.toLowerCase(); return toks.every(k => t.includes(k)); });
      const head = (c.title + ' ' + c.compelling_question + ' ' + c.topics.join(' ') + ' ' + c.setting).toLowerCase();
      const inHead = toks.every(k => head.includes(k));
      if (hits.length || inHead) res.push({ c, hits, score: hits.length + (inHead ? 3 : 0) });
    });
    res.sort((a, b) => b.score - a.score || a.c.number - b.c.number);
    setCtx('search', res.length ? res.map(r => r.c.number) : CASES.map(c => c.number));
    const total = res.reduce((t, r) => t + r.hits.length, 0);
    count.textContent = res.length ? `${total} ${total === 1 ? 'passage' : 'passages'} in ${res.length} ${res.length === 1 ? 'case' : 'cases'}` : 'No case uses those words together in one passage.';
    const hl = encodeURIComponent(toks.join(' '));
    out.innerHTML = res.map(r => `<article class="hit">
      <h2><a href="#/case/${r.c.number}?hl=${hl}">${hilite(r.c.title, toks)}</a></h2>
      <p class="meta">Case ${r.c.number} · ${hilite(r.c.setting, toks)} · ${hilite(r.c.topics.join(', '), toks)}</p>
      ${r.hits.length ? `<ol>${r.hits.slice(0, 3).map(p => `<li><a href="#/case/${r.c.number}?hl=${hl}&at=${p.sec}:${p.i}"><span class="where">${SECNAME[p.sec]}</span>${snippet(p.text, toks)}</a></li>`).join('')}</ol>
        ${r.hits.length > 3 ? `<p class="more"><a href="#/case/${r.c.number}?hl=${hl}">and ${r.hits.length - 3} more in this case</a></p>` : ''}`
        : `<p class="cq">${hilite(r.c.compelling_question, toks)}</p>`}
    </article>`).join('');
  };
  input.oninput = run;
  document.getElementById('try').onclick = e => { const t = e.target.dataset.t; if (t) { input.value = t; run(); input.focus(); } };
  run();
  if (!input.value) input.focus();
}

/* ---------- 5. the Planner ---------- */
const ps = { sort: 'number', dir: 1, skills: new Set() };
function planner(seg) {
  if (seg[1]) {
    plan = seg[1].split(',').map(Number).filter(n => BY[n]);
    savePlan();
    try { history.replaceState(null, '', '#/plan'); } catch (e) {}
  }
  app.innerHTML = `<section class="plan">
    <p class="eyebrow">The Planner</p>
    <h1>Plan a session</h1>
    <p class="lede">Every case against the six skills. Select a skill to keep only the cases that feature it, tick the cases you want, and the plan on the right adds up the reading time and shows which skills are covered.</p>
    <div class="planwrap">
      <div class="tablewrap" id="tw"></div>
      <aside class="tray" id="tray" aria-label="Session plan"></aside>
    </div>
  </section>`;
  drawTable(); drawTray();
}
function drawTable() {
  const tw = document.getElementById('tw'); if (!tw) return;
  const rows = CASES.filter(c => [...ps.skills].every(s => c.skills.includes(s)));
  const val = { number: c => c.number, title: c => c.title, mins: c => c.words, setting: c => c.setting }[ps.sort];
  rows.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * ps.dir);
  const th = (k, label) => `<th scope="col" aria-sort="${ps.sort === k ? (ps.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${k}">${label}<i>${ps.sort === k ? (ps.dir > 0 ? '↑' : '↓') : ''}</i></button></th>`;
  setCtx('plan', plan.length ? plan : rows.map(c => c.number));
  tw.innerHTML = `<table>
    <thead><tr><th scope="col"><span class="vh">In plan</span></th>${th('number', 'No.')}${th('title', 'Case')}${th('mins', 'Min')}
      ${SKEYS.map(s => `<th scope="col" class="skcol"><button data-skill="${s}" aria-pressed="${ps.skills.has(s)}" style="--c:var(--${s})" title="${esc(SK[s].full)}"><span class="dot"></span>${esc(SK[s].short)}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(c => `<tr class="${plan.includes(c.number) ? 'in' : ''}">
      <td><input type="checkbox" data-n="${c.number}" ${plan.includes(c.number) ? 'checked' : ''} aria-label="Add case ${c.number} to the plan"></td>
      <td class="num">${c.number}</td>
      <th scope="row"><a href="#/case/${c.number}">${esc(c.title)}</a><small>${esc(c.setting)}</small></th>
      <td class="num">${mins(c)}</td>
      ${SKEYS.map(s => `<td class="skcell${ps.skills.has(s) ? ' hot' : ''}">${c.skills.includes(s) ? `<span class="dot" style="--c:var(--${s})"><span class="vh">${esc(SK[s].short)}</span></span>` : ''}</td>`).join('')}
    </tr>`).join('') || `<tr><td colspan="10" class="empty">No case features all of those skills together.</td></tr>`}</tbody>
  </table>
  <p class="meta">${rows.length} of ${CASES.length} cases${ps.skills.size ? ' · <button class="link" id="clr">Show all</button>' : ''}</p>`;
  tw.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sort) { ps.dir = ps.sort === b.dataset.sort ? -ps.dir : 1; ps.sort = b.dataset.sort; }
    else if (b.dataset.skill) { const s = b.dataset.skill; ps.skills.has(s) ? ps.skills.delete(s) : ps.skills.add(s); }
    else if (b.id === 'clr') ps.skills.clear();
    else return;
    drawTable();
  };
  tw.onchange = e => {
    const n = +e.target.dataset.n; if (!n) return;
    e.target.checked ? plan.push(n) : plan = plan.filter(x => x !== n);
    savePlan();
    e.target.closest('tr').classList.toggle('in', e.target.checked);
    setCtx('plan', plan.length ? plan : CASES.map(c => c.number));
    drawTray();
  };
}
function planText() {
  const lines = ['Session plan: Think Like a Leader case studies', ''];
  plan.forEach((n, i) => { const c = BY[n]; lines.push(`${i + 1}. Case ${n}: ${c.title} (${mins(c)} min)`, `   ${c.compelling_question}`); });
  lines.push('', `Reading time: about ${plan.reduce((t, n) => t + mins(BY[n]), 0)} minutes`);
  lines.push('Skills covered: ' + SKEYS.filter(s => plan.some(n => BY[n].skills.includes(s))).map(s => SK[s].full).join('; '));
  return lines.join('\n');
}
function copy(text, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => btn.textContent = t, 1400); };
  const old = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); };
  navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(done, old) : old();
}
function drawTray() {
  const tray = document.getElementById('tray'); if (!tray) return;
  const total = plan.reduce((t, n) => t + mins(BY[n]), 0);
  const cover = SKEYS.map(s => [s, plan.filter(n => BY[n].skills.includes(s)).length]);
  const gap = cover.filter(x => !x[1]).map(x => x[0]);
  let tip = '';
  if (plan.length && gap.length) {
    const best = CASES.filter(c => !plan.includes(c.number))
      .map(c => ({ c, k: c.skills.filter(s => gap.includes(s)).length })).filter(x => x.k)
      .sort((a, b) => b.k - a.k || a.c.words - b.c.words)[0];
    if (best) tip = `<p class="tip">Not covered yet: ${gap.map(s => esc(SK[s].short.toLowerCase())).join(', ')}. <button class="link" data-add="${best.c.number}">Add case ${best.c.number}, ${esc(best.c.title)}</button></p>`;
  }
  tray.innerHTML = `<h2>Session plan</h2>
    ${plan.length ? `<ol class="picked">${plan.map((n, i) => `<li><span class="t"><a href="#/case/${n}">${esc(BY[n].title)}</a><small>Case ${n} · ${minLabel(BY[n])}</small></span>
      <span class="ctl"><button data-up="${i}" aria-label="Move up" ${i ? '' : 'disabled'}>↑</button><button data-down="${i}" aria-label="Move down" ${i < plan.length - 1 ? '' : 'disabled'}>↓</button><button data-rm="${n}" aria-label="Remove">×</button></span></li>`).join('')}</ol>
    <p class="total"><b>${total} min</b> of reading across ${plan.length} ${plan.length === 1 ? 'case' : 'cases'}</p>`
    : '<p class="prompt">Nothing yet. Tick a case in the table to start a plan.</p>'}
    <h3>Skills covered</h3>
    <ul class="cover">${cover.map(([s, k]) => `<li class="${k ? '' : 'none'}" style="--c:var(--${s})"><span>${esc(SK[s].short)}</span><span class="pips">${k ? '<i></i>'.repeat(k) : '<em>none</em>'}</span></li>`).join('')}</ul>
    ${tip}
    ${plan.length ? `<div class="acts"><a class="btn" href="#/packet">Open as a packet to print</a>
      <button class="btn ghost" id="cp">Copy as text</button><button class="btn ghost" id="ln">Copy a link to this plan</button>
      <button class="link" id="empty">Clear the plan</button></div>` : ''}`;
  tray.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.up) { const i = +d.up; [plan[i - 1], plan[i]] = [plan[i], plan[i - 1]]; }
    else if (d.down) { const i = +d.down; [plan[i + 1], plan[i]] = [plan[i], plan[i + 1]]; }
    else if (d.rm) plan = plan.filter(n => n !== +d.rm);
    else if (d.add) plan.push(+d.add);
    else if (b.id === 'empty') plan = [];
    else if (b.id === 'cp') return copy(planText(), b);
    else if (b.id === 'ln') return copy(location.href.split('#')[0] + '#/plan/' + plan.join(','), b);
    else return;
    savePlan(); drawTable(); drawTray();
  };
}
function caseBody(c) {
  return `<h2>Summary</h2><div data-sec="summary">${c.html.summary}</div>
    <details class="dir"><summary>Directions</summary>${c.html.directions}</details>
    <h2>The Case</h2><div data-sec="case">${c.html.case}</div>
    <h2>Questions for discussion</h2><div data-sec="questions" class="qs">${c.html.questions}</div>${c.html.note}`;
}
function packet() {
  if (!plan.length) { location.hash = '#/plan'; return; }
  app.innerHTML = `<section class="packet">
    <p class="noprint"><a class="back" href="#/plan">&larr; Back to the Planner</a> <button class="btn" id="print">Print this packet</button></p>
    <div class="cover-page"><p class="eyebrow">Session packet</p><h1>Think Like a Leader</h1>
      <ol>${plan.map(n => `<li>${esc(BY[n].title)} <span class="meta">${minLabel(BY[n])}</span></li>`).join('')}</ol>
      <p class="meta">About ${plan.reduce((t, n) => t + mins(BY[n]), 0)} minutes of reading</p></div>
    ${plan.map(n => { const c = BY[n]; return `<article class="case sheet"><p class="eyebrow">Case ${c.number} · ${esc(c.setting)}</p><h1>${esc(c.title)}</h1>
      <p class="cq">${esc(c.compelling_question)}</p><ul class="chips">${c.skills.map(chip).join('')}</ul><div class="prose">${caseBody(c)}</div></article>`; }).join('')}
  </section>`;
  document.getElementById('print').onclick = () => window.print();
}

/* ---------- 6. the Street ---------- */
let plot = null;
function wrapLabel(s) {
  const words = s.split(' '), lines = [''];
  words.forEach(w => { const l = lines.length - 1; if (lines[l] && (lines[l] + ' ' + w).length > 13) lines.push(w); else lines[l] = (lines[l] + ' ' + w).trim(); });
  return lines;
}
function building(c, si) {
  const FH = 30, TOP = 44, x = 4;
  const w = 98 + ((c.number * 5) % 3) * 10, st = Math.min(7, mins(c) + 1), h = st * FH + 14, y = TOP, G = TOP + h, mid = x + w / 2;
  let b = '';
  if (si === 0) b += `<polygon class="roof" points="${x - 4},${y} ${mid},${y - 26} ${x + w + 4},${y}"/>`;
  else if (si === 1) b += `<rect class="roof" x="${x - 3}" y="${y - 6}" width="${w + 6}" height="6"/><rect class="roof" x="${mid - 12}" y="${y - 30}" width="24" height="24"/><path class="cross" d="M${mid - 2.5} ${y - 26}h5v5.5h5.5v5h-5.5v5.5h-5v-5.5h-5.5v-5h5.5z"/>`;
  else if (si === 2) b += `<rect class="roof" x="${x - 3}" y="${y - 6}" width="${w + 6}" height="6"/><rect class="roof" x="${x + w - 20}" y="${y - 40}" width="2.5" height="34"/><rect class="flag" x="${x + w - 17.5}" y="${y - 40}" width="18" height="11"/>`;
  else if (si === 3) b += `<rect class="roof" x="${x - 3}" y="${y - 6}" width="${w + 6}" height="6"/><rect class="roof" x="${x + 14}" y="${y - 20}" width="30" height="14"/><rect class="roof" x="${x + w - 30}" y="${y - 14}" width="12" height="8"/>`;
  else b += `<polygon class="roof" points="${x - 4},${y} ${x + 14},${y - 18} ${x + w - 14},${y - 18} ${x + w + 4},${y}"/>`;
  b += `<rect class="wall" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const ww = (w - 24 - 20) / 3;
  for (let f = 0; f < st - 1; f++) for (let i = 0; i < 3; i++)
    b += `<rect class="win" x="${(x + 12 + i * (ww + 10)).toFixed(1)}" y="${y + f * FH + 9}" width="${ww.toFixed(1)}" height="15"/>`;
  const sw = w / c.skills.length;
  c.skills.forEach((s, i) => b += `<rect x="${(x + i * sw).toFixed(1)}" y="${G - 44}" width="${sw.toFixed(1)}" height="8" fill="var(--${s})"/>`);
  b += `<rect class="win" x="${x + 10}" y="${G - 29}" width="18" height="15"/><rect class="win" x="${x + w - 28}" y="${G - 29}" width="18" height="15"/>`;
  b += `<rect class="door" x="${mid - 13}" y="${G - 31}" width="26" height="31"/><text class="plate" x="${mid}" y="${G - 11}">${c.number}</text>`;
  b += `<text class="sign" x="${mid}" y="${G + 22}">${wrapLabel(c.setting).map((l, i) => `<tspan x="${mid}" dy="${i ? 14 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
  return `<svg width="${w + 8}" height="${G + 56}" viewBox="0 0 ${w + 8} ${G + 56}"><rect class="ground" x="0" y="${G}" width="${w + 8}" height="4"/>
    <g class="b" data-n="${c.number}" tabindex="0" role="button" aria-pressed="false" aria-label="Case ${c.number}: ${esc(c.title)}. ${esc(c.setting)}, ${minLabel(c)}">${b}</g></svg>`;
}
function streetSVG() {
  return DATA.sectors.map((sec, si) => `<section class="block"><div class="lots">${CASES.filter(c => c.sector === sec).map(c => building(c, si)).join('')}</div><h2>${esc(sec)}</h2></section>`).join('');
}
function street() {
  setCtx('street', DATA.sectors.flatMap(s => CASES.filter(c => c.sector === s).map(c => c.number)));
  app.innerHTML = `<section class="street">
    <div class="shead"><div><p class="eyebrow">The Neighborhood</p><h1>Where the cases happen</h1>
      <p class="lede">One building for each case, one block for each kind of workplace. Taller buildings are longer reads, and the colors of each awning are the skills the case features.</p></div></div>
    <div class="road" id="road">${streetSVG()}</div>
    <ul class="key">${SKEYS.map(s => `<li style="--c:var(--${s})"><i></i>${esc(SK[s].short)}</li>`).join('')}</ul>
    <div class="plot" id="plot" aria-live="polite"></div>
  </section>`;
  const road = document.getElementById('road');
  const pick = n => {
    plot = BY[n] ? n : null;
    road.querySelectorAll('.b').forEach(b => { const on = +b.dataset.n === plot; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const c = BY[plot];
    document.getElementById('plot').innerHTML = c ? `<p class="eyebrow">Case ${c.number} · ${esc(c.setting)} · ${minLabel(c)}</p>
      <h2><a href="#/case/${c.number}">${esc(c.title)}</a></h2><p class="cq">${esc(c.compelling_question)}</p>
      <ul class="chips">${c.skills.map(chip).join('')}</ul><p><a class="btn" href="#/case/${c.number}">Go inside</a></p>`
      : '<p class="prompt">Select a building to see what happened there.</p>';
  };
  road.onclick = e => { const b = e.target.closest('.b'); if (b) pick(+b.dataset.n); };
  road.onkeydown = e => { const b = e.target.closest('.b'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(+b.dataset.n); } };
  pick(plot);
}

/* ---------- a case ---------- */
function threads(c, taken) {
  const others = CASES.filter(o => o.number !== c.number && !taken.includes(o.number));
  const out = [];
  const take = (why, list) => { const o = list.find(o => !out.some(t => t.c === o)); if (o) out.push({ why, c: o }); };
  take('The same skills in a different kind of workplace', others.filter(o => o.sector !== c.sector && shared(o, c)).sort((a, b) => shared(b, c) - shared(a, c)));
  take('Another ' + c.sector.toLowerCase() + ' workplace', others.filter(o => o.sector === c.sector).sort((a, b) => shared(b, c) - shared(a, c)));
  take('A change of subject', others.filter(o => o.sector !== c.sector).sort((a, b) => shared(a, c) - shared(b, c) || a.words - b.words));
  return out;
}
function showCase(seg, params) {
  const n = +seg[1], c = BY[n];
  if (!c) return lobby();
  const list = ctx.list.includes(n) ? ctx.list : BOOK;
  const i = list.indexOf(n), prev = BY[list[i - 1]], next = BY[list[i + 1]];
  const isBook = ctx.mode === 'book';
  const nextWhy = { book: 'The next chapter', search: 'The next search result', plan: 'Next in the plan', guide: 'The next suggestion', street: 'Next door', index: 'The next case by number' }[ctx.mode];
  const th = (next ? [{ why: nextWhy, c: next }] : []).concat(threads(c, next ? [next.number] : []));
  let ch = 0;
  const spine = isBook ? `<aside class="spine" aria-label="Contents"><a class="home" href="#/book">Contents</a>
    ${DATA.parts.map((p, pi) => `<p>Part ${ORD[pi]} · ${esc(p.title)}</p><ol>${p.cases.map(m => { ch++; return `<li><a href="#/case/${m}"${m === n ? ' aria-current="page"' : ''} class="${read.has(m) ? 'read' : ''}"><span>${ch}</span>${esc(BY[m].title)}</a></li>`; }).join('')}</ol>`).join('')}</aside>` : '';
  const inPlan = plan.includes(n);
  app.innerHTML = `<div class="reading${isBook ? ' with-spine' : ''}">${spine}
    <article class="case">
      <a class="back" href="#/${ctx.mode}">&larr; Back to ${MODES[ctx.mode]}</a>
      <p class="eyebrow">Case ${c.number} · ${esc(c.setting)} · ${minLabel(c)} read</p>
      <h1>${esc(c.title)}</h1>
      <p class="cq">${esc(c.compelling_question)}</p>
      <ul class="chips">${c.skills.map(chip).join('')}</ul>
      <div class="prose">${caseBody(c)}</div>
      <p class="addplan"><button class="btn ghost" id="addplan" aria-pressed="${inPlan}">${inPlan ? 'In your session plan · remove' : 'Add to a session plan'}</button></p>
      <div id="end"></div>
      <section class="next"><h2>Where next</h2>
        <ul>${th.map(t => `<li><span class="why">${esc(t.why)}</span><a href="#/case/${t.c.number}">${esc(t.c.title)}</a><span class="meta">${esc(t.c.setting)} · ${minLabel(t.c)}</span></li>`).join('')}</ul>
      </section>
      <nav class="pn" aria-label="Previous and next">
        <span>${prev ? `<a href="#/case/${prev.number}">&larr; ${esc(prev.title)}</a>` : ''}</span>
        <span>${next ? `<a href="#/case/${next.number}">${esc(next.title)} &rarr;</a>` : ''}</span>
      </nav>
    </article></div>`;
  local.set('last', n);
  document.getElementById('addplan').onclick = e => {
    plan.includes(n) ? plan = plan.filter(x => x !== n) : plan.push(n);
    savePlan();
    e.target.setAttribute('aria-pressed', plan.includes(n));
    e.target.textContent = plan.includes(n) ? 'In your session plan · remove' : 'Add to a session plan';
  };

  // Passages from a search arrive highlighted.
  const toks = (params.get('hl') || '').split(' ').filter(Boolean);
  if (toks.length) {
    const re = new RegExp('(' + toks.map(rx).join('|') + ')', 'gi');
    app.querySelectorAll('.prose [data-sec]').forEach(sec => {
      const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        if (!re.test(node.nodeValue)) return;
        re.lastIndex = 0;
        const span = document.createElement('span');
        span.innerHTML = esc(node.nodeValue).replace(new RegExp('(' + toks.map(t => rx(esc(t))).join('|') + ')', 'gi'), '<mark>$1</mark>');
        node.replaceWith(...span.childNodes);
      });
    });
    const [sec, k] = (params.get('at') || '').split(':');
    const el = (sec && app.querySelectorAll(`[data-sec="${sec}"] p, [data-sec="${sec}"] li`)[+k]) || app.querySelector('mark');
    if (el) { el.classList.add('target'); el.scrollIntoView({ block: 'center' }); }
  }

  const bar = document.getElementById('bar'), art = app.querySelector('.prose');
  const onScroll = () => {
    const r = art.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    bar.style.width = (p * 100).toFixed(1) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true });
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting) && !read.has(n)) {
      read.add(n); local.set('read', [...read]);
      const a = app.querySelector('.spine a[aria-current]'); if (a) a.classList.add('read');
    }
  });
  io.observe(document.getElementById('end'));
  const onKey = e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' && next) location.hash = '#/case/' + next.number;
    if (e.key === 'ArrowLeft' && prev) location.hash = '#/case/' + prev.number;
  };
  addEventListener('keydown', onKey);
  cleanup = () => { removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey); io.disconnect(); };
  const cur = app.querySelector('.spine a[aria-current]');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

route();
})();
