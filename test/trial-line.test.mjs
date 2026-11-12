/* 35 号试验线断言（胃癌 0.1.4）：快照透传诚实形状 + 匹配纯函数红线。
 * 对照食管癌 0.1.4 同构移植；快照口径以本仓 research/gastric-cancer 真实字段为准
 * （registry_id / trial_records，manifest.total_records = 236）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('trial-match 纯函数（new Function 加载）：相关给分 / 不相关硬性✕低分 / 可对照<2 无百分数 / 签名不收靶点', () => {
  const src = readFileSync(join(ROOT, 'prototypes/v0.2/trial-match.js'), 'utf8');
  const window = {};
  new Function('window', src)(window);
  const M = window.StomTrialMatch;
  assert.ok(M, 'StomTrialMatch 未挂载');
  const good = M.items({ title: 'Gastric adenocarcinoma immunotherapy study', studyType: 'INTERVENTIONAL' }, { type: 'interventional' });
  const g = M.score(good);
  assert.equal(g.ok, 2); assert.equal(g.m, 2); assert.equal(g.pct, 100);
  const bad = M.items({ title: 'Diabetes bioequivalence study', studyType: 'INTERVENTIONAL' }, { type: 'interventional' });
  const b = M.score(bad);
  /* 不相关 = 硬性✕ 但类型可对照：诚实低分（严格低于相关项），且 ✕ 排前 */
  assert.ok(b.pct < g.pct, '不相关登记分数必须低于相关登记（b=' + b.pct + ' g=' + g.pct + '）');
  assert.equal(b.ok, 1, '不相关只有研究类型 1 项对得上');
  assert.equal(M.sorted(bad)[0].state, '✕');
  const few = M.score(M.items({ title: 'x', studyType: '' }, { type: 'all' }));
  assert.equal(few.pct, null); assert.ok(few.reason.includes('不足 2 条'));
  /* 靶点不进分母：函数签名只有 (facts, prefs)，facts 只读 title/studyType（结构断言） */
  assert.equal(M.items.length, 2);
});

test('Workbench.trialMatch：透传真实快照（236 条）且带诚实口径，不做符合度判读', async () => {
  const { Workbench } = await import(join(ROOT, 'dsh/workbench.js'));
  const { mkdtempSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const root = mkdtempSync(join(homedir(), '.xyb-stom-trial-'));
  const wb = await Workbench.open(root);
  const r = wb.trialMatch('');
  assert.equal(r.available, true, '快照应随包可用（research/gastric-cancer）');
  assert.equal(r.total, 236, 'total 必须是快照全表计数（236），不是过滤后条数');
  assert.ok(r.honestyNote.includes('未核实'), '透传必须带「登记状态未核实」口径');
  assert.ok(r.honestyNote.includes('需人工核对'), '透传必须带「需人工核对」口径');
  assert.ok(r.honestyNote.includes('快照会过期'), '透传必须带「快照会过期」口径');
  assert.ok(Array.isArray(r.rows) && r.rows.length > 0, '无关键词也应返回前 50 条登记摘录');
  for (const rec of r.rows.slice(0, 5)) {
    assert.equal(rec.studyType, 'INTERVENTIONAL', '登记字段透传（study_type 原样）');
    assert.ok(/^NCT\d+$/.test(rec.id), 'registry_id 原样透传');
    assert.ok(rec.sourceUrl, '登记页链接透传');
  }
  const kw = wb.trialMatch('gastric');
  assert.ok(Array.isArray(kw.rows), '关键词过滤返回数组（可能为空，不做判读）');
  assert.equal(kw.total, 236, 'total 仍是全表计数');
  wb.close();
});

test('快照对账口径：manifest.total_records = jsonl 行数 = sqlite trial_records 行数 = 236', async () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'research/gastric-cancer/manifest.json'), 'utf8'));
  const jsonl = readFileSync(join(ROOT, 'research/gastric-cancer/trials-2026.jsonl'), 'utf8');
  const lines = jsonl.split(/\r?\n/).filter((l) => l.trim()).length;
  assert.equal(manifest.total_records, 236);
  assert.equal(lines, 236);
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(ROOT, 'research/gastric-cancer/gastric_cancer_trials_2026.sqlite'), { readOnly: true });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM trial_records').get().n, 236);
  db.close();
});
