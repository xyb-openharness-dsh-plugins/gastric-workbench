#!/usr/bin/env node
/**
 * check-patient-create.mjs — 患者建档 + 写入闭环闸门（运行时版，35 号 §2 / STARTER 模板改造）。
 *
 * 与静态模板（扫 UI/服务端/schema 源码形态）不同，本仓用**运行时**闸门：起一个真实 server
 * （临时 workspace，用完即删），把「新建患者 → 落 sqlite → 重开可见 → 私密标记 → 错误路径」
 * 整条链走一遍。静态形态检查交给 test/write-api.test.mjs 与 check-trial-* 系列，这里只验行为。
 *
 * 判据（缺一即红）：
 *   ① /api/health 的 capabilities 含 write
 *   ② POST /api/profiles 建档：profileKey 以 'u' 开头；sqlite subjects 落行且 is_demo=0；
 *      profile_facts 逐字段落库；与 demo 档案共存（demo 2 + 自建 1 = 3）
 *   ③ POST /api/profiles/{key}/{kind} 写一条 entry（kind 白名单外 → 400 可读错误）
 *   ④ 重开 Workbench（模拟 reload）：bootstrap 里可见新档案（is_demo=0）与新条目
 *   ⑤ POST /api/privacy：id 寻址改 is_private=1；id 不存在 → 400
 *   ⑥ GET /api/trials：available=true、total=快照全表数（236）、honestyNote 带「未核实」
 *
 * 用法：node scripts/check-patient-create.mjs
 * 退出码：0 通过 / 1 失败
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Workbench, DB_FILE } from '../dsh/workbench.js';
import { startWorkbenchServer } from '../dsh/server.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];
const oks = [];
const tmp = mkdtempSync(join(homedir(), '.xyb-stom-check-'));

async function api(port, method, path, body) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch { /* 非 JSON 也算失败路径 */ }
  return { status: r.status, body: j };
}

let wb = null, wb2 = null, server = null;
try {
  wb = await Workbench.open(tmp);
  ({ server } = await startWorkbenchServer({ port: 0, workbench: wb }));
  const port = server.address().port;

  /* ① health 带 write 能力 */
  const health = await api(port, 'GET', '/api/health');
  if (health.status === 200 && (health.body.capabilities || []).includes('write')) {
    oks.push('① /api/health capabilities 含 write');
  } else problems.push(`① /api/health 未自证 write：${JSON.stringify(health.body)}`);

  /* ② 建档 → sqlite 落行 is_demo=0 + 事实表 + 与 demo 共存 */
  const created = await api(port, 'POST', '/api/profiles', {
    name: '验收患者', tag: '胃窦腺癌 · 术后辅助化疗中',
    facts: { '确诊经过': '2026-02 胃镜活检确诊，病理报告已归档', '': '空值字段应被跳过' },
  });
  if (created.status !== 200 || !created.body.profileKey || !String(created.body.profileKey).startsWith('u')) {
    throw new Error('POST /api/profiles 未返回 u 前缀 profileKey：' + JSON.stringify(created.body));
  }
  const key = created.body.profileKey;
  const ro = new DatabaseSync(join(tmp, DB_FILE), { readOnly: true });
  const subject = ro.prepare('SELECT profile_key, name, is_demo, created_on FROM subjects WHERE profile_key = ?').get(key);
  if (subject && subject.is_demo === 0 && subject.name === '验收患者') oks.push(`② sqlite subjects 落行 is_demo=0（${key}，created_on=${subject.created_on}）`);
  else problems.push(`② subjects 落行异常：${JSON.stringify(subject)}`);
  const factCount = ro.prepare('SELECT COUNT(*) AS n FROM profile_facts WHERE profile_key = ?').get(key).n;
  if (factCount === 1) oks.push('② profile_facts 逐字段落库（空值跳过：1 条）');
  else problems.push(`② profile_facts 应为 1 条（空值跳过），实际 ${factCount}`);
  const allSubjects = ro.prepare('SELECT COUNT(*) AS n FROM subjects').get().n;
  if (allSubjects === 3) oks.push('② demo（2）与自建（1）共存 = 3');
  else problems.push(`② subjects 总数应为 3，实际 ${allSubjects}`);

  /* ③ 写一条 entry；kind 白名单外 → 400 */
  const entry = await api(port, 'POST', `/api/profiles/${key}/question`, { q: '下次复评要不要加营养门诊？', source: '验收' });
  if (entry.status === 200 && entry.body.ok && /^user-\d{4}$/.test(entry.body.id)) oks.push(`③ addEntry 返回合成 id ${entry.body.id}`);
  else problems.push(`③ addEntry 异常：${JSON.stringify(entry.body)}`);
  /* kind 白名单在路由正则与 addEntry 各判一遍：路由级 404、服务级 400 都算拒收 */
  const badKind = await api(port, 'POST', `/api/profiles/${key}/nope`, { q: 'x' });
  if (badKind.status === 404 || (badKind.status === 400 && /未知记录类型/.test(badKind.body.message || ''))) oks.push(`③ kind 白名单外被拒收（HTTP ${badKind.status}）`);
  else problems.push(`③ 非法 kind 应 400/404：${JSON.stringify(badKind.body)}`);
  const badProfile = await api(port, 'POST', `/api/profiles/ghost/question`, { q: 'x' });
  if (badProfile.status === 400) oks.push('③ 档案不存在返回 400');
  else problems.push(`③ 不存在档案应 400：${badProfile.status}`);

  /* ④ 另开一个 Workbench 连接（模拟 reload；server 手里那个连接保持打开供 ⑤/⑥ 用） */
  wb2 = await Workbench.open(tmp);
  const b = wb2.bootstrap();
  const subj = (b.subjects || []).find((s) => s.profile_key === key);
  const ent = (b.entries || []).find((e) => e.id === entry.body.id);
  if (subj && subj.is_demo === false && b.profiles[key]) oks.push('④ reload 后 bootstrap 可见新档案（is_demo=false）');
  else problems.push(`④ reload 后 bootstrap 缺新档案：${JSON.stringify(subj)}`);
  if (ent && ent.kind === 'question' && String(ent.data).includes('营养门诊') && ent.is_private === false) oks.push('④ reload 后 bootstrap 可见新条目（question，data 同形回读）');
  else problems.push(`④ reload 后 bootstrap 缺条目：${JSON.stringify(ent)}`);

  /* ⑤ 私密切换：id 寻址 + 不存在的 id 报错 */
  const priv = await api(port, 'POST', '/api/privacy', { profileKey: key, kind: 'question', id: entry.body.id, private: true });
  if (priv.status === 200 && priv.body.ok && priv.body.private === true) oks.push('⑤ /api/privacy 按 id 更新 is_private=true');
  else problems.push(`⑤ privacy 异常：${JSON.stringify(priv.body)}`);
  const privBad = await api(port, 'POST', '/api/privacy', { profileKey: key, kind: 'question', id: 'user-9999', private: false });
  if (privBad.status === 400 && /找不到/.test(privBad.body.message || '')) oks.push('⑤ id 不存在返回 400 可读错误');
  else problems.push(`⑤ 不存在的 id 应 400：${JSON.stringify(privBad.body)}`);
  const after = new DatabaseSync(join(tmp, DB_FILE), { readOnly: true }).prepare('SELECT is_private FROM user_entries WHERE id = ?').get(entry.body.id);
  if (after && after.is_private === 1) oks.push('⑤ sqlite 里 is_private 已落 1');
  else problems.push(`⑤ sqlite is_private 未落库：${JSON.stringify(after)}`);

  /* ⑥ /api/trials 透传快照 */
  const trials = await api(port, 'GET', '/api/trials?keyword=');
  if (trials.status === 200 && trials.body.available && trials.body.total === 236 && /未核实/.test(trials.body.honestyNote)) {
    oks.push(`⑥ /api/trials：total=236（快照全表数），honestyNote 带「未核实」`);
  } else problems.push(`⑥ /api/trials 异常：${JSON.stringify(trials.body).slice(0, 200)}`);
} catch (e) {
  problems.push('运行失败：' + (e && e.message ? e.message : String(e)));
} finally {
  try { server && server.close(); } catch { /* 忽略 */ }
  try { wb && wb.close(); } catch { /* 忽略 */ }
  try { wb2 && wb2.close(); } catch { /* 忽略 */ }
  setTimeout(() => {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响判定 */ }
    for (const o of oks) console.log(`✓ ${o}`);
    if (problems.length) {
      console.error(`\n✗ 患者建档闸门未通过（${problems.length} 项）：`);
      for (const p of problems) console.error('  - ' + p);
      process.exit(1);
    }
    console.log(`\n✓ 患者建档 + 写入闭环闸门通过（${oks.length} 项；临时 workspace 已清理）`);
  }, 50);
}
