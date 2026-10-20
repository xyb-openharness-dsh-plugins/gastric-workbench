'use strict';
/* 小胃宝 Stompal v0.1.0 — 交互原型。患者数据全部为模拟；临床试验列表为真实登记摘录（状态未核实）。
   不读写真实文件、不调用模型或宿主 API。视觉体系沿用家族原型（淋巴瘤 v0.1 → 小畅宝 v0.2），
   品牌色重映射为小胃宝橙 #C2410C（docs/BRIEF.md 记载既有 Logo 为橙色）。
   与样板的差异：一级页 10 个（无独立「营养支持」页，SPEC A15）；一图秀默认指标是体重（SPEC A6）；
   肠癌的造口/LARS 模块换成胃癌的切除方式 / 进食 / 倾倒 / 补充剂 / 腹膜 / 胃镜六块。 */

const APP_INFO = {
  version: '0.1.0',
  build: '2026-10-21',
  channel: 'prototype',
  channelLabel: '交互原型 · 未接入 DSH'
};
APP_INFO.displayVersion = `v${APP_INFO.version}`;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  badge: 'M12 3l7 4v10l-7 4-7-4V7ZM9 12l2 2 4-4',
  drip: 'M12 3v6m0 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7 7h10',
  /* 胃镜：一根带弯头的软管，用于「胃镜随访」「影像与胃镜」 */
  scope: 'M4 6c6 0 8 3 12 3h4M18 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM8 6v3m4-3v2',
  /* 切除方式：胃形轮廓 + 一条虚线示意切除范围 */
  cut: 'M8 4c0 4 1 5 4 8 2-2 3-3 3-6 0-3-2-4-4-4-1 0-2 1-3 2ZM11 12c0 3-1 5-4 7M4 21h16',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  chart: 'M4 3v17h17M7 14l4-5 4 3 5-7',
  leaf: 'M20 4c-9.4 0-15 4.1-15 9.6A5.4 5.4 0 0 0 10.4 19C16 19 20 13.4 20 4ZM5.5 18.6C8 13.4 12 10.6 17 9.6',
  heart: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2',
  flask: 'M9 3h6v5l5 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-9Z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  chat: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-6 5V5ZM8 8h8M8 11h5'
};
/* 看板任务卡用的是页面键（records / review / labs），图标表里叫 folder / calendar / lab；
   这里做一次别名，避免拼错键时静默输出 d="undefined" 的空 path（控制台会报 moveto 错误）。 */
const ICON_ALIAS = { records: 'folder', review: 'calendar', labs: 'lab', timeline: 'chart', mind: 'heart', nutrition: 'leaf', treatment: 'drip', subtype: 'badge', trials: 'flask', dashboard: 'home', prep: 'calendar', scope: 'scope', cut: 'cut' };
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k] || icons[ICON_ALIAS[k]] || icons.badge}"/></svg>`;

/* 10 个一级页（SPEC §4）：肠癌的「肠道功能与造口」位由「进食与营养」顶替，
   「营养支持」不再单列（并入进食与营养，防双入口回归，A15）。 */
const PAGES = [
  ['dashboard', '看板', 'home'], ['records', '病情整理', 'folder'], ['subtype', '我的分型', 'badge'], ['treatment', '治疗历程', 'drip'],
  ['nutrition', '进食与营养', 'leaf'], ['labs', '检查与指标', 'lab'], ['timeline', '病情一图秀', 'chart'],
  ['mind', '心理支持', 'heart'], ['review', '复诊准备', 'calendar'], ['trials', '临床研究', 'flask']
];
const SUBPAGES = {
  records: ['资料库', '整理草稿 / 核对', '病情档案', '指标检测', '病情汇总'],
  subtype: ['分期与部位', '标志物档案', 'Hp 与家族史', '会诊与二次意见'],
  treatment: ['围手术期方案', '周期与用药', '腹膜与腹腔治疗'],
  nutrition: ['切除方式', '进食记录', '补充剂与指标', '倾倒记录'],
  labs: ['肿瘤标志物', '血象', '影像与胃镜'],
  timeline: ['数值曲线', '分类与事件', '数据口径'],
  mind: ['当下感受', '身体形象与进食社交', '家庭沟通'],
  review: ['复诊节奏', '胃镜随访', '就诊准备'],
  trials: ['2026 线索', '已收藏', '入组问题']
};
const SUBTITLES = {
  dashboard: '标志物、切除方式与每一次复查放在一起，让下一次讨论有据可查。',
  records: '上传 → 解析 → 确认指标 → 入库；原件永远保留，接受之前都只是候选。',
  subtype: '四个标志物各自独立成项；这里保存依据原文，不替你解释病理。',
  treatment: '按治疗线整理方案、周期与评估，术前术后分开记，改过的计划也留痕。',
  nutrition: '切了多少胃、现在怎么吃、缺什么补什么——只记录，不给食谱也不给剂量。',
  labs: '同一个指标按时间排好，换医院、换方法都标出来。',
  timeline: '治疗、检验与营养指标放回同一段时间里，看见变化发生在哪一步。',
  mind: '害怕、疲惫、不想说话都算正常反应；这里的内容默认只属于你。',
  review: '该带什么、该问什么，提前写下来，诊室里就不用凭记忆。',
  trials: '线索不是推荐；先弄清入组条件，再决定要不要问。'
};

/* ---------------- 数据层（由 demo/build-demo-data.mjs 生成；改数据请改生成器重跑） ---------------- */
const D = window.DEMO_DATA;
const PROFILES = {}, METRICS = {}, EVENTS = {}, DASH_KEYS = {}, DOCS = {}, CANDS = {};
for (const [k, p] of Object.entries(D.profiles)) {
  /* 字段逐条显式列出：生成器加字段时这里会同步补，不会静默丢字段；
     肠癌的 lynch / resect / stoma / lars / nutritionNotes 换成胃癌的
     hp / resection / perioperative / mealLog / dumping / supplements / peritoneal / endoscopy。 */
  PROFILES[k] = { name: p.name, sex: p.sex, age: p.age, meta: p.meta, headline: p.headline, stage: p.stage, mindset: p.mindset,
    molecular: p.molecular, hp: p.hp, path: p.path, lines: p.lines, cycles: p.cycles, rhythm: p.rhythm,
    perioperative: p.perioperative, resection: p.resection, mealLog: p.mealLog, dumping: p.dumping,
    supplements: p.supplements, peritoneal: p.peritoneal, endoscopy: p.endoscopy, viewpoints: p.viewpoints,
    activity: p.activity, familyTalk: p.familyTalk,
    docs: p.docs || [], candidates: p.candidates || [], pathology: p.pathology || null };
  METRICS[k] = {};
  for (const m of p.metrics) METRICS[k][m.key] = m;
  EVENTS[k] = p.events;
  DASH_KEYS[k] = p.dash_keys;
  DOCS[k] = (p.docs || []).map(d => ({ ...d }));
  CANDS[k] = (p.candidates || []).map(c => ({ ...c }));
}
const TRIALS = D.trials;

/* ---------------- state ---------------- */
/* 一图秀默认选中体重（SPEC A6）：胃癌的营养线是主线，进页面先看体重而不是肿瘤标志物。 */
const state = { view: 'dashboard', profile: 'A', agentOpen: false, agentSize: 'std', sel: ['wt', 'alb', 'pa'],
  range: 'all', zoom: 100, toggles: { treatment: true, keypoints: true }, pin: null, saved: [], sub: {},
  query: '', parsing: false, parseError: false, loaded: {}, parsingName: '', lastUpload: null, uploads: 0 };
const defaultSel = (k) => (DASH_KEYS[k] || []).filter(c => { const m = METRICS[k][c]; return m && typeof m.points.find(p => typeof p.v === 'number')?.v === 'number'; }).slice(0, 3);
const P = () => PROFILES[state.profile];
const M = () => METRICS[state.profile];

/* ---------------- helpers ---------------- */
const fmtDate = (d) => d;
const delta = (m) => {
  if (!m.points || m.points.length < 2) return null;
  const a = m.points[m.points.length - 1], b = m.points[m.points.length - 2];
  if (typeof a.v !== 'number' || typeof b.v !== 'number') return null;
  const d = a.v - b.v;
  return { text: (d > 0 ? '+' : '') + d.toFixed(m.dec ?? 1), up: d > 0, from: b.d };
};
function sparkline(m, w = 200, h = 44) {
  const pts = (m.points || []).filter(p => typeof p.v === 'number');
  if (pts.length < 2) return '';
  const vs = pts.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs); if (hi === lo) { hi += 1; lo -= 1; }
  const X = i => 4 + (w - 8) * i / (pts.length - 1);
  const Y = v => h - 5 - (h - 10) * (v - lo) / (hi - lo);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const dots = pts.map((p, i) => `<circle class="sp-dot" cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.6" fill="${m.color}"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="base" d="M4 ${h - 5}H${w - 4}"/><path class="sp-line" d="${path}" stroke="${m.color}"/>${dots}</svg>`;
}
/* 3D 翻面（24-METRIC-TREND-TAB-DESIGN §5）：点整卡转 180°，再点返回；
   data-flipped 是唯一的视觉开关，aria-pressed 只为兼容旧样式保留；
   两面互换 aria-hidden，隐藏面不进读屏顺序。分类记录（data-static）不翻。 */
function flipCard(key) {
  const el = document.querySelector(`[data-mcard="${key}"]`);
  if (!el || el.dataset.static) return;
  const on = el.dataset.flipped !== 'true';
  el.dataset.flipped = String(on);
  el.setAttribute('aria-pressed', String(on));
  const front = el.querySelector('[data-face="front"]');
  const back = el.querySelector('[data-face="back"]');
  if (front) front.setAttribute('aria-hidden', String(on));
  if (back) back.setAttribute('aria-hidden', String(!on));
}
function mcard(key, m) {
  const last = (m.points || []).slice(-1)[0];
  if (!last) return '';
  const numeric = typeof last.v === 'number' && m.dec !== null;
  const d = delta(m);
  const cat = `<span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>`;
  if (!numeric) {
    return `<div class="mcard" data-mcard="${key}" data-static="1" role="group" aria-roledescription="指标卡"
      aria-label="${esc(m.name)}：${esc(String(last.v))}（分类记录，只按原文记录，不连折线）">
      <span class="mface front" data-face="front">${cat}<span class="name">${esc(m.name)}</span>
      <span class="na">${esc(last.v)}</span>
      <span class="meta"><span>${esc(last.src)}</span><span class="hint">分类记录</span></span></span></div>`;
  }
  const band = m.band ? `<span class="rec">参考 ${m.band[0]}–${m.band[1]} ${esc(m.unit)}</span>` : `<span class="rec">${esc(last.d)} · ${esc(last.src)}</span>`;
  return `<div class="mcard" role="group" tabindex="0" data-mcard="${key}" data-flipped="false" aria-roledescription="指标卡"
    aria-label="${esc(m.name)} 最近 ${last.v.toFixed(m.dec ?? 1)} ${esc(m.unit)}（${esc(last.d)}）；点一下翻面看趋势">
    <span class="mcard-inner">
    <span class="mface front" data-face="front">${cat}<span class="name">${esc(m.name)}</span>
      <span class="val"><span data-countup="${last.v}" data-dec="${m.dec ?? 1}">${last.v.toFixed(m.dec ?? 1)}</span><small>${esc(m.unit)}</small></span>
      ${d ? `<span class="delta">较上次 <em>${d.text}${m.unit ? ' ' + esc(m.unit) : ''}</em>（${esc(d.from)}）</span>` : ''}
      ${band}</span>
    <span class="mface back" data-face="back" aria-hidden="true">${cat}<span class="name">${esc(m.name)}</span>
      ${sparkline(m, 190, 40)}
      <span class="meta"><span>${esc(m.note)}</span><span class="hint">轻点翻回</span></span></span>
    </span></div>`;
}
/* ---------------- 一图秀引擎（统一画布 · 多序列归一化 · 移植淋巴瘤基因） ---------------- */
const CW = 980, CH = 420, CX0 = 62, CX1 = 954, CY0 = 132, CY1 = 366;
const CAT_ORDER = ['肿瘤标志物', '血象', '生化', '电解质', '营养', '进食与症状', '腹膜与腹腔'];
const fmtNum = (v, dec) => typeof v === 'number' ? v.toFixed(dec ?? 1) : String(v ?? '');
const shortDate = (d) => d.slice(5).replace('-', '.');
const longDate = (d) => d;
const numPts = (m) => (m.points || []).filter(p => typeof p.v === 'number');
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

function dataBounds() {
  const ds = [];
  for (const m of Object.values(M())) for (const p of m.points) ds.push(p.d);
  for (const e of (EVENTS[state.profile] || [])) ds.push(e.d);
  ds.sort();
  return [Date.parse(ds[0]), Date.parse(ds[ds.length - 1])];
}
function domain() {
  const [s, e] = dataBounds();
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const start = months ? new Date(new Date(e).setMonth(new Date(e).getMonth() - months)) : new Date(s);
  const span = e - start.getTime();
  const kept = span * state.zoom / 100;
  return [e - kept, e];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);

/* 单调三次插值（Fritsch-Carlson，同 d3 curveMonotoneX）：
   只平滑折线，且保证曲线段不越过相邻数据点的 y 范围——不会出现"过冲鼓包"式变形 */
function smoothPath(coords) {
  const n = coords.length;
  if (!n) return '';
  if (n === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    const ddx = coords[i + 1].x - coords[i].x;
    dx.push(ddx);
    slope.push(ddx ? (coords[i + 1].y - coords[i].y) / ddx : 0);
  }
  const tan = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) tan.push(0);           // 拐点处切线置平，防鼓包
    else {
      const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      tan.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])); // 调和加权，保证单调
    }
  }
  tan.push(slope[n - 2]);
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = coords[i].x + dx[i] / 3, c1y = coords[i].y + tan[i] * dx[i] / 3;
    const c2x = coords[i + 1].x - dx[i] / 3, c2y = coords[i + 1].y - tan[i + 1] * dx[i] / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/* 治疗条：周期带（化疗周期）+ 评估标记（手术/MDT/基线），两行独立于数据区 */
function bandsFor(t0, t1) {
  const p = P(), items = [];
  p.cycles.forEach((c, i) => {
    const from = c[1];
    const to = c[4] && p.cycles[i + 1] ? p.cycles[i + 1][1] : addDays(from, 21);
    items.push({ kind: 'cycle', from, to, label: c[0], color: '#1b4f8a' });
  });
  (EVENTS[state.profile] || []).forEach((e) => {
    if (/手术|MDT|基线/.test(e.label)) items.push({ kind: 'mark', from: e.d, to: e.d, label: e.label, color: e.label.includes('手术') ? '#a03d5c' : '#9a6410' });
  });
  return items.filter((tr) => Date.parse(tr.to) >= t0 && Date.parse(tr.from) <= t1)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
    .map((tr, lane) => { const s = Math.max(Date.parse(tr.from), t0), e2 = Math.min(Date.parse(tr.to), t1); return { ...tr, x1: xOf(s, t0, t1), x2: xOf(e2, t0, t1), lane }; });
}

function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${cur.getMonth() + 1}月` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  if (out.length > 7) return out.filter((_, i) => i % 2 === 0);
  return out;
}

function seriesFor(code, t0, t1) {
  const m = M()[code];
  const all = numPts(m).map((p) => p.v);
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1);
  const pts = numPts(m).filter((p) => inDomain(p.d, t0, t1));
  return { code, m, lo, hi, span, pts };
}

function chartSVG(t0, t1) {
  const bands = state.toggles.treatment ? bandsFor(t0, t1) : [];
  const series = state.sel.filter((c) => M()[c]).map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  if (!series.length) return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p></div>`;
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  const strip = bands.map((b) => {
    if (b.kind === 'mark') {
      const x = b.x1.toFixed(1), row = 64;
      return `<g><path d="M ${x} ${row - 4} l4 4 -4 4 -4 -4 Z" fill="${b.color}"/>
        <text x="${(+x + 8).toFixed(1)}" y="${row + 3.5}" font-size="9.5" fill="${b.color}" font-weight="600">${esc(b.label)}</text></g>`;
    }
    const w = Math.max(b.x2 - b.x1, 7).toFixed(1);
    return `<g><rect x="${b.x1.toFixed(1)}" y="36" width="${w}" height="8" rx="4" fill="${b.color}" opacity=".3"/>
      <text x="${(b.x1 + 1).toFixed(1)}" y="30" font-size="9" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`;
  }).join('');

  const markLines = bands.filter((b) => b.kind === 'mark').map((b) =>
    `<line x1="${b.x1.toFixed(1)}" x2="${b.x1.toFixed(1)}" y1="${CY0}" y2="${CY1}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="3 6" opacity=".45"/>`).join('');

  // 末点标签：按 y 排序强制最小间距 13px，右端左锚定，防叠字
  const lastPos = series.map((s) => {
    const c = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const last = c[c.length - 1];
    return { s, x: last.x, y: last.y, v: s.pts[s.pts.length - 1].v };
  }).sort((a, b) => a.y - b.y);
  let cursor = -Infinity;
  for (const it of lastPos) { it.ly = Math.max(it.y, cursor + 13); cursor = it.ly; }
  const overflow = lastPos.length ? Math.max(0, lastPos[lastPos.length - 1].ly - (CY1 + 2)) : 0;
  if (overflow) for (const it of lastPos) it.ly -= overflow;

  const lines = series.map((s) => {
    const coords = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const path = s.pts.length > 1 ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.m.color}" pathLength="1"/>` : '';
    const points = coords.map((c, i) => {
      const p = s.pts[i];
      const isLast = i === s.pts.length - 1;
      const r = isLast ? 5.2 : (i === 0 ? 4.6 : 4);
      const active = state.pin && state.pin.code === s.code && state.pin.date === p.d;
      return `<circle class="pt${active ? ' active' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${s.m.color}" data-action="pin" data-code="${s.code}" data-date="${p.d}"/>`;
    }).join('');
    const lp = lastPos.find((x) => x.s === s);
    const nearRight = lp.x > CX1 - 44;
    const lx = nearRight ? lp.x - 8 : lp.x + 8;
    const label = state.toggles.keypoints
      ? `<text class="delta-tag" x="${lx.toFixed(1)}" y="${(lp.ly + 4).toFixed(1)}" text-anchor="${nearRight ? 'end' : 'start'}" fill="${s.m.color}">${fmtNum(lp.v, s.m.dec)}</text>` : '';
    return `<g>${path}${points}${label}</g>`;
  }).join('');

  const ticks = monthTicks(t0, t1).map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${CY1}" y2="${CY1 + 5}"/><text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 18}" text-anchor="middle">${t.label}</text>`).join('');
  const rowLabels = state.toggles.treatment
    ? `<text x="6" y="34" font-size="9" fill="#8fa1b5">周期</text><text x="6" y="68" font-size="9" fill="#8fa1b5">评估</text>`
    : '';

  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="所选指标的时序图，共 ${series.length} 条序列">
    ${grid}${ticks}${markLines}${strip}${rowLabels}${lines}
    <text class="tick" x="${CX0}" y="${CY1 + 36}">各序列按自身全部记录的最小值–最大值归一化，不代表数值可比</text>
  </svg>`;
}

const pageHead = (sub) => `<div class="page-head"><div><h1>${esc(PAGES.find(p => p[0] === state.view)[1])}</h1><p>${esc(SUBTITLES[state.view])}</p></div></div>${sub ? `<div class="subnav" role="tablist">${SUBPAGES[state.view].map((s, i) => `<button role="tab" aria-selected="${(state.sub[state.view] || 0) === i}" data-sub="${i}">${esc(s)}</button>`).join('')}</div>` : ''}`;
const row = (b, p, right = '') => `<div class="row"><div class="row-main"><div><b>${b}</b>${p ? `<p>${p}</p>` : ''}</div></div>${right}</div>`;
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;

/* ---------------- views ---------------- */
function vDashboard() {
  const p = P(), m = M();
  const next = p.rhythm[0];
  const alertNext = `<div class="alert-strip"><div><b>下一次节点：${esc(next[0])}</b><p>${esc(next[3])}</p></div><button class="soft" data-action="go-review">看复诊节奏</button></div>`;
  const tasks = [];
  tasks.push(['nutrition', '记一笔今天的进食', '餐次 / 份量 / 症状，只记事实不给处理建议', 'go-nutrition']);
  tasks.push(['records', '报告看不懂？先理资料', '上传 → 解析 → 核对 → 入库，原件始终保留', 'go-records']);
  tasks.push(['chat', '和 AI 理一理这一页', '生成可预览的提示词草稿；发送前你确认', 'agent-open']);
  tasks.push(['review', '准备下次复诊清单', '想问的事 + 我的看法，两区分开导出', 'go-review']);
  tasks.push(['labs', '本周期检验结果', '营养线与血象已录入', 'go-labs']);
  const taskCards = tasks.map(t => `<button class="task-entry" data-action="${t[3]}"><span class="entry-icon">${icon(t[0])}</span><b>${t[1]}</b><span>${t[2]}</span><span class="arrow">›</span></button>`).join('');
  const rhythm = `<div class="card"><div class="card-head"><h2>监测节奏（按 ${esc(p.stage)} 取值）</h2><span class="source-link">以医生安排为准</span></div>
    ${p.rhythm.map(r => row(`<b>${r[0]}</b>`, `${r[1]} — ${r[2]}`, `<small>${esc(r[3])}</small>`)).join('')}
    <p class="small-note">以上为指南常见节奏摘录，仅供准备讨论；实际安排以你的医生为准。</p></div>`;
  const cards = (DASH_KEYS[state.profile] || []).filter(k => m[k]).map(k => mcard(k, m[k])).join('');
  return `<div class="page-enter">${pageHead()}
  <div class="hero"><div><span class="eyebrow">当前情况</span><h1>${esc(p.headline)}</h1><p>${esc(p.mindset)}</p>
    <div class="actions"><button class="primary" data-action="go-timeline">看病情一图秀</button><button class="soft" data-action="go-subtype">我的标志物档案</button><button class="soft hero-ai" data-action="agent-open">${icon('chat')}AI 对话</button></div></div>
    <div class="hero-mascot" aria-hidden="true"><span style="font-size:56px">🫂</span></div></div>
  ${alertNext}
  <div class="intent"><i>✓</i><span>工作台只做<b>记录与整理</b>；诊断、方案调整由医生决定。页面里全部资料为<b>演示数据</b>。</span></div>
  <div class="section-title"><h2>接下来可以做的事</h2></div>
  <div class="task-grid">${taskCards}</div>
  <div class="dash-cols"><div class="stack">${rhythm}
    <div class="card"><div class="card-head"><h2>指南不推荐常规做</h2></div>
      ${row('<b>ctDNA / MRD</b>', '不常规推荐用于复发监测（仅临床试验场景）。不设趋势、不进待办。')}
      ${row('<b>PET-CT</b>', '不常规用于复发筛查；仅在医生针对具体情况安排时使用。')}
      <p class="small-note">看到这两项检查的宣传或焦虑信息时，可在这里回看，避免过度检查；具体是否适用由医生判断。</p></div></div>
  <div class="stack">
    ${nutritionCard(m, p)}
    <div class="card"><div class="card-head"><h2>最近指标</h2><span class="source-link">轻点卡片翻面</span></div>
    <div class="metric-grid">${cards}</div></div></div></div></div>`;
}

/* 营养状态卡（SPEC §3：升为看板第二卡）。体重 + 最近进食 + 在用补充剂各取最新一条，
   只做摘要与跳转，不放任何"该怎么吃"的建议。 */
function nutritionCard(m, p) {
  const meal = (p.mealLog || [])[0];
  const dump = (p.dumping || [])[0];
  const sup = (p.supplements || []).length;
  return `<div class="card"><div class="card-head"><h2>营养状态</h2><span class="source-link">体重 + 进食 · 只记不评</span></div>
    <div class="metric-grid">${m.wt ? mcard('wt', m.wt) : ''}${m.alb ? mcard('alb', m.alb) : ''}${m.pa ? mcard('pa', m.pa) : ''}</div>
    ${meal ? row(`<b>最近一餐 · ${esc(meal[0])} ${esc(meal[1])}</b>`, `${esc(meal[2])} · ${esc(meal[3])}；症状：${esc(meal[4])}`) : row('<b>还没有进食记录</b>', '愿意的时候再记；漏记不催不补。')}
    ${dump ? row(`<b>最近一次倾倒症状 · ${esc(dump[0])}</b>`, `${esc(dump[2])}出现 ${esc(dump[3])}（${esc(dump[4])}）`) : ''}
    ${row('<b>在用补充剂</b>', sup ? `${sup} 项，均按医嘱原文记录（无剂量推荐）` : '暂无在用补充剂')}
    <div class="actions"><button class="soft" data-action="go-nutrition">去进食与营养</button></div></div>`;
}

/* 标志物状态四态（SPEC A1）：ok 已检测 / na 未检测 / warn 需关注 / pending 待出。
   未检测与待出都不能显示成「阴性」——配色和文案都分开，避免用户把"没查"读成"没问题"。 */
const MARK_STATE = { ok: ['green', '已检测'], warn: ['yellow', '需关注'], pending: ['violet', '待出'], na: ['grey', '未检测'] };
function vSubtype() {
  const p = P();
  const i = state.sub.subtype || 0;
  const matrix = p.molecular.map(x => {
    const [cls, label] = MARK_STATE[x.state] || MARK_STATE.na;
    return `<div class="row"><div class="row-main"><div><b>${esc(x.k)}</b><p>${esc(x.note)}</p></div></div>
      <div style="text-align:right">${pill(label, cls)}<small style="display:block;margin-top:4px">${esc(x.v)}</small><small style="display:block">${esc(x.src)}</small></div></div>`;
  }).join('');
  const hpCard = p.hp ? `<div class="card accent"><div class="card-head"><h2>${esc(p.hp.title)}</h2>${pill('只记录安排与原文，不做根除建议', 'violet')}</div>
    ${p.hp.rows.map(r => row(`<b>${esc(r[1])}</b>`, esc(r[2]), `<small>${esc(r[0])}</small>`)).join('')}</div>`
    : `<div class="empty"><h3>本档案没有 Hp / 家族史记录</h3><p>是否检测、是否需要家系评估由医生决定；这里只记录已发生的安排与报告原文。</p></div>`;
  const pathology = `<div class="subtype-hero"><div><span class="code">病理与分期档案</span><h2>${esc(p.stage)}</h2><span class="en">${esc(p.path[0])} · 依据：病理报告原件（已归档）</span>
    <div class="subtype-meta">${p.path.map(s => pill(s, 'violet')).join('')}</div></div>
    <div class="path-tree">${p.path.map((s, j) => `<div class="${j === 0 ? 'on' : ''} ${j > 0 ? 'lv' + Math.min(j, 3) : ''}">${esc(s)}</div>`).join('')}</div></div>
    <p class="small-note">分期与病理以病理报告原件为准；不同标本、不同时间的结论分别保留，不用新报告覆盖旧记录。</p>`;
  const consult = `<div class="section-title"><h2>会诊与二次意见</h2></div>
    <div class="card">${row('<b>2026-08-26 · 肿瘤内科</b>', '制定围手术期 / 转化方案；记录医生原话要点。', pill('已存档', 'green'))}
    ${row('<b>2026-09-20 · 营养科</b>', '进食方式与补充剂医嘱；记录要点，不给食谱与剂量。', pill('已存档', 'green'))}
    <p class="small-note">二次意见不是"换医生"，是带着原件去核对方案；工作台只帮你把材料理好。</p></div>`;
  const bodies = [
    pathology,
    `<div class="section-title"><h2>标志物档案</h2><span class="source-link">未检测 ≠ 阴性 · 待出 ≠ 阴性</span></div><div class="card">${matrix}
      <p class="small-note">四项标志物各自独立成立：HER2 的 IHC 2+ 属于交界、需 FISH 复核；PD-L1 CPS 不同抗体与判读标准的结果不合并；MSI/MMR 与 CLDN18.2 各自记各自的状态。未检测的项原样显示"未检测"，在检的显示"待出"，都不补成阴性——是否补做、怎么解读由医生判断。</p></div>`,
    hpCard,
    consult
  ];
  return `<div class="page-enter">${pageHead(true)}${bodies[i] || bodies[0]}</div>`;
}

function vTreatment() {
  const p = P();
  const i = state.sub.treatment || 0;
  const lines = p.lines.map((l, j) => `<button class="line-chip" aria-pressed="${j === 0}">${esc(l.name)}</button>`).join('');
  const cycles = `<div class="table-wrap"><table class="cycle-table"><thead><tr><th>周期</th><th>日期</th><th>用药</th><th>状态</th></tr></thead><tbody>
    ${p.cycles.map(c => `<tr class="${c[4] ? 'done' : 'next'}"><td><b>${esc(c[0])}</b></td><td class="num">${esc(c[1])}</td><td>${esc(c[2])}</td><td>${pill(c[3], c[4] ? 'green' : 'violet')}</td></tr>`).join('')}</tbody></table></div>
    <p class="small-note">周期记录来自出院小结与输液记录原件；更正只新增版本，不覆盖旧记录。</p>`;
  /* 围手术期方案（SPEC A7）：术前 / 术后 / 未手术三阶段分列，阶段标签不省略。
     B 档案未手术，只有一条「未手术」——转化治疗与 MDT 结论同样留在这里。 */
  const periop = p.perioperative ? `<div class="section-title"><h2>${esc(p.perioperative.title)}</h2><span class="source-link">术前 / 术后分列</span></div>
    <div class="card">
    <p class="small-note" style="margin-top:0">阶段、方案与影像/病理结论分列留痕；每次评估都是新记录，不改写历史。</p>
    ${p.perioperative.rows.map(r => row(`<b>${esc(r[0])} · ${esc(r[1])}</b>`, `${esc(r[2])} · ${esc(r[3])}`, `<small style="max-width:220px;text-align:right">${esc(r[4])}</small>`)).join('')}</div>`
    : `<div class="empty"><h3>本档案没有围手术期分期记录</h3><p>围手术期方案用于已手术或计划手术的路径分阶段留痕；本档案没有对应记录，这里保持空态而不是补默认值。</p></div>`;
  /* 腹膜转移与腹腔治疗（SPEC G4）：detail 与 imaging 分列，不判断疗效。 */
  const perit = p.peritoneal ? `<div class="section-title"><h2>${esc(p.peritoneal.title)}</h2><span class="source-link">结论以报告原文为准</span></div>
    <div class="card"><p class="small-note" style="margin-top:0">腹腔灌注、影像评估与 MDT 结论按时间倒序留痕；工作台不判断疗效，也不比较方案。</p>
    ${p.peritoneal.rows.map(r => row(`<b>${esc(r[0])} · ${esc(r[1])}</b>`, `${esc(r[2])}${r[3] && r[3] !== '—' ? `　<span class="pill grey">${esc(r[3])}</span>` : ''}`, `<small style="max-width:200px;text-align:right">${esc(r[4] || '')}</small>`)).join('')}</div>`
    : `<div class="empty"><h3>本档案没有腹膜转移记录</h3><p>腹膜转移与腹腔治疗（含腹腔灌注、HIPEC/PIPAC 等）的留痕入口；本档案未出现该类记录，保持空态。</p></div>`;
  const bodies = [
    `<div class="line-strip">${lines}<button class="line-chip" data-action="add-line">+ 治疗线</button></div>
    <div class="plan-card"><div><span class="eyebrow">当前方案</span><div class="big">${esc(p.lines[0].name)}<small>${esc(p.lines[0].detail)}</small></div>
    <div class="progress"><i style="width:${Math.round(p.cycles.filter(c => c[4]).length / Math.max(p.cycles.length, 1) * 100)}%"></i></div></div>
    <button class="primary" data-action="go-timeline">与指标对照</button></div>
    <p class="small-note">治疗线与方案来自出院小结与医嘱原件；换线、调药以医生决定为准，工作台只做记录。</p>
    ${periop}`,
    `<div class="section-title"><h2>周期与用药</h2></div><div class="card">${cycles}</div>`,
    perit
  ];
  return `<div class="page-enter">${pageHead(true)}${bodies[i] || bodies[0]}</div>`;
}

/* 胃镜随访（SPEC：胃镜替代肠镜位）。既用于「复诊准备 · 胃镜随访」页签，
   也用于「检查与指标 · 影像与胃镜」页签——两处共用同一份数据与同一段说明，不各写一份。 */
function endoscopeCard() {
  const p = P();
  const scope = p.rhythm.filter(r => /胃镜|内镜/.test(r[0]));
  const rows = (p.endoscopy && p.endoscopy.rows) || [];
  return `<div class="section-title"><h2>胃镜随访</h2><span class="source-link">以医生安排为准</span></div>
  <div class="card">${rows.length
    ? rows.map(r => row(`<b>${esc(r[0])} · ${esc(r[1])}</b>`, `${esc(r[2])}${r[3] && r[3] !== '—' ? `　下次：${esc(r[3])}` : ''}`, `<small style="max-width:180px;text-align:right">${esc(r[4] || '')}</small>`)).join('')
    : '<p>本档案暂无胃镜随访记录。</p>'}
  ${scope.length ? `<div class="notice">${scope.map(r => `<b>${esc(r[0])}</b>：${esc(r[1])} — ${esc(r[2])}　<small>${esc(r[3])}</small>`).join('<br>')}</div>` : ''}
  <p class="small-note">残胃镜 / 复查胃镜的间隔由手术方式与病理结果决定；工作台只记录已发生的检查与医生安排的下一个节点，不推导间隔、不做"该不该查"的判断。</p></div>`;
}

/* 进食与营养（胃瘤两条主线之一，4 个页签：切除方式 / 进食记录 / 补充剂与指标 / 倾倒记录）。
   整页不给食谱、不给剂量、不推荐品牌——表结构里就没有这些字段，页面也不补。 */
function vNutrition() {
  const m = M(), p = P();
  const i = state.sub.nutrition || 0;
  /* 切除方式档案（SPEC A3）：四选一 + 手术日期 + 机构。B 未手术 → 空态，不补默认值。 */
  const resection = p.resection ? `<div class="ww-hero"><span class="eyebrow">切除方式档案</span><div class="big">${esc(p.resection.rows[0][1])}</div>
      ${p.resection.rows.map(r => `<p><b>${esc(r[0])}</b> 手术 · ${esc(r[2])} · 吻合方式：${esc(r[3])}　机构：${esc(r[4])}　${esc(r[5])}</p>`).join('')}
      <div class="actions"><button class="soft" data-action="go-labs">看营养指标</button></div></div>
    <div class="section-title"><h2>为什么这一页重要</h2></div>
    <div class="card">${row('<b>切除范围决定吸收方式</b>', '切除范围与吻合方式不同，进食节奏与需要监测的营养素也不同；这里只记录手术记录原文，不做饮食方案。')}
      ${row('<b>体重与营养指标是主指标</b>', '体重、白蛋白 / 前白蛋白、B12、铁、钙 / 维生素 D 放在同一条线上看，趋势在一图秀里回顾。')}</div>`
    : `<div class="empty"><h3>本档案尚未手术</h3><p>切除方式（全胃 / 近端 / 远端 / ESD）建档在术后；本档案当前为转化治疗路径，因此这里保持空态，不填默认值。如后续手术，手术记录里的术式、日期与机构会留在这里。</p></div>`;
  const meals = (p.mealLog || []);
  const mealCard = meals.length ? `<div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期 · 餐次</th><th>份量</th><th>吃了什么</th><th>症状标记</th><th>备注</th></tr></thead><tbody>
      ${meals.map(r => `<tr><td><b>${esc(r[0])}</b> ${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${r[4] === '无' ? pill('无', 'grey') : pill(esc(r[4]), 'yellow')}</td><td><small>${esc(r[5])}</small></td></tr>`).join('')}</tbody></table></div>
      <p class="small-note">只记餐次、份量与你的原话；不做热量换算、不做食材替换建议——表结构里没有这些字段，页面也不补。</p>`
    : `<div class="empty"><h3>还没有进食记录</h3><p>愿意的时候再记；漏记不催不补。默认只记"不寻常的一餐"就够了。</p></div>`;
  const sups = (p.supplements || []);
  const supCard = sups.length ? `${sups.map(r => row(`<b>${esc(r[0])}</b>`, esc(r[1]), `<small>${esc(r[2])}${(r[3] && r[3] !== '—') ? ' → ' + esc(r[3]) : ''} · ${esc(r[4])}</small>`)).join('')}
      <p class="small-note">只显示医嘱原文与起止时间，<b>不给剂量推荐、不推荐品牌</b>；是否调整由医生决定。</p>`
    : `<div class="empty"><h3>暂无在用补充剂</h3><p>医生开了什么、吃到什么时候，会按医嘱原文记在这里。</p></div>`;
  const dumping = (p.dumping || []);
  const dumpCard = dumping.length ? `<div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期 · 餐次</th><th>出现时间</th><th>表现</th><th>自评程度</th><th>备注</th></tr></thead><tbody>
      ${dumping.map(r => `<tr><td><b>${esc(r[0])}</b> ${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${pill(esc(r[4]), r[4] === '轻度' ? 'grey' : 'yellow')}</td><td><small>${esc(r[5])}</small></td></tr>`).join('')}</tbody></table></div>
      <p class="small-note">只记录发生时间、表现与你的原话，<b>不给自我处理方案</b>；"自评程度"是你自己的感受，不是分级判断。带着这些记录去门诊，比临时回忆有用。</p>`
    : `<div class="empty"><h3>本档案没有倾倒症状记录</h3><p>倾倒综合征多见于胃切除术后；本档案尚未手术，所以没有这类记录。术后如出现，可按日期记在这里。</p></div>`;
  const bodies = [
    resection,
    `<div class="section-title"><h2>进食记录</h2><span class="source-link">漏记不催不补 · 只记事实</span></div><div class="card">${mealCard}
      <div class="actions"><button class="primary" data-action="add-meal">记一笔进食</button></div></div>`,
    `<div class="section-title"><h2>补充剂与营养指标</h2><span class="source-link">医嘱驱动 · 无剂量推荐</span></div>
      <div class="card">${supCard}</div>
      <div class="section-title"><h2>营养指标</h2><span class="source-link">数值线 · 翻面看参考区间</span></div>
      <div class="card"><div class="metric-grid">${m.wt ? mcard('wt', m.wt) : ''}${m.alb ? mcard('alb', m.alb) : ''}${m.pa ? mcard('pa', m.pa) : ''}${m.b12 ? mcard('b12', m.b12) : ''}${m.ferritin ? mcard('ferritin', m.ferritin) : ''}${m.vitd ? mcard('vitd', m.vitd) : ''}</div>
      <p class="small-note">这些指标与补充剂医嘱是同一条线，但没有"某个数值就该补多少"的对应规则——对应关系由医生判断。</p></div>`,
    `<div class="section-title"><h2>倾倒记录</h2><span class="source-link">自评记录，不是医生评估</span></div><div class="card">${dumpCard}</div>`
  ];
  return `<div class="page-enter">${pageHead(true)}${bodies[i] || bodies[0]}</div>`;
}

function vLabs() {
  const i = state.sub.labs || 0;
  if (i === 0) return `<div class="page-enter">${pageHead(true)}${metricSections(['肿瘤标志物'])}
    <p class="small-note">同一实验室、同一方法可比；指标卡轻点翻面看参考区间与口径说明。<b>CA19-9 在 Lewis 阴性人群中不表达，缺数值不等于正常</b>——这一点写在卡片背面的口径说明里，不把缺失当结果。</p></div>`;
  if (i === 1) return `<div class="page-enter">${pageHead(true)}${metricSections(['血象', '生化', '电解质'])}
    <p class="small-note">按周期查的安全监测项：血象 / 生化按周期，电解质看方案，症状类只记原话不分级；分类记录不翻面、不连线。</p></div>`;
  return `<div class="page-enter">${pageHead(true)}${endoscopeCard()}
    <div class="section-title"><h2>影像评估</h2><span class="source-link">结论以报告原文为准</span></div>
    <div class="card">${row('<b>影像记录</b>', '影像条目按日期归档在「病情整理 · 资料库」；本页不复制影像结论，也不解读影像。')}</div>
    <p class="small-note">工作台不解读影像；每次评估都是新记录，不改写历史。</p></div>`;
}

/* 病情一图秀 3 页签：数值曲线 / 分类与事件 / 数据口径。
   H11：页签与内容必须按 state.sub 分流，三个页签给的是三块不同的东西——
   「分类与事件」不给曲线（分类记录不连线），「数据口径」解释归一化的边界。
   默认指标是体重（SPEC A6），在左侧「选择指标」里可换。 */
function vTimeline() {
  const m = M();
  const i = state.sub.timeline || 0;
  const [t0, t1] = domain();
  const series = state.sel.filter((c) => m[c]).map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  const groups = CAT_ORDER.map((cat) => ({ cat, codes: Object.keys(m).filter((k) => m[k].cat === cat) })).filter((g) => g.codes.length);
  const pinData = state.pin && m[state.pin.code] ? m[state.pin.code].points.find((p) => p.d === state.pin.date) : null;
  const [bs, be] = dataBounds();
  const rng = `${shortDate(new Date(bs).toISOString().slice(0, 10))} – ${shortDate(new Date(be).toISOString().slice(0, 10))}`;
  const rangeChips = `<div class="chips" style="margin:0 0 14px" aria-label="时间范围">${[['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全期']].map(([k, l]) => `<button class="chip" aria-pressed="${state.range === k}" data-action="range" data-range="${k}">${l}</button>`).join('')}</div>`;
  const rail = `<aside class="rail" aria-label="筛选与指标选择">
      <details class="pick" ${state.sel.length && (typeof window !== 'undefined' && window.innerWidth > 900 ? 'open' : '')}>
        <summary>选择指标 <small>最多 4 个 · 已选 ${state.sel.length}</small></summary>
        <div class="metric-list">
          ${groups.map((g) => `<div class="cat-label">${esc(g.cat)}</div>${g.codes.filter((c) => numPts(m[c]).length).map((c) => `<label class="metric-pick"><input type="checkbox" ${state.sel.includes(c) ? 'checked' : ''} data-pick="${c}"><i style="background:${m[c].color}"></i><span>${esc(m[c].name)}</span><small>${numPts(m[c]).length} 次</small></label>`).join('')}`).join('')}
        </div>
      </details>
      <section><h3>显示</h3>
        <div class="chips">
          <button class="chip" aria-pressed="${state.toggles.treatment}" data-action="toggle" data-key="treatment">治疗节点</button>
          <button class="chip" aria-pressed="${state.toggles.keypoints}" data-action="toggle" data-key="keypoints">末点数值</button>
        </div>
      </section>
      <section><h3>时间窗缩放</h3>
        <div class="zoom"><input type="range" min="40" max="100" value="${state.zoom}" data-action="zoom" aria-label="时间窗缩放"><span>${state.zoom}%</span></div>
        <p class="small-note">右端锚定最新记录；40% 表示只看最近四成时间。</p>
      </section>
      <section><h3>口径</h3><p class="small-note">每条线按该指标全部记录的最小值–最大值归一化，只用于同屏回顾，不能比较不同指标的绝对值；换医院、换方法的结果以来源标注区分。</p></section>
    </aside>`;
  const chartPanel = `<div class="chart-panel">
        <div class="chart-top">
          <div><h2 style="font-size:15px">${series.length} 条序列 · ${state.range === 'all' ? '全期' : '近 ' + state.range.replace('m', ' 月')}</h2><p class="small-note">点击数据点固定详情；治疗条与数据区分离，不压曲线。</p></div>
          <span class="pill grey">${rng}</span>
        </div>
        <div class="legend">${series.map((s) => `<span><i style="background:${s.m.color}"></i><b>${esc(s.m.name)}</b><span class="range">${fmtNum(s.lo, s.m.dec)}–${fmtNum(s.hi, s.m.dec)} ${esc(s.m.unit)}</span></span>`).join('')}</div>
        <p class="scroll-hint small-note">图表可左右滑动</p>
        <div class="chart-wrap">${chartSVG(t0, t1)}</div>
        ${pinData ? `<div class="pin"><div><b>${esc(m[state.pin.code].name)} · ${fmtNum(pinData.v, m[state.pin.code].dec)} ${esc(m[state.pin.code].unit)}</b><p>${esc(longDate(pinData.d))} · 来源：${esc(pinData.src)}</p></div><button class="icon-button" data-action="unpin" aria-label="关闭详情">×</button></div>` : ''}
      </div>`;
  const cardGroups = `<div class="section-title"><h2>指标卡片</h2><span class="source-link">点一张卡翻到背面；每张卡互不影响</span></div>
      ${groups.map((g) => `<div class="metric-group"><div class="metric-group-head"><h3>${esc(g.cat)}</h3><span>${g.codes.length} 项</span></div><div class="metric-grid">${g.codes.map((k) => mcard(k, m[k])).join('')}</div></div>`).join('')}`;
  const events = EVENTS[state.profile] || [];
  const bodies = [
    `${rangeChips}<div class="overview">${rail}<div class="timeline-main">${chartPanel}${cardGroups}</div></div>`,
    /* 「分类与事件」：分类记录与治疗事件清单，不给曲线——分类值没有数值轴，连线会产生假趋势。 */
    `<div class="overview">${rail}<div class="timeline-main">
      <div class="section-title"><h2>分类记录</h2><span class="source-link">只按原文记录，不连线</span></div>
      ${groups.filter((g) => g.codes.some((k) => !numPts(m[k]).length)).map((g) => `<div class="metric-group"><div class="metric-group-head"><h3>${esc(g.cat)}</h3><span>${g.codes.filter((k) => !numPts(m[k]).length).length} 项</span></div><div class="metric-grid">${g.codes.filter((k) => !numPts(m[k]).length).map((k) => mcard(k, m[k])).join('')}</div></div>`).join('')
        || '<div class="empty" style="margin-top:0"><p>本档案没有分类记录。</p></div>'}
      <div class="section-title"><h2>治疗与随访事件</h2><span class="source-link">按时间正序</span></div>
      <div class="card">${events.map((e) => row(`<b>${esc(e.d)}</b>`, esc(e.label))).join('')}
        <p class="small-note">事件按日期留痕，不排序重要性，也不从中推导结论。</p></div>
    </div></div>`,
    /* 「数据口径」：把归一化的边界说清楚，避免用户把同屏曲线当数值比较。 */
    `<div class="card"><div class="card-head"><h2>这张图怎么读</h2></div>
      ${row('<b>归一化</b>', '每条线按该指标自身全部记录的最小值–最大值拉伸到同一高度，只用于同屏看"什么时候升、什么时候降"，不能比较不同指标的绝对值。')}
      ${row('<b>不连线的情况</b>', '分类记录（症状原话、定性结果、每餐份量）没有数值轴，不参与曲线，只在卡片里按原文显示。')}
      ${row('<b>治疗节点在下方泳道</b>', '治疗条与数据区分离，不压曲线；节点只标日期与名称，不评价疗效。')}
      ${row('<b>换医院 / 换方法</b>', '不同来源的结果以来源标注区分，不合并成一条连续曲线。')}
      ${row('<b>缺失不是结果</b>', '某段时间没有点，就是没查；不插值、不补齐、不把空档读成"稳定"。')}
      <p class="small-note">取值范围 ${rng}；右端锚定最新记录。缩放只改变看的时间窗，不改变数值。</p></div>`
  ];
  return `<div class="page-enter">${pageHead(true)}${bodies[i] || bodies[0]}</div>`;
}


/* 心理支持 3 页签：当下感受 / 身体形象与进食社交 / 家庭沟通。
   三个页签各自渲染不同区块——页签与内容必须按 state.sub 分流，
   不能默认返回第一页签（H11：用户逐页截图指出过"tab 和内容不一致"）。 */
function vMind() {
  const p = P();
  const i = state.sub.mind || 0;
  const feels = p.viewpoints.filter(v => !/身体形象|进食社交/.test(v[1]));
  const body = p.viewpoints.filter(v => /身体形象|进食社交/.test(v[1]));
  const notice = `<div class="notice violet">这里的内容<b>默认私密</b>：不进导出、不进看板摘要；只有你显式开放时才会出现在就诊材料里。</div>`;
  const bodies = [
    `<div class="card"><div class="card-head"><h2>当下感受</h2>${pill('私密', 'violet')}</div>
      ${feels.map(v => row(`<b>${esc(v[0])} · ${esc(v[1])}</b>`, esc(v[2]), pill('不是医生结论', 'grey'))).join('')}
      <div class="actions"><button class="soft" data-action="add-viewpoint">记一条感受</button></div></div>`,
    `<div class="card"><div class="card-head"><h2>身体形象与进食社交</h2>${pill('私密', 'violet')}</div>
      ${body.length ? body.map(v => row(`<b>${esc(v[0])}</b>`, esc(v[2]))).join('') : row('<b>暂无记录</b>', '愿意的时候再写；这条只属于你。')}
      <p class="small-note">胃切除后的体重变化、以及在外吃饭时的顾虑都很常见；这些记录只属于你，是否与家人、医生分享由你决定。</p></div>`,
    `<div class="card"><div class="card-head"><h2>想对家人说 / 家庭沟通</h2></div>
      ${row('<b>待沟通</b>', esc(p.familyTalk))}
      <p class="small-note">家族史与筛查的沟通时机由医生与你自己决定；这里只留你想说的话。</p></div>`
  ];
  return `<div class="page-enter">${pageHead(true)}${notice}
  <div class="dash-cols"><div class="stack">${bodies[i] || bodies[0]}</div>
  <div class="stack"><div class="card"><div class="card-head"><h2>本周活动</h2></div>
    ${row('<b>活动量</b>', esc(p.activity))}
    <p class="small-note">运动以你能承受的强度为准；是否调整由医生或康复师决定。</p></div></div></div></div>`;
}

/* 复诊准备 3 页签：复诊节奏 / 胃镜随访 / 就诊准备。 */
function vReview() {
  const p = P();
  const i = state.sub.review || 0;
  const qs = [
    ['下次想问的事', ['辅助 / 围手术期治疗要满几个周期？减量过会影响什么？', '残胃镜复查是术后 1 年做，还是按症状提前？', p.resection ? 'B12 / 铁 / 钙这些补充剂要一直吃吗？复查间隔是多久？' : '如果转化后评估到可切除，下一步是什么？']],
    ['我的看法（不是医生结论）', ['我觉得目前治疗反应能承受，想尽量按计划走。', '希望复查与营养门诊能安排在同一天，减少往返。']]
  ];
  const rhythmCard = `<div class="section-title"><h2>复诊节奏（${esc(p.stage)}）</h2><span class="source-link">以医生安排为准</span></div>
    <div class="card">${p.rhythm.map(r => row(`<b>${esc(r[0])}</b>`, `${esc(r[1])} — ${esc(r[2])}`, `<small>${esc(r[3])}</small>`)).join('')}
    <p class="small-note">ctDNA / PET-CT 不常规推荐，本页不设提醒。节奏摘录仅供准备讨论，实际以医生安排为准。</p></div>`;
  const bodies = [
    rhythmCard,
    endoscopeCard(),
    `<div class="dash-cols"><div class="stack"><div class="card"><div class="card-head"><h2>想问的事</h2><span class="source-link">导出时不合并</span></div>
      ${qs[0][1].map((q, j) => row(`<b>${j + 1}. ${esc(q)}</b>`, '', `<button class="text-button" data-action="toggle-ask" data-i="${j}">已问过 ✓</button>`)).join('')}</div></div>
    <div class="stack"><div class="card"><div class="card-head"><h2>我的看法</h2>${pill('不是医生结论', 'grey')}</div>
      ${qs[1][1].map(q => row(`<b>${esc(q)}</b>`, '')).join('')}
      <p class="small-note">你的判断按"一条信息"记录，会与事实区明确分开，不进趋势、不进摘要事实。</p></div>
    <div class="card"><div class="card-head"><h2>就诊准备</h2></div>
      <div class="actions"><button class="primary" data-action="export-review">生成 Markdown（预览）</button><button class="soft" data-action="go-trials">浏览临床研究线索</button></div>
      <p class="small-note">导出分两区（事实 / 想问与看法），私密条目默认不含。</p></div></div></div>`
  ];
  return `<div class="page-enter">${pageHead(true)}${bodies[i] || bodies[0]}</div>`;
}

/* 临床研究 3 页签：2026 线索 / 已收藏 / 入组问题。
   线索不排序、不打分、不预测；CLDN18.2 / HER2 / PD-L1 CPS 只作检索词，不作"适合你"的判断。 */
function vTrials() {
  const i = state.sub.trials || 0;
  const saved = new Set(state.saved);
  const cardOf = (t) => `<div class="saved-item"><b>${esc(t.title)}</b>
    <p>${esc(t.phase)} · ${esc(t.status)} · 申办：${esc(t.sponsor)}</p>
    <small>NCT ${esc(t.id)} · <a href="${t.url}" target="_blank" rel="noopener">登记页原文 ↗</a></small>
    <div class="actions" style="margin-top:8px">${pill('登记摘录 · 状态未核实', 'yellow')}<button class="soft" data-action="save-trial" data-id="${t.id}">${saved.has(t.id) ? '已收藏 ✓' : '收藏'}</button><button class="text-button" data-action="ask-trial" data-id="${t.id}">加入入组问题</button></div></div>`;
  const notice = `<div class="notice plain"><b>这是 2026 年首次公示研究的本地资料摘录</b>（ClinicalTrials.gov，采集于 2026-10-21；共 236 条，ChinaDrugTrials 与 ChiCTR 本轮未采集）。线索不排序、不推荐、不预测获益；入组资格以研究中心答复为准。</div>`;
  const toolbar = `<div class="toolbar"><div class="chips"><button class="chip" aria-pressed="true">全部 ${TRIALS.length}</button><button class="chip" aria-pressed="false">含中国中心</button><button class="chip" aria-pressed="false">按标志物</button></div>
    <input type="search" placeholder="搜索标题 / NCT 号（原型内不生效）" aria-label="搜索"></div>`;
  const bodies = [
    `${toolbar}${TRIALS.map(cardOf).join('')}`,
    `${saved.size ? TRIALS.filter(t => saved.has(t.id)).map(cardOf).join('') : '<div class="empty" style="margin-top:0"><h3>还没有收藏</h3><p>点线索里的「收藏」，把想再看的试验留在这里；收藏只在本机，不上传。</p></div>'}`,
    `<div class="section-title"><h2>入组问题清单</h2></div>
      <div class="card">${state.questions ? state.questions.map(q => row(`<b>${esc(q)}</b>`, '')).join('') : '<div class="empty" style="margin-top:0"><p>还没有添加问题。点任意试验的「加入入组问题」，把想问研究中心的问题先写在这里。</p></div>'}</div>`
  ];
  return `<div class="page-enter">${pageHead(true)}${notice}${bodies[i] || bodies[0]}</div>`;
}


/* ---------------- 病情整理（records）：上传 → 解析 → 确认指标 → 入库 ---------------- */
function flowSteps(cur) {
  const steps = ['文件上传', '文件解析', '确认指标', '导入数据库'];
  return `<div class="flow-steps">${steps.map((s) => `<span class="${s === cur ? 'on' : ''}">${s}</span>`).join('<span class="fs-arrow">→</span>')}</div>`;
}
function docsTable() {
  const docs = DOCS[state.profile].filter((d) => !state.query || d.name.includes(state.query) || d.type.includes(state.query));
  const pillOf = (s) => s === '已核对' ? 'green' : s === '待解析' ? 'violet' : s === '解析失败' ? 'red' : 'yellow';
  return `<div class="table-wrap"><table><thead><tr><th>材料名称</th><th>日期</th><th>类型</th><th>整理状态</th><th>操作</th></tr></thead><tbody>
    ${docs.map((d) => `<tr><td><b>${esc(d.name)}</b><br><small>${esc(d.note || '模拟资料 · 无真实文件')}</small></td><td>${esc(d.date)}</td><td>${esc(d.type)}</td>
      <td>${pill(d.status, pillOf(d.status))}</td>
      <td><button class="source-link" data-action="source" data-doc="${esc(d.id)}">原文</button> ${d.status === '待核对' ? `<button class="source-link" data-action="go-rec-sub" data-sub-i="1">看草稿</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>${!docs.length ? '<div class="empty"><h3>没有找到这份材料</h3><p>试试「病理」「检验」或清空搜索。</p></div>' : ''}`;
}
function candidateRows() {
  return CANDS[state.profile].map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.value)}</td>
    <td><button class="source-link" data-action="source" data-source="${esc(c.source)}">${esc(c.source.split('·').slice(-1)[0].trim())} ↗</button></td>
    <td>${pill(c.status === 'accepted' ? '已核对' : c.status === 'needs_review' ? '需要确认' : '未核对', c.status === 'accepted' ? 'green' : 'yellow')}</td>
    <td><button class="source-link" data-action="candidate" data-id="${esc(c.id)}">查看 / 更正</button></td></tr>`).join('');
}
function pathologyCard() {
  const pa = P().pathology;
  if (!pa) return '';
  return `<div class="grid two">
    <section class="card"><div class="card-head"><h2>${esc(pa.title)}</h2>${pill(pa.status, 'green')}</div>
      <dl style="display:grid;grid-template-columns:104px 1fr;gap:8px 10px;font-size:12.5px;margin:0">
        ${pa.rows.map((r) => `<dt style="color:var(--muted)">${esc(r[0])}</dt><dd style="margin:0">${esc(r[1])}</dd>`).join('')}
      </dl></section>
    <section class="card"><h2>这份档案还缺什么</h2><p>缺项表示尚未录入，不代表需要补做检查。</p>
      ${pa.gaps.map((g) => row(`<b>${esc(g[0])}</b>`, esc(g[1]), pill('待补', 'yellow'))).join('')}
      <button class="source-link" data-action="go-rec-sub" data-sub-i="1">继续整理材料 →</button></section>
  </div>`;
}
function metricSections(cats = CAT_ORDER) {
  const m = M();
  return cats.map((c) => {
    const ks = Object.keys(m).filter((k) => m[k].cat === c);
    if (!ks.length) return '';
    const tag = c === '肿瘤标志物' ? '<span class="source-link">同一实验室可比</span>' : c === '治疗毒性' ? '<span class="source-link">只记原话，不分级</span>' : c === '电解质' ? '<span class="source-link">方案相关关注项</span>' : '';
    return `<div class="section-title"><h2>${c}</h2>${tag}</div><div class="metric-grid">${ks.map((k) => mcard(k, m[k])).join('')}</div>`;
  }).join('');
}
/* ---------------- 本机文件上传（系统原生选择窗口） ---------------- */
const TYPE_BY_EXT = { pdf: '报告', jpg: '影像', jpeg: '影像', png: '影像', heic: '影像', docx: '其他', doc: '其他', txt: '其他', xlsx: '检验' };
function guessType(name) {
  if (/病理|biopsy|patho/i.test(name)) return '病理';
  if (/出院|住院|admission|discharge/i.test(name)) return '住院';
  if (/基因|分子|检测|血常规|生化|化验|lab/i.test(name)) return '检验';
  if (/(^|[^a-z])(ct|mri|pet)([^a-z]|$)|超声|影像/i.test(name)) return '影像';
  return TYPE_BY_EXT[(name.split('.').pop() || '').toLowerCase()] || '其他';
}
const fmtSize = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const DEMO_CAND = {
  病理: ['病理分期（演示占位）', 'pT3N1bM0（演示值，待核对）'],
  检验: ['最近一次肿瘤标志物（演示占位）', 'CEA 3.9 μg/L（演示值，待核对）'],
  住院: ['出院日期（演示占位）', '2026-08-20（演示值，待核对）'],
  影像: ['影像结论（演示占位）', '未见明确复发征象（演示值，待核对）'],
  报告: ['报告日期（演示占位）', '2026-10-18（演示值，待核对）'],
  其他: ['材料日期（演示占位）', '2026-10-18（演示值，待核对）']
};

function ingestFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (state.parsing) { toast('上一份还在解析，稍等一下'); return; }
  const docs = DOCS[state.profile];
  const fresh = [], dup = [], seen = new Set();
  for (const f of files) {
    const key = `${f.name}|${f.size}`;
    if (seen.has(key) || docs.some((d) => d.fileName === f.name && d.size === f.size)) { dup.push(f.name); continue; }
    seen.add(key); fresh.push(f);
  }
  if (!fresh.length) { toast('这些材料已在资料库（按文件名 + 大小去重），没有重复新增'); return; }
  for (const f of fresh) {
    const id = 'up' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6);
    docs.unshift({ id, name: f.name.replace(/\.[^.]+$/, ''), fileName: f.name, size: f.size, date: todayISO(),
      type: guessType(f.name), status: '待解析', note: `本机文件 · ${fmtSize(f.size)}（只读文件名与大小）` });
    state.uploads += 1;
  }
  state.lastUpload = docs[0] ? docs[0].id : null;
  state.parsing = true; state.parseError = false; state.parsingName = fresh[0].name;
  if (state.view !== 'records') { state.view = 'records'; location.hash = 'records'; }
  state.sub.records = 0;
  render();
  setTimeout(() => {
    for (const f of fresh) {
      const d = docs.find((x) => x.fileName === f.name && x.size === f.size && x.status === '待解析');
      if (!d) continue;
      d.status = '待核对';
      const [cn, cv] = DEMO_CAND[d.type] || DEMO_CAND.其他;
      CANDS[state.profile].push({ id: 'cu' + d.id, name: cn, value: cv, source: `${d.name} · 第 1 页`, status: 'candidate' });
    }
    state.parsing = false; state.parsingName = '';
    render();
    toast(`已加入 ${fresh.length} 份材料，候选在「整理草稿 / 核对」${dup.length ? `；${dup.length} 份重复已跳过` : ''}`);
  }, 900);
}

function vRecords() {
  const sub = SUBPAGES.records[state.sub.records || 0]; let body = '';
  if (sub === '资料库') {
    body = `<div class="toolbar"><input aria-label="搜索材料名称或类型" placeholder="搜索材料名称或类型" value="${esc(state.query)}" data-action="records-search">
      <div class="actions">${pill(state.uploads ? '含本机文件 · 只读文件名不读内容' : '全部为模拟数据', 'violet')}
        <button class="primary" data-action="pick-file">上传本次资料</button>
        <button class="soft" data-action="load-report">载入模拟报告</button>
        <input type="file" id="file-picker" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.heic,.docx,.doc,.txt,.xlsx">
      </div></div>
      ${state.parsing ? `<div class="card" role="status">正在解析「${esc(state.parsingName || '本次资料')}」…原件留在本机，解析结果只作候选</div>` : ''}
      ${state.parseError ? `<div class="notice warn">解析失败。材料仍保留在资料库，不产生候选，可重试或手工核对。<button class="source-link" data-action="retry">重试</button></div>` : ''}
      <div class="card" id="docs-table">${docsTable()}</div>
      ${flowSteps('文件上传')}
      <div class="help-box">上传走系统原生文件选择窗口：选中的文件只读取<b>文件名与大小</b>，原型不读取内容、不上传云端。解析→候选→核对→接受入库的完整链路可用「载入模拟报告」演示；解析失败不产生候选，原件不删、随时可重试。<button class="source-link" data-action="parse-fail">演示解析失败</button></div>`;
  } else if (sub === '整理草稿 / 核对') {
    const pending = CANDS[state.profile].filter((c) => c.status !== 'accepted').length;
    body = `${flowSteps('确认指标')}
      <div class="notice ${pending ? 'warn' : ''}">${pending ? `整理草稿 · 仍有 ${pending} 项未核对。可以先看轮廓，暂时不处理疑点。` : '整理草稿 · 这一档的候选都已核对。'}</div>
      <div class="card"><div class="card-head"><h2>从材料里抽出来的候选字段</h2><span class="source-link">解析结果 · 候选不是结论</span></div>
      <p>候选只表示"解析读到了这一项"；接受 = 你逐字核对过转录，不等于医学审核。接受后写入演示数据库（record + 事实表），原始候选不覆盖、留版本。</p>
      <div class="table-wrap"><table><thead><tr><th>项目</th><th>材料中的内容</th><th>来源</th><th>状态</th><th>操作</th></tr></thead><tbody>${candidateRows()}</tbody></table></div>
      <div class="actions" style="margin-top:12px"><button class="soft" data-action="go-rec-sub" data-sub-i="0">回到资料库</button><button class="primary" data-action="add-review-question">保留核实问题</button></div></div>
      <div class="help-box">解析失败的文件不会出现在这里（不产生候选）；这里的每一项都能跳回原文出处。</div>`;
  } else if (sub === '病情档案') {
    body = `<div class="notice">不同标本、时间与来源的结果分别保留。不能用一份最新报告覆盖全部历史；未检测不等于阴性。</div>${pathologyCard()}`;
  } else if (sub === '指标检测') {
    body = `<div class="notice">以下为模拟数值。趋势只呈现记录，不代表疗效、复发或诊断判断；不同单位与方法需分开核对。</div>${metricSections()}
      <div class="help-box">点卡片会在原位翻转看参考区间；分类记录（神经毒性、尿蛋白等）不翻面、不连线。</div>`;
  } else {
    const docs = DOCS[state.profile], cands = CANDS[state.profile];
    const checked = cands.filter((c) => c.status === 'accepted').length;
    body = `<div class="grid two">
      <section class="card"><div class="card-head"><h2>就诊摘要预览</h2>${pill('模拟资料', 'violet')}</div>
        <p>范围：${docs.length ? docs[0].date : '—'} 至 2026-10-18 · 本次只预览资料组织与分享选择。</p>
        <div class="row"><div><b>病情与治疗材料</b><p>${docs.length} 份材料，保留各自日期与核对状态（待核对 ${docs.filter((d) => d.status !== '已核对').length} 份）。</p></div></div>
        <div class="row"><div><b>候选字段</b><p>${cands.length} 项中已核对 ${checked} 项；未核对项在导出里保留"未核对"标记。</p></div></div>
        <div class="row"><div><b>准备讨论的问题</b><p>${(state.questions || []).length} 个，可编辑与选择。</p></div></div>
        <div class="notice">心理与「我的看法」默认不进入这份摘要。</div>
        <button class="primary" data-action="export-review">编辑并导出问题清单</button></section>
      <section class="card"><h2>分享之前，再看一眼</h2>
        <p>未核对内容与来源状态在所有格式中都要保留。原型下载只包含主动选择的问题。</p>
        <div class="notice plain" style="margin-top:14px">一期只做 Markdown 导出；PDF/DOCX 等格式需逐格式验收，未实现。</div>
        <details><summary>导出会包含什么</summary><p>资料范围、来源版本、已核对与草稿区分、选入的问题；不含病历原文与私密记录。</p></details></section></div>`;
  }
  return `<div class="page-enter">${pageHead(true)}${body}</div>`;
}

/* 10 个一级页与 PAGES 一一对应；去掉肠癌的 stoma（内容并入 nutrition）。 */
const VIEWS = { dashboard: vDashboard, records: vRecords, subtype: vSubtype, treatment: vTreatment, labs: vLabs, timeline: vTimeline, nutrition: vNutrition, mind: vMind, review: vReview, trials: vTrials };

/* ---------------- agent dock（dsh 原生会话挂载位） ---------------- */
const FORBIDDEN = ['建议治疗', '可能复发', '预后良好', '治愈率', '可以停药', '无需就医', '推荐方案', '生存率'];
const PAGE_CONTEXT = {
  dashboard: () => ({ facts: [`${P().name}：${P().headline}`, '监测节奏卡按分期取值，并以医生安排为准'], missing: ['CLDN18.2 / MSI 未检测（A 档案）', '下次 CT 具体日期'] }),
  subtype: () => ({ facts: P().molecular.map(x => `${x.k}：${x.v}（${x.src}）`), missing: P().molecular.filter(x => x.state === 'na').map(x => `${x.k} 检测状态`) }),
  treatment: () => ({ facts: P().cycles.map(c => `${c[0]} ${c[1]} ${c[2]}（${c[3]}）`), missing: P().peritoneal ? ['下次 MDT 评估是否手术的具体结论'] : ['第 3 周期起日期'] }),
  nutrition: () => ({ facts: P().resection ? [`切除方式：${P().resection.rows[0][1]}（${P().resection.rows[0][0]} 手术）`] : ['本档案尚未手术'], missing: P().supplements.length ? ['补充剂复查的具体日期'] : ['营养门诊记录'] }),
  labs: () => ({ facts: Object.values(M()).filter(m => m.points && m.points.length).map(m => `${m.name} 最近：${String(m.points.slice(-1)[0].v)}（${m.points.slice(-1)[0].d}）`), missing: ['CLDN18.2 检测结果（A 档案未查、B 档案在检）'] }),
  timeline: () => ({ facts: ['一图秀当前勾选：' + state.sel.map(k => M()[k].name).join('、')], missing: [] }),
  nutrition: () => ({ facts: [`体重最近：${M().wt.points.slice(-1)[0].v} kg（${M().wt.points.slice(-1)[0].d}）`], missing: ['营养科随诊记录'] }),
  mind: () => ({ facts: ['本页内容默认私密，提示词不携带具体感受原文'], missing: [] }),
  review: () => ({ facts: P().rhythm.map(r => `${r[0]}：${r[1]}（${r[2]}）`), missing: ['想问清单中 1 条待确认'] }),
  trials: () => ({ facts: ['2026 线索共 ' + TRIALS.length + ' 条（真实登记摘录，状态未核实）'], missing: [] })
};
function buildPrompt() {
  const ctx = PAGE_CONTEXT[state.view]();
  const title = PAGES.find(p => p[0] === state.view)[1];
  return [`【来自小胃宝工作台 · ${title}页】`, `档案：${P().name}（${P().meta}）——演示数据`, '',
    '本页已核对的事实：', ...ctx.facts.map(f => '- ' + f), '',
    '尚未核对 / 待确认：', ...(ctx.missing.length ? ctx.missing.map(f => '- ' + f) : ['- （无）']), '',
    '边界：以上是记录整理，不是医疗建议；请基于原文与医生沟通，不要求工作台外推结论。'].join('\n');
}
function mockReply() {
  return '根据你整理的本页事实：这些记录显示治疗在按计划推进，监测节奏也有依据。你提到的未确认事项（未检测标志物、下次影像日期），适合在下次门诊清单里逐条向医生确认。本回复不构成医疗建议。';
}
function renderAgent() {
  const dock = $('#agent-dock'), grid = $('#work-grid'), btn = $('#agent-toggle');
  dock.hidden = !state.agentOpen;
  grid.classList.toggle('agent-open', state.agentOpen);
  grid.classList.toggle('agent-wide', state.agentOpen && state.agentSize === 'wide');
  btn.setAttribute('aria-expanded', String(state.agentOpen));
  $('#agent-state').textContent = state.agentOpen ? '已打开' : '未进入激活';
  $('#agent-toggle i').classList.toggle('grey', !state.agentOpen);
  $('#agent-toggle i').classList.toggle('on', state.agentOpen);
  $('#agent-dot').classList.toggle('on', state.agentOpen);
  $$('.agent-sizes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === state.agentSize)));
  const body = $('#agent-body');
  if (!body.dataset.built) {
    body.innerHTML = `<div class="agent-note"><b>dsh 原生会话挂载位</b><br>原生会话仅在 DSH Desktop 内可用；当前为浏览器预览，这里保留宿主会话的挂载点（#dsh-conversation-slot），不模拟聊天窗口。</div>
      <div id="dsh-conversation-slot" aria-live="polite"></div>`;
    body.dataset.built = '1';
  }
}
function agentBuild() {
  const slot = $('#dsh-conversation-slot');
  slot.innerHTML = `<div class="agent-card"><h4>提示词预览（发送前可读 · 由你在宿主会话发送）</h4><pre>${esc(buildPrompt())}</pre></div>`;
}
function agentDemo() {
  const slot = $('#dsh-conversation-slot');
  const text = mockReply();
  const hits = FORBIDDEN.filter(w => text.includes(w));
  slot.innerHTML = `<div class="agent-card"><h4>模拟回复 · 红线自检</h4><pre>${esc(text)}</pre>
    <div class="agent-check">${hits.length ? hits.map(h => `<span class="hit">命中禁用词：${esc(h)}</span>`).join('') : '<span class="pass">✓ 未命中禁用词表（' + FORBIDDEN.length + ' 项）</span><span class="pass">✓ 免责语句在否定语境中出现</span>'}</div></div>`;
}

/* ---------------- dialogs / toast ---------------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2200); }
function openDialog(eyebrow, title, body, foot = '') {
  $('#dialog-eyebrow').textContent = eyebrow; $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body; $('#dialog-foot').innerHTML = foot;
  $('#dialog').showModal();
}
const closeDialog = () => $('#dialog').close();

function dlgProfiles() {
  openDialog('小胃宝', '切换演示档案', Object.entries(PROFILES).map(([k, p]) => `
    <button class="profile-row ${state.profile === k ? 'on' : ''}" data-pick-profile="${k}">
      <div><b>${esc(p.name)}的资料</b><p>${esc(p.meta)} · ${esc(p.headline)}</p></div><span class="profile-caret">${state.profile === k ? '当前' : '切换'}</span></button>`).join(''),
    '<button data-action="close">取消</button>');
}
function dlgSettings() {
  openDialog('小胃宝', '设置', `<div class="cfg-tabs" role="tablist">
  <button role="tab" aria-selected="true" data-action="cfg-tab" data-tab="ws">资料目录</button><button role="tab" aria-selected="false" data-action="cfg-tab" data-tab="parse">文档解析</button><button role="tab" aria-selected="false" data-action="cfg-tab" data-tab="kb">临床数据库</button></div>
  <div class="cfg-block" style="margin-top:16px" data-tab="ws"><h3>工作区资料目录</h3><div class="path-row"><code>~/Documents/StompalWorkspace（演示值）</code><button class="soft">选择…</button></div>
  <p class="small-note">患者数据只存入你明确选择的目录；工作台不把资料上传云端。</p></div>
  <div class="cfg-block" style="margin-top:12px" data-tab="parse" hidden><h3>文档解析（MinerU）</h3><div class="token-row"><code class="masked">MINERU_TOKEN 已配置（掩码：mr-****）</code></div>
  <p class="small-note">Token 只存本机 .secrets/（mode 600）；解析结果永远是候选，核对后才入档。</p></div>
  <div class="cfg-block" style="margin-top:12px" data-tab="kb" hidden><h3>2026 临床数据库</h3><div class="path-row"><code>gastric_cancer_trials_2026.sqlite · 236 条（演示）</code></div>
  <p class="small-note">离线快照；中国注册库未采集，覆盖未知。</p></div>`, '<button class="primary" data-action="close">完成</button>');
}
function dlgAbout() {
  openDialog('小胃宝', '关于', `<div class="about"><div class="brand no-mark" style="zoom:2.2"></div><div class="about-meta">
    <div class="about-ver"><b>v${APP_INFO.version}</b>${pill(APP_INFO.channelLabel, 'violet')}</div>
    <dl><div><dt>构建</dt><dd>${APP_INFO.build}</dd></div><div><dt>形态</dt><dd>交互原型（单机多文件）· 全部患者数据为模拟</dd></div>
    <div><dt>数据</dt><dd>2026 临床试验：真实登记摘录（ClinicalTrials.gov），状态未核实</dd></div>
    <div><dt>家族</dt><dd>小 X 宝家族 · Stompal 小胃宝</dd></div></dl></div></div>`, '<button class="primary" data-action="close">关闭</button>');
}
function dlgHelp() {
  openDialog('小胃宝', '原型操作说明', `<div class="cfg-block">顶栏「AI 对话」按钮打开右侧<b>原生会话挂载位</b>（可 × 隐藏、窄/标准/宽三档）。「整理本页要点」生成发送前可读的提示词；「模拟回复自检」演示文本层红线扫描。</div>
  <div class="cfg-block" style="margin-top:12px">「检查与指标」「看板」里的数值卡<b>轻点翻面</b>看参考区间；分类记录（倾倒症状、腹水描述、每餐份量）不翻面、不连线。「病情一图秀」左侧可勾选指标、拖动缩放。</div>
  <div class="cfg-block" style="margin-top:12px">左上角头像可切换<b>两个演示档案</b>：李先生（ⅡB 远端胃切除术后 · 倾倒症状 · HER2 阴性）、赵女士（Ⅳ 期腹膜转移 · HER2 阳性 · 转化治疗中）。</div>`, '<button class="primary" data-action="close">知道了</button>');
}
function dlgExport() {
  const p = P();
  const md = ['# 复诊准备（演示导出）', '', `档案：${p.name}（${p.meta}）`, '', '## 事实区（已核对）', ...p.rhythm.map(r => `- ${r[0]}：${r[1]}（${r[2]}）`), '', '## 想问的事 / 我的看法（不是医生结论）', '- （按页面勾选结果导出；私密条目默认不含）', '', '> 本文件由工作台整理，不构成医疗建议。'].join('\n');
  openDialog('小胃宝', '导出编辑（Markdown）', `
    <textarea id="export-edit" aria-label="导出内容，可直接编辑" style="width:100%;min-height:320px;font:12px/1.7 ui-monospace,SFMono-Regular,monospace;padding:12px;border:1px solid #d8e0ea;border-radius:10px;background:#fff;color:#213139;resize:vertical">${esc(md)}</textarea>
    <p class="small-note">直接在上方编辑；「我的看法」区永远带"不是医生结论"标注。保存到资料目录的是编辑后的全文。</p>`,
    '<button class="soft" data-action="close">取消</button><button class="primary" data-action="export-save">保存到资料目录</button>');
}

/* ---------------- render root ---------------- */
/* 数字刷动：渲染后从 0 滚动到目标值（easeOutCubic，650ms；reduced-motion 直接显示终值） */
function animateCountups(root) {
  if (!root || typeof root.querySelectorAll !== 'function' || typeof requestAnimationFrame !== 'function') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const DUR = 650;
  root.querySelectorAll('[data-countup]').forEach((el) => {
    const target = parseFloat(el.dataset.countup);
    if (!isFinite(target)) return;
    const dec = el.dataset.dec === undefined ? 1 : +el.dataset.dec;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / DUR);
      const ease = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * ease).toFixed(dec);
      if (k < 1) requestAnimationFrame(step); else el.textContent = target.toFixed(dec);
    };
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  });
}

function render() {
  const p = P();
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) => {
    const count = id === 'trials' ? TRIALS.length : null;
    return `<button class="nav-button" data-nav="${id}" ${state.view === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
  }).join('');
  $('#breadcrumb').textContent = PAGES.find(x => x[0] === state.view)[1];
  $('#profile-name').textContent = `${p.name}的资料`;
  $('#profile-meta').textContent = p.meta;
  $('#profile-avatar').textContent = p.name[0];
  $('#main').innerHTML = (VIEWS[state.view] || vDashboard)();
  $('#main').classList.remove('page-enter');
  animateCountups($('#main'));
  renderAgent();
  if (state.agentOpen) $('#agent-body').dataset.built = ''; // 换页后重建挂载位提示
}

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { state.view = nav.dataset.nav; location.hash = state.view; render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); return; }
  const sub = e.target.closest('[data-sub]');
  if (sub) { state.sub[state.view] = +sub.dataset.sub; render(); return; }
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const k = pick.dataset.pick;
    if (pick.checked) {
      if (state.sel.length >= 4) { pick.checked = false; toast('最多同时看 4 个指标；取消一个再加。'); return; }
      if (!state.sel.includes(k)) state.sel.push(k);
    } else {
      if (state.sel.length === 1) { pick.checked = true; toast('至少留一个指标。'); return; }
      state.sel = state.sel.filter(x => x !== k);
    }
    render(); return;
  }
  const pp = e.target.closest('[data-pick-profile]');
  if (pp) { state.profile = pp.dataset.pickProfile; state.sel = defaultSel(pp.dataset.pickProfile); state.pin = null; closeDialog(); render(); toast(`已切换到 ${P().name}的资料（演示）`); return; }
  const card = e.target.closest('.mcard[data-mcard]');
  if (card && !card.dataset.static) { flipCard(card.dataset.mcard); return; }
  const act = e.target.closest('[data-action]')?.dataset.action;
  if (!act) return;
  const map = {
    profiles: dlgProfiles, settings: dlgSettings, about: dlgAbout, help: dlgHelp,
    close: closeDialog, 'open-store': () => toast('资料目录已激活（演示）'),
    'go-review': () => { state.view = 'review'; location.hash = 'review'; render(); },
    'go-labs': () => { state.view = 'labs'; location.hash = 'labs'; render(); },
    'go-timeline': () => { state.view = 'timeline'; location.hash = 'timeline'; render(); },
    'go-subtype': () => { state.view = 'subtype'; location.hash = 'subtype'; render(); },
    'go-trials': () => { state.view = 'trials'; location.hash = 'trials'; render(); },
    'go-records': () => { state.view = 'records'; location.hash = 'records'; render(); },
    'go-rec-sub': (el) => { state.view = 'records'; state.sub.records = +el.dataset.subI; location.hash = 'records'; render(); },
    'go-nutrition': () => { state.view = 'nutrition'; location.hash = 'nutrition'; render(); },
    source: (el) => {
      const d = el.dataset.doc ? DOCS[state.profile].find((x) => x.id === el.dataset.doc) : null;
      const line = d ? `${d.fileName || d.name}${d.size ? ` · ${fmtSize(d.size)}` : ''}（${d.date}）` : el.dataset.source || '';
      openDialog('小胃宝', '原文出处', `<p style="font-size:12.5px">${esc(line)}</p><p class="small-note">原件存放在你选的资料目录 imports/ 下；工作区不改动原文，也不替你解释它。</p>`, '<button class="primary" data-action="close">关闭</button>');
    },
    'pick-file': () => { const inp = $('#file-picker'); if (inp && typeof inp.click === 'function') inp.click(); else toast('当前浏览器不支持选择本机文件'); },
    'export-save': () => {
      const ta = $('#export-edit');
      const txt = ta ? ta.value.trim() : '';
      if (!txt) { toast('导出内容是空的；先填一点内容再保存。'); return; }
      const docs = DOCS[state.profile];
      docs.unshift({ id: 'ex' + Date.now().toString(36), name: `复诊准备 · ${P().name} · ${todayISO()}`, fileName: `复诊准备-${todayISO()}.md`, size: new Blob([txt]).size, date: todayISO(), type: '其他', status: '待核对', note: '生成文件 · 由导出创建，可在草稿里核对' });
      closeDialog();
      toast('已保存到资料目录 exports/（演示）；在「病情整理 · 资料库」可见');
    },
    'load-report': () => {
      if (state.parsing) return;
      if (state.loaded[state.profile]) { toast('模拟报告已载入，没有重复新增'); return; }
      state.parsing = true; state.parseError = false; render();
      setTimeout(() => {
        DOCS[state.profile].push({ id: 'dx' + state.profile, name: '复查记录 · 新模拟报告', date: '2026-10-18', type: '其他', status: '待核对' });
        CANDS[state.profile].push({ id: 'cx' + state.profile, name: '下次随访安排', value: '2027-01 前后（示例，以医生安排为准）', source: '复查记录 · 新模拟报告 · 第 1 页', status: 'candidate' });
        state.loaded[state.profile] = true; state.parsing = false;
        if (state.view === 'records') render();
        toast('解析完成：候选已放入「整理草稿 / 核对」');
      }, 900);
    },
    'parse-fail': () => {
      const d = DOCS[state.profile].find((x) => x.id === state.lastUpload);
      if (d) d.status = '解析失败';
      state.parseError = true; render();
      toast(d ? `「${d.name}」解析失败：未产生候选，原件保留，可重试` : '模拟解析失败：未产生候选，原件保留');
    },
    retry: () => { state.parseError = false; toast('模拟重试完成；原件始终保留'); render(); },
    candidate: (el) => {
      const c = CANDS[state.profile].find((x) => x.id === el.dataset.id);
      if (!c) return;
      openDialog('小胃宝', '核对这一项内容',
        `<div class="notice">核对表示"转录已逐字检查过"，不等于医学审核。</div>
        <label style="display:block;margin-top:10px"><span class="form-label">${esc(c.name)}</span><input id="cand-input" style="width:100%" value="${esc(c.value)}" maxlength="160"></label>
        <p class="small-note">来源：${esc(c.source)}。暂时不确定就保留待核对状态，不会丢。</p>`,
        `<button class="soft" data-action="close">现在先不核对</button><button class="primary" data-action="cand-save" data-id="${esc(c.id)}">接受这条记录</button>`);
    },
    'cand-save': (el) => {
      const c = CANDS[state.profile].find((x) => x.id === el.dataset.id);
      const v = $('#cand-input') ? $('#cand-input').value.trim() : '';
      if (c && v) { c.value = v; c.status = 'accepted'; }
      closeDialog(); render(); toast('已接受：写入演示数据库（record + 事实表），候选留版本不覆盖');
    },
    'add-review-question': () => {
      const q = state.profile === 'A' ? '请帮我核实：病理报告的脉管 / 神经侵犯结论，以及 CLDN18.2 有没有必要补做。' : '请帮我核实：MDT-2 影像评估的腹膜病灶范围与结论原文，以及 CLDN18.2 检测结果。';
      state.questions = state.questions || [];
      if (!state.questions.includes(q)) state.questions.push(q);
      render(); toast('已加入复诊准备的问题清单');
    },
    'add-dumping': () => toast('原型内不落库；真实版在这里记一次倾倒症状'),
    'add-meal': () => toast('原型内不落库；真实版在这里记一笔进食（餐次 / 份量 / 症状）'),
    'add-viewpoint': () => toast('感受会记为"一条信息"，标注不是医生结论'),
    'add-line': () => toast('新增治疗线需核对方案原件后建立'),
    'export-nutrition': () => toast('就诊展示：最近 10 条进食记录 + 在用补充剂（演示）'),
    'export-review': dlgExport,
    'toggle-ask': (el) => { el.textContent = el.textContent.includes('✓') ? '标记已问' : '已问过 ✓'; },
    'save-trial': (el) => { const id = el.closest('[data-action]').dataset.id ?? el.dataset.id; if (state.saved.includes(id)) { state.saved = state.saved.filter(x => x !== id); } else state.saved.push(id); render(); },
    'ask-trial': (el) => { const id = el.closest('[data-action]').dataset.id ?? el.dataset.id; const t = TRIALS.find(x => x.id === id); state.questions = state.questions || []; const q = `${t.id}：入组条件是否包含我的分期与既往治疗？`; if (!state.questions.includes(q)) state.questions.push(q); render(); toast('已加入入组问题清单'); },
    range: (el) => { state.range = el.dataset.range; render(); },
    toggle: (el) => { state.toggles[el.dataset.key] = !state.toggles[el.dataset.key]; render(); },
    pin: (el) => { state.pin = { code: el.dataset.code, date: el.dataset.date }; render(); },
    unpin: () => { state.pin = null; render(); },
    zoom: () => {},
    agent: () => { state.agentOpen = !state.agentOpen; renderAgent(); },
    'agent-open': () => { state.agentOpen = true; renderAgent(); toast('AI 对话面板已打开；× 只是收起，不会结束会话'); },
    'agent-build': agentBuild,
    'agent-demo': agentDemo
  };
  if (act === 'agent-size') { state.agentSize = e.target.closest('[data-action]').dataset.size; renderAgent(); return; }
  if (act === 'cfg-tab') {
    const el = e.target.closest('[data-action]');
    document.querySelectorAll('.cfg-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
    document.querySelectorAll('.cfg-block[data-tab]').forEach((b) => { b.hidden = b.dataset.tab !== el.dataset.tab; });
    return;
  }
  if (map[act]) map[act](e.target.closest('[data-action]'));
});
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-action="zoom"]')) { const sib = e.target.nextElementSibling; if (sib) sib.textContent = e.target.value + '%'; }
  if (e.target.matches('[data-action="records-search"]')) {
    state.query = e.target.value;
    const wrap = $('#docs-table'); if (wrap) wrap.innerHTML = docsTable();
  }
});
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'file-picker') { ingestFiles(e.target.files); e.target.value = ''; return; }
  const el = e.target.closest('[data-action]');
  if (el && el.dataset.action === 'zoom') { state.zoom = Number(el.value); render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#dialog').open) { closeDialog(); return; }
  const card = e.target.closest && e.target.closest('.mcard[data-mcard]:not([data-static])');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipCard(card.dataset.mcard); }
});
$('#font-toggle').addEventListener('click', () => { const on = document.body.classList.toggle('large'); $('#font-toggle').setAttribute('aria-pressed', String(on)); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== state.view && VIEWS[v]) { state.view = v; render(); } });

const initialHash = location.hash.slice(1);
if (VIEWS[initialHash]) state.view = initialHash;
render();
