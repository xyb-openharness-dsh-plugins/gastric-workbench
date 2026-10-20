/* 读模型（胃癌）：把库里的行还原成**前端要的形状**。
 *
 * 契约：`GET /api/bootstrap` 的 profiles 必须与 prototypes/v0.2/demo-data.js 里的同名档案
 * 逐字段一致（test/store.test.mjs 有 deep-equal 断言守着）。所以这里不做任何"顺手优化"：
 * 字段名、数组/对象的嵌套层级、null 与缺失的语义都跟着 demo-data.js 走。
 *
 * 三条容易踩的：
 * 1. 数值指标点用 v_num，分类/文字用 v_text；读出来统一还原成 `v`（数字就是数字）。
 * 2. 排序：有 ord 的表按 ord，events 没有 ord，按 rowid（＝插入顺序）。
 *    复合主键表（metrics 等）裸 SELECT 会按索引字母序返回，必须 ORDER BY rowid。
 * 3. kind 列：播种时数值指标写 'numeric'、分类指标写生成器里的 kind（grade/qual）。
 *    原型数据里数值指标**没有** kind 键，所以读出来只在 kind !== 'numeric' 时还原，
 *    否则 parity 断言会多出一个 kind 字段当场红。
 */

import { AGENT_PANE } from '../lib/layout.js';

const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/* node:sqlite 返回的是 null-prototype 行对象，直接拿去和 JSON.parse 的结果 deepStrictEqual 会
   因为原型不同而不相等（parity 断言踩过）。这里统一摊平成普通对象。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

function readMetrics(db, key) {
  /* 必须 ORDER BY rowid：metrics 的主键是 (profile_key, key)，直接 SELECT 会按索引
     （＝指标 key 字母序）返回，alb 排到 cea 前面，parity 断言当场红。
     表是普通 rowid 表，rowid 就是播种时的插入顺序，与 demo-data.js 的数组顺序一致。 */
  const list = rows(db, 'SELECT * FROM metrics WHERE profile_key = ? ORDER BY rowid', key);
  return list.map((m) => ({
    key: m.key,
    name: m.name,
    unit: m.unit ?? null,
    dec: m.dec ?? null,
    band: m.band_low === null && m.band_high === null ? null : [m.band_low, m.band_high],
    note: m.note ?? null,
    cat: m.cat ?? null,
    color: m.color ?? null,
    ...(m.kind && m.kind !== 'numeric' ? { kind: m.kind } : {}),
    points: rows(db, 'SELECT d, v_num, v_text, src FROM metric_points WHERE profile_key = ? AND metric_key = ? ORDER BY ord, d', key, m.key)
      .map((p) => ({ d: p.d, v: p.v_num === null ? p.v_text : p.v_num, src: p.src ?? null })),
  }));
}

function readProfile(db, key) {
  const found = db.prepare('SELECT * FROM subjects WHERE profile_key = ?').get(key);
  if (!found) return null;
  const s = { ...found };

  /* 胃癌八张业务表：行数组还原成生成器里的数组形状（不是对象）。 */
  const periopRows = rows(db, 'SELECT phase, name, window, detail, note FROM perioperative_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.phase, r.name, r.window, r.detail, r.note]);
  const resectionRows = rows(db, 'SELECT d, kind, extent, recon, institution, note FROM resection_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.kind, r.extent, r.recon, r.institution, r.note]);
  const mealRows = rows(db, 'SELECT d, slot, portion, foods, symptoms, note FROM meal_log WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.slot, r.portion, r.foods, r.symptoms, r.note]);
  const dumpingRows = rows(db, 'SELECT d, slot, onset, symptoms, severity, note FROM dumping_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.slot, r.onset, r.symptoms, r.severity, r.note]);
  const suppRows = rows(db, 'SELECT item, order_text, start, end, source FROM supplement_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.item, r.order_text, r.start, r.end, r.source]);
  const peritonealRows = rows(db, 'SELECT d, kind, detail, imaging, note FROM peritoneal_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.kind, r.detail, r.imaging, r.note]);
  const endoRows = rows(db, 'SELECT d, kind, finding, next, note FROM endoscopy_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.kind, r.finding, r.next, r.note]);
  const hpRows = rows(db, 'SELECT d, item, note FROM hp_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.d, r.item, r.note]);
  const pathRows = rows(db, "SELECT a, b FROM pathology_rows WHERE profile_key = ? AND kind = 'row' ORDER BY ord", key).map((r) => [r.a, r.b]);
  const pathGaps = rows(db, "SELECT a, b FROM pathology_rows WHERE profile_key = ? AND kind = 'gap' ORDER BY ord", key).map((r) => [r.a, r.b]);

  return {
    name: s.name,
    sex: s.sex,
    age: s.age,
    meta: s.meta,
    headline: s.headline,
    stage: s.stage,
    mindset: s.mindset,
    dash_keys: jp(s.dash_keys, []),
    path: jp(s.path, []),
    molecular: rows(db, 'SELECT k, v, src, state, note FROM molecular WHERE profile_key = ? ORDER BY ord', key),
    hp: s.hp_title ? { title: s.hp_title, rows: hpRows } : null,
    lines: rows(db, 'SELECT name, detail, done FROM treatment_lines WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => ({ name: r.name, detail: r.detail, done: !!r.done })),
    cycles: rows(db, 'SELECT name, date, drugs, status, done FROM cycles WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => [r.name, r.date, r.drugs, r.status, !!r.done]),
    perioperative: s.perioperative_title ? { title: s.perioperative_title, rows: periopRows } : null,
    resection: s.resection_title ? { title: s.resection_title, rows: resectionRows } : null,
    mealLog: mealRows,
    dumping: dumpingRows,
    supplements: suppRows,
    peritoneal: s.peritoneal_title ? { title: s.peritoneal_title, rows: peritonealRows } : null,
    endoscopy: s.endoscopy_title ? { title: s.endoscopy_title, rows: endoRows } : null,
    rhythm: rows(db, 'SELECT item, freq, guideline, next FROM rhythm WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => [r.item, r.freq, r.guideline, r.next]),
    viewpoints: rows(db, 'SELECT d, mood, text FROM viewpoints WHERE profile_key = ? ORDER BY ord', key).map((r) => [r.d, r.mood, r.text]),
    metrics: readMetrics(db, key),
    events: rows(db, 'SELECT d, label FROM events WHERE profile_key = ? ORDER BY rowid', key),
    docs: rows(db, 'SELECT id, name, date, type, status FROM documents WHERE profile_key = ? ORDER BY ord', key),
    candidates: rows(db, 'SELECT id, name, value, source, status FROM candidate_fields WHERE profile_key = ? ORDER BY ord', key),
    pathology: s.pathology_title ? { title: s.pathology_title, status: s.pathology_status, rows: pathRows, gaps: pathGaps } : null,
    activity: s.activity ?? null,
    familyTalk: s.family_talk ?? null,
  };
}

export function listSubjects(db) {
  return rows(db, 'SELECT profile_key, name, meta FROM subjects ORDER BY profile_key');
}

export function getProfile(db, key) {
  return readProfile(db, key);
}

/** `/api/bootstrap` 的 payload。version/build 由调用方注入（唯一来源 lib/version.js）。 */
export function bootstrap(db, { version, build } = {}) {
  const profiles = {};
  for (const s of listSubjects(db)) profiles[s.profile_key] = readProfile(db, s.profile_key);
  const trials = rows(db, 'SELECT nct_id FROM trials').length
    ? rows(db, 'SELECT nct_id AS id, title, phase, status, sponsor, url FROM trials ORDER BY rowid')
    : [];
  const meta = {};
  for (const r of rows(db, 'SELECT k, v FROM demo_meta')) meta[r.k] = r.v;
  return {
    version: version ?? null,
    build: build ?? null,
    profiles,
    trials,
    demo_meta: meta,
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。
       前端只读这一处，不在客户端猜第二个入口（20 号交互合同）。 */
    agent: { available: true, mode: 'dev-mount' },
    /* 面板宽度档位与业务分栏参数同源（lib/layout.js），客户端不再写第二份数字 */
    layout: { agentPane: AGENT_PANE },
  };
}
