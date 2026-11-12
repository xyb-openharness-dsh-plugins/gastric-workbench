/* 工作台实例：把「工作区目录 → 库 → 读模型」串起来。
 *
 * 与 DSH 插件入口（dsh/index.js）分开的原因：入口必须 import 宿主给的 peer 依赖
 * （Schemastery），本仓库装不上，一 import 就炸。所以可单测的那一层放这里，
 * `npm start -- --workspace <目录>` 与将来的宿主 apply() 用的是同一个类。
 *
 * 规则（与乳腺癌工作台一致）：
 * - 资料目录由用户选定，不猜、不静默创建；
 * - 打开即 migrate，只补未执行的迁移；
 * - 库里没有档案时才播种演示数据，之后每次启动都沿用用户自己的资料。 */

import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { close, migrate, openDatabase } from './store.js';
import { hasDemoData, seedDemo } from './demo.js';
import { bootstrap, getProfile, listSubjects } from './readmodels.js';
import { workspaceProblems } from './server.js';
import { version, build, displayVersion } from '../lib/version.js';

export const DB_FILE = 'xyb-gastric.sqlite';

/** 写入闭环（0003）：用户可记的八类条目。kind 白名单在这里定一次，服务层路由正则与
 *  前端都从它取，不许各写一份。 */
export const KINDS = ['bleed', 'lab', 'treatment', 'question', 'hospital', 'report', 'doc', 'mind'];

/** 校验资料目录：返回问题数组（空数组＝可用）。不抛错，方便 UI 一次性列出所有问题。 */
export function validateWorkspacePath(p) {
  return workspaceProblems(p);
}

/* ---------------- 写入 API（库层函数：Workbench 与宿主 openDataSource 共用同一份） ---------------- */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 新建档案（真实用户数据；与演示档案同表共存，is_demo=0）。
 *  profile_key 用 'u'+日期+序号 前缀，与演示档案（A/B）一眼可辨。 */
export function createProfile(db, { name, tag, facts = {} } = {}) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('createProfile 需要一个已打开的数据库');
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('档案名称为必填项');
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  let seq = Number(db.prepare('SELECT COUNT(*) AS c FROM subjects WHERE profile_key LIKE ?').get(`u${ymd}-%`).c) + 1;
  let key = `u${ymd}-${String(seq).padStart(3, '0')}`;
  while (db.prepare('SELECT COUNT(*) AS c FROM subjects WHERE profile_key = ?').get(key).c) {
    seq += 1;
    key = `u${ymd}-${String(seq).padStart(3, '0')}`;
  }
  db.prepare('INSERT INTO subjects (profile_key, name, meta, is_demo, created_on) VALUES (?,?,?,0,?)')
    .run(key, trimmed.slice(0, 24), tag ? String(tag).trim().slice(0, 40) : null, today());
  const factIns = db.prepare('INSERT INTO profile_facts (profile_key, fact_key, fact_value, fact_order) VALUES (?,?,?,?)');
  let ord = 0;
  for (const [k, v] of Object.entries(facts || {})) {
    if (!String(k).trim() || v == null || String(v).trim() === '') continue;   // 空键 / 空值都跳过，不留空事实
    factIns.run(key, String(k).slice(0, 40), String(v).slice(0, 500), ord);
    ord += 1;
  }
  return { ok: true, profileKey: key, name: trimmed.slice(0, 24) };
}

/** 新增一条用户自记条目（写通 sqlite；data 整体按 JSON 落库，读侧按 kind 解析）。
 *  id 统一合成 'user-' + 4 位补零序号（全表单调递增，前端拿它做私密寻址）。 */
export function addEntry(db, profileKey, kind, data = {}) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('addEntry 需要一个已打开的数据库');
  if (!KINDS.includes(kind)) throw new Error(`未知记录类型：${kind}（可用：${KINDS.join('/')}）`);
  const exists = db.prepare('SELECT COUNT(*) AS c FROM subjects WHERE profile_key = ?').get(profileKey).c;
  if (!exists) throw new Error('档案不存在：' + profileKey);
  let max = 0;
  for (const r of db.prepare("SELECT id FROM user_entries WHERE id LIKE 'user-%'").all()) {
    const m = /^user-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const id = 'user-' + String(max + 1).padStart(4, '0');
  db.prepare('INSERT INTO user_entries (id, profile_key, kind, data, is_private, created_on) VALUES (?,?,?,?,?,?)')
    .run(id, profileKey, kind, JSON.stringify(data ?? {}), data && data.private ? 1 : 0, today());
  return { ok: true, kind, profileKey, id };
}

/** 私密切换：按 id 更新 user_entries.is_private；id 不存在要报错，不能静默。 */
export function setPrivacy(db, profileKey, kind, id, isPrivate) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('setPrivacy 需要一个已打开的数据库');
  if (!KINDS.includes(kind)) throw new Error(`未知记录类型：${kind}（可用：${KINDS.join('/')}）`);
  const info = db.prepare('UPDATE user_entries SET is_private = ? WHERE profile_key = ? AND kind = ? AND id = ?')
    .run(isPrivate ? 1 : 0, profileKey, kind, id);
  if (!info.changes) throw new Error(`找不到要改隐私标记的记录：${kind} ${id}`);
  return { ok: true, kind, profileKey, id, private: Boolean(isPrivate) };
}

/** 列出全部档案（含自建的；is_demo 标记随行，导出 / 统计 / 切档都靠它区分）。 */
export function listProfiles(db) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('listProfiles 需要一个已打开的数据库');
  return db.prepare('SELECT profile_key, name, meta, is_demo, created_on FROM subjects ORDER BY rowid')
    .all().map((r) => ({ ...r, is_demo: !!r.is_demo }));
}

/* ---------------- 临床试验检索（research/ 快照，登记状态未核实） ---------------- */

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = 'gastric_cancer_trials_2026.sqlite';

/**
 * 关键词检索（只做 LIKE 过滤 + 登记字段透传，不做符合度判读）。
 * 双形态查找：包内 research/（开发布局）→ root 旁路；都找不到时如实返回不可用，
 * rows=[] + 口径说明「快照未就绪」，不崩、不写零结果。
 */
export function trialMatch(keyword, { root } = {}) {
  const candidates = [
    join(HERE, '..', 'research', 'gastric-cancer', SNAPSHOT_FILE),
    root ? join(root, '..', 'research', 'gastric-cancer', SNAPSHOT_FILE) : null,
  ].filter(Boolean);
  let dbPath = null;
  for (const c of candidates) if (existsSync(c)) { dbPath = c; break; }
  if (!dbPath) {
    return { available: false, total: 0, rows: [],
      honestyNote: '快照未就绪：research/gastric-cancer 未随包发出或未采集，条目无法结构化，需人工核对；登记状态未核实，快照会过期，以官方登记页为准' };
  }
  const rdb = new DatabaseSync(dbPath, { readOnly: true });
  const kw = String(keyword || '').trim();
  const rows = kw
    ? rdb.prepare("SELECT * FROM trial_records WHERE title LIKE ? OR official_title LIKE ? OR conditions LIKE ? OR interventions LIKE ? ORDER BY id LIMIT 50")
        .all(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`)
    : rdb.prepare('SELECT * FROM trial_records ORDER BY id LIMIT 50').all();
  const totalAll = rdb.prepare('SELECT COUNT(*) AS n FROM trial_records').get().n;
  const out = rows.map((r) => ({
    id: r.registry_id, title: r.title, officialTitle: r.official_title,
    studyType: r.study_type, status: r.overall_status, phases: r.phases,
    sponsor: r.lead_sponsor, countries: r.countries, sourceUrl: r.source_url,
    snapshotDate: r.fetched_at,
  }));
  rdb.close();
  /* 诚实口径（35 号）：本通道只做关键词过滤与登记字段透传，不做符合度判读；
     条目无法结构化，需人工核对；登记状态未核实，快照会过期。 */
  return { available: true, total: totalAll, rows: out,
    honestyNote: '条目无法结构化，需人工核对；登记状态未核实，快照会过期，以官方登记页为准' };
}

export class Workbench {
  #db = null;
  #workspace = null;

  /** 打开（必要时创建）工作区里的库。workspace 必须已经通过 validateWorkspacePath。 */
  static async open(workspace) {
    const problems = validateWorkspacePath(workspace);
    if (problems.length) throw new Error(problems.join('；'));

    let dir = workspace;
    if (!existsSync(dir)) {
      try { mkdirSync(dir, { recursive: true }); } catch (error) {
        throw new Error(`建不了资料目录 ${dir}：${error.message}`);
      }
    }

    const wb = new Workbench();
    wb.#workspace = dir;
    wb.#db = openDatabase(join(dir, DB_FILE));
    try {
      migrate(wb.#db);
      if (!hasDemoData(wb.#db)) seedDemo(wb.#db);
    } catch (error) {
      try { close(wb.#db); } catch { /* 关不掉也要把原始错误抛出去 */ }
      throw error;
    }
    return wb;
  }

  get version() { return version; }
  get displayVersion() { return displayVersion; }
  get build() { return build; }
  get workspace() { return this.#workspace; }
  get db() { return this.#db; }

  bootstrap() { return bootstrap(this.#db, { version, build }); }
  listSubjects() { return listSubjects(this.#db); }
  getProfile(key) { return getProfile(this.#db, key); }

  /* ---------------- 写入 API（0.1.4：demo + 自建共存，八类条目写通 sqlite） ---------------- */

  get kinds() { return KINDS; }
  createProfile(input) { return createProfile(this.#db, input); }
  addEntry(profileKey, kind, data) { return addEntry(this.#db, profileKey, kind, data); }
  setPrivacy(profileKey, kind, id, isPrivate) { return setPrivacy(this.#db, profileKey, kind, id, isPrivate); }
  listProfiles() { return listProfiles(this.#db); }
  trialMatch(keyword) { return trialMatch(keyword, { root: this.#workspace }); }

  close() {
    if (this.#db) { close(this.#db); this.#db = null; }
  }
}
