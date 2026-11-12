/* 数据层：迁移幂等 / 播种幂等 / 与 demo-data.js 的 parity / 读模型形状。
 *
 * parity 是这一层最重要的断言：开发版 `/api/bootstrap` 的 profiles 必须与定稿原型
 * prototypes/v0.2/demo-data.js 逐字段一致，否则前端是照着原型写死的形状渲染的，
 * 差一个字段就是"某个卡片空白"这种很难定位的 bug。 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo, hasDemoData } from '../dsh/demo.js';
import { bootstrap, listSubjects, getProfile } from '../dsh/readmodels.js';

const ROOT = new URL('..', import.meta.url).pathname;
const demoSrc = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
const DEMO = JSON.parse(demoSrc.slice(demoSrc.indexOf('=') + 1).replace(/;\s*$/, ''));

const tmp = mkdtempSync(join(homedir(), '.xyb-gastric-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① migrate 幂等：第二次执行不重跑已应用的迁移', () => {
  const db = openDatabase(':memory:');
  const first = migrate(db);
  const second = migrate(db);
  assert.equal(first.executed.length, 2, '首次应执行 0001_initial.sql + 0003_write_loop.sql');
  assert.deepEqual(second.executed, [], '第二次不应重跑');
  assert.equal(second.applied.length, 2);
  close(db);
});

test('② seedDemo 幂等：调两次只写一份档案', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const a = seedDemo(db);
  const b = seedDemo(db);
  assert.equal(a.skipped, false);
  assert.equal(a.subjects, 2);
  assert.equal(b.skipped, true, '第二次应整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n, 2);
  close(db);
});

test('③ parity：库里读出的 profiles 与 demo-data.js 逐字段一致', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const payload = bootstrap(db, { version: '0.1.0', build: 'test' });
  for (const key of ['A', 'B']) {
    assert.deepStrictEqual(payload.profiles[key], DEMO.profiles[key], `profiles.${key} 与 demo-data.js 不一致`);
  }
  assert.equal(payload.trials.length, DEMO.trials.length);
  assert.deepStrictEqual(payload.trials, DEMO.trials);
  assert.equal(payload.version, '0.1.0');
  close(db);
});

test('④ 读模型形状：指标点按 ord 排序、数值是数字、分类值是原文', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'A');
  const cea = p.metrics.find((m) => m.key === 'cea');
  assert.ok(cea.points.length >= 4);
  assert.equal(typeof cea.points[0].v, 'number', '数值指标读出来必须是数字');
  const ceaDates = cea.points.map((pt) => pt.d);
  assert.deepEqual(ceaDates, [...ceaDates].sort(), '指标点必须按采样日期升序');
  /* 需求：演示数据要覆盖 6 个月（见 docs/DEV-REQUIREMENTS-2026-10-20.md 第 2 条） */
  const spanDays = (new Date(ceaDates.at(-1)) - new Date(ceaDates[0])) / 86400000;
  assert.ok(spanDays >= 150, `CEA 序列应覆盖 >=150 天（6 个月演示窗口），实际 ${Math.round(spanDays)} 天`);
  const neuro = p.metrics.find((m) => m.key === 'neuro' || m.kind === 'grade');
  if (neuro) assert.equal(typeof neuro.points[0].v, 'string', '分类指标读出来是原文本');
  assert.ok(p.docs.length >= 1 && p.candidates.length >= 1, '病情整理用的 docs/candidates 要带出来');
  assert.ok(p.pathology && p.pathology.rows.length >= 1, '病理档案要带出来');
  assert.deepEqual(listSubjects(db).map((s) => s.profile_key), ['A', 'B']);
  close(db);
});

test('⑤ 文件库：真实落盘 + 重开后资料仍在（播种只发生一次）', () => {
  // sqlite 不会替你建父目录：目录得先存在（真实启动流程里由 Workbench.open 负责）
  mkdirSync(join(tmp, 'nested'), { recursive: true });
  const file = join(tmp, 'nested', 'xyb-gastric.sqlite');
  const db1 = openDatabase(file);
  migrate(db1);
  seedDemo(db1);
  close(db1);
  const db2 = openDatabase(file);
  migrate(db2);
  assert.equal(hasDemoData(db2), true, '重开后档案还在');
  assert.equal(seedDemo(db2).skipped, true, '重开后不应再播种一遍');
  close(db2);
});
