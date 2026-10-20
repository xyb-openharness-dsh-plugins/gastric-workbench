/* 演示数据播种（胃癌）。
 *
 * 唯一数据源是 `demo/build-demo-data.mjs` 的 `buildDemoProfiles()`（两个产物 prototypes/v0.2/demo-data.js
 * 与 demo/demo-data.sqlite 也从它生成）。这里只是把同一份纯数据写进**用户资料目录里那个库**，
 * 不新增、不改写任何数值——演示数据一旦在这里多出一条，原型与开发版就会各说一套。
 *
 * 幂等：库里已经有 subjects 就整批跳过（开发版启动时可能跑很多次，不能每次都复制一份档案）。
 * 事务：整批在一个事务里，中途失败整体回滚，不留"半个档案"。
 *
 * 与肠癌 seedDemo 的差异只在不同业务表：lynch / resect_rows / stoma / lars / nutrition_notes
 * 换成 gastric 的 perioperative_rows / resection_rows / meal_log / dumping_rows /
 * supplement_rows / peritoneal_rows / endoscopy_rows / hp_rows（schema/0001_initial.sql）。 */

import { buildDemoProfiles } from '../demo/build-demo-data.mjs';

const j = (v) => (v === undefined ? null : JSON.stringify(v));

/** 把 buildDemoProfiles() 的数据写进库。返回写入计数（便于启动日志与测试）。 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const data = input || buildDemoProfiles();

  const already = db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n;
  if (already > 0) return { skipped: true, subjects: 0, metrics: 0, points: 0, trials: 0 };

  const counts = { skipped: false, subjects: 0, metrics: 0, points: 0, trials: 0 };

  db.exec('BEGIN');
  try {
    /* 列名顺序与 schema/0001_initial.sql 一致；按位置写会因为列数不匹配直接报错（这是想要的）。 */
    const insSubject = db.prepare(`INSERT INTO subjects
      (profile_key, name, sex, age, meta, headline, stage, mindset, dash_keys, path,
       activity, family_talk, hp_title, resection_title, perioperative_title, peritoneal_title,
       endoscopy_title, pathology_title, pathology_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insMetric = db.prepare(`INSERT INTO metrics (profile_key, key, name, unit, cat, color, dec, kind, band_low, band_high, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insPoint = db.prepare('INSERT INTO metric_points (profile_key, metric_key, d, v_num, v_text, src, ord) VALUES (?,?,?,?,?,?,?)');
    const insMolecular = db.prepare('INSERT INTO molecular (profile_key, k, v, src, state, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insEvent = db.prepare('INSERT INTO events (profile_key, d, label) VALUES (?,?,?)');
    const insRhythm = db.prepare('INSERT INTO rhythm (profile_key, item, freq, guideline, next, ord) VALUES (?,?,?,?,?,?)');
    const insCycle = db.prepare('INSERT INTO cycles (profile_key, name, date, drugs, status, done, ord) VALUES (?,?,?,?,?,?,?)');
    const insLine = db.prepare('INSERT INTO treatment_lines (profile_key, name, detail, done, ord) VALUES (?,?,?,?,?)');
    const insPeriop = db.prepare('INSERT INTO perioperative_rows (profile_key, phase, name, window, detail, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insResection = db.prepare('INSERT INTO resection_rows (profile_key, d, kind, extent, recon, institution, note, ord) VALUES (?,?,?,?,?,?,?,?)');
    const insMeal = db.prepare('INSERT INTO meal_log (profile_key, d, slot, portion, foods, symptoms, note, ord) VALUES (?,?,?,?,?,?,?,?)');
    const insDumping = db.prepare('INSERT INTO dumping_rows (profile_key, d, slot, onset, symptoms, severity, note, ord) VALUES (?,?,?,?,?,?,?,?)');
    const insSupp = db.prepare('INSERT INTO supplement_rows (profile_key, item, order_text, start, end, source, ord) VALUES (?,?,?,?,?,?,?)');
    const insPeritoneal = db.prepare('INSERT INTO peritoneal_rows (profile_key, d, kind, detail, imaging, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insEndo = db.prepare('INSERT INTO endoscopy_rows (profile_key, d, kind, finding, next, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insHp = db.prepare('INSERT INTO hp_rows (profile_key, d, item, note, ord) VALUES (?,?,?,?,?)');
    const insView = db.prepare('INSERT INTO viewpoints (profile_key, d, mood, text, ord) VALUES (?,?,?,?,?)');
    const insTrial = db.prepare('INSERT OR IGNORE INTO trials (nct_id, title, phase, status, sponsor, url) VALUES (?,?,?,?,?,?)');
    const insDoc = db.prepare('INSERT INTO documents (profile_key, id, name, date, type, status, ord) VALUES (?,?,?,?,?,?,?)');
    const insCand = db.prepare('INSERT INTO candidate_fields (profile_key, id, name, value, source, status, ord) VALUES (?,?,?,?,?,?,?)');
    const insPath = db.prepare('INSERT INTO pathology_rows (profile_key, kind, a, b, ord) VALUES (?,?,?,?,?)');
    const insMeta = db.prepare('INSERT OR IGNORE INTO demo_meta (k, v) VALUES (?,?)');

    for (const [key, p] of Object.entries(data.profiles)) {
      insSubject.run(key, p.name, p.sex, p.age, p.meta, p.headline, p.stage, p.mindset,
        j(p.dash_keys), j(p.path), p.activity ?? null, p.familyTalk ?? null,
        p.hp ? p.hp.title : null,
        p.resection ? p.resection.title : null,
        p.perioperative ? p.perioperative.title : null,
        p.peritoneal ? p.peritoneal.title : null,
        p.endoscopy ? p.endoscopy.title : null,
        p.pathology.title, p.pathology.status);
      counts.subjects++;

      for (const [i, m] of p.metrics.entries()) {
        insMetric.run(key, m.key, m.name, m.unit ?? null, m.cat ?? null, m.color ?? null,
          m.dec ?? null, m.dec === null ? (m.kind || 'qual') : 'numeric',
          m.band ? m.band[0] : null, m.band ? m.band[1] : null, m.note ?? null);
        counts.metrics++;
        for (const [pi, pt] of (m.points || []).entries()) {
          const num = typeof pt.v === 'number' ? pt.v : null;
          const txt = typeof pt.v === 'number' ? null : (pt.v === undefined ? null : String(pt.v));
          insPoint.run(key, m.key, pt.d, num, txt, pt.src ?? null, pi);
          counts.points++;
        }
      }

      (p.molecular || []).forEach((r, i) => insMolecular.run(key, r.k, r.v, r.src, r.state, r.note ?? null, i));
      (p.events || []).forEach((e) => insEvent.run(key, e.d, e.label));
      (p.rhythm || []).forEach((r, i) => insRhythm.run(key, r[0], r[1], r[2], r[3], i));
      (p.cycles || []).forEach((c, i) => insCycle.run(key, c[0], c[1], c[2], c[3], c[4] ? 1 : 0, i));
      (p.lines || []).forEach((l, i) => insLine.run(key, l.name, l.detail, l.done ? 1 : 0, i));
      if (p.perioperative) p.perioperative.rows.forEach((r, i) => insPeriop.run(key, r[0], r[1], r[2], r[3], r[4], i));
      if (p.resection) p.resection.rows.forEach((r, i) => insResection.run(key, r[0], r[1], r[2], r[3], r[4], r[5], i));
      (p.mealLog || []).forEach((r, i) => insMeal.run(key, r[0], r[1], r[2], r[3], r[4], r[5], i));
      (p.dumping || []).forEach((r, i) => insDumping.run(key, r[0], r[1], r[2], r[3], r[4], r[5], i));
      (p.supplements || []).forEach((r, i) => insSupp.run(key, r[0], r[1], r[2], r[3], r[4], i));
      if (p.peritoneal) p.peritoneal.rows.forEach((r, i) => insPeritoneal.run(key, r[0], r[1], r[2], r[3], r[4], i));
      if (p.endoscopy) p.endoscopy.rows.forEach((r, i) => insEndo.run(key, r[0], r[1], r[2], r[3], r[4], i));
      if (p.hp) p.hp.rows.forEach((r, i) => insHp.run(key, r[0], r[1], r[2], i));
      (p.viewpoints || []).forEach((v, i) => insView.run(key, v[0], v[1], v[2], i));
      (p.docs || []).forEach((d, i) => insDoc.run(key, d.id, d.name, d.date, d.type, d.status, i));
      (p.candidates || []).forEach((c, i) => insCand.run(key, c.id, c.name, c.value, c.source, c.status, i));
      if (p.pathology) {
        (p.pathology.rows || []).forEach((r, i) => insPath.run(key, 'row', r[0], r[1], i));
        (p.pathology.gaps || []).forEach((r, i) => insPath.run(key, 'gap', r[0], r[1], i));
      }
    }

    for (const t of data.trials || []) {
      const r = insTrial.run(t.id, t.title, t.phase, t.status, t.sponsor, t.url);
      if (r && r.changes) counts.trials++;
    }
    for (const [k, v] of data.meta || []) insMeta.run(k, v);

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n > 0;
  } catch {
    return false;
  }
}
