/* 写入 API 断言（0.1.4，对照食管癌 0.1.4 同构移植，按本仓数据模型适配）：
 * ① 共存：demo（A/B，is_demo=1）+ 自建（is_demo=0）= 3
 * ② 八类写库与同形回读：addEntry 八个 kind 全部写通 user_entries，reload 后 bootstrap
 *    里 data 与写入的 JSON 同形（胃癌把八类统一落 user_entries，不拆八张表）
 * ③ 私密：合成 id 寻址切换 + 不存在的 id 报错（胃癌的 mind 类记录同样在 user_entries，
 *    统一 id 寻址）
 * ④ 错误路径可读：空名称 / 未知 kind / 不存在档案 / 非法 JSON body，都返回带人话的错误
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { Workbench, KINDS } from '../dsh/workbench.js';

const ROOT = new URL('..', import.meta.url).pathname;
const tmp = mkdtempSync(join(homedir(), '.xyb-stom-write-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① listProfiles：demo（is_demo=1）与自建（is_demo=0）共存，createProfile 返回 u 前缀 key', async () => {
  const wb = await Workbench.open(tmp);
  const before = wb.listProfiles();
  assert.equal(before.length, 2);
  assert.ok(before.every((p) => p.is_demo === true), '播种档案都应是演示档案');
  const r = wb.createProfile({ name: '写入测试', tag: '胃窦腺癌', facts: { '确诊经过': '2026-02 胃镜活检确诊', '空': '' } });
  assert.ok(r.ok && r.profileKey.startsWith('u'), '自建档案 key 用 u 前缀：' + r.profileKey);
  const afterRows = wb.listProfiles();
  assert.equal(afterRows.length, 3, 'demo 2 + 自建 1 = 3');
  const mine = afterRows.find((p) => p.profileKey === r.profileKey || p.profile_key === r.profileKey);
  assert.ok(mine, 'listProfiles 含自建档案');
  assert.equal(mine.is_demo, false, '自建档案 is_demo=false');
  assert.equal(mine.name, '写入测试');
  /* node:sqlite 行对象是 null 原型，deepStrictEqual 前先摊平（readmodels.js 同款坑） */
  const facts = JSON.parse(JSON.stringify(wb.db.prepare('SELECT fact_key, fact_value FROM profile_facts WHERE profile_key = ? ORDER BY fact_order').all(r.profileKey)));
  assert.deepEqual(facts, [{ fact_key: '确诊经过', fact_value: '2026-02 胃镜活检确诊' }], '空值事实跳过，逐字段落库');
  wb.close();
});

test('② addEntry 八类写库，reload 后 bootstrap 同形回读（id 可寻址）', async () => {
  const wb = await Workbench.open(tmp);
  const key = wb.listProfiles().find((p) => !p.is_demo).profile_key;
  const samples = {
    bleed: { start: '2026-11-01', end: '2026-11-02', trigger: '进食后', note: '少量出血' },
    lab: { date: '2026-11-05', metric: '白蛋白', value: '33', unit: 'g/L' },
    treatment: { date: '2026-11-06', name: '辅助 SOX 第 4 周期', kind: '按周期' },
    question: { q: '辅助化疗结束后胃镜间隔多久？', source: '验收' },
    hospital: { name: '省肿瘤医院', dept: '胃肠外科' },
    report: { title: '胸腹盆 CT 复查', date: '2026-11-08', kind: '影像' },
    doc: { name: '出院小结（拍照导入）', type: '其他' },
    mind: { text: '这周每餐能吃小半碗了', mindKind: 'feel' },
  };
  assert.deepEqual([...KINDS].sort(), Object.keys(samples).sort(), 'KINDS 白名单 = 八类');
  const ids = {};
  for (const kind of KINDS) {
    const r = wb.addEntry(key, kind, samples[kind]);
    assert.ok(r.ok, kind + ' 应写成功');
    assert.match(r.id, /^user-\d{4}$/, 'id 统一 user- + 补零序号');
    ids[kind] = r.id;
  }
  wb.close();
  const wb2 = await Workbench.open(tmp);
  const b = wb2.bootstrap();
  for (const kind of KINDS) {
    const row = (b.entries || []).find((e) => e.id === ids[kind]);
    assert.ok(row, kind + ' reload 后 bootstrap 可见');
    assert.equal(row.profile_key, key);
    assert.equal(row.kind, kind);
    assert.deepEqual(JSON.parse(row.data), samples[kind], kind + ' data 同形回读');
    assert.equal(row.is_private, false, '默认不私密');
  }
  wb2.close();
});

test('③ setPrivacy：合成 id 寻址切换 + 不存在的 id 报错（不改写其它行）', async () => {
  const wb = await Workbench.open(tmp);
  const key = wb.listProfiles().find((p) => !p.is_demo).profile_key;
  /* 寻址三元组是 (profile_key, kind, id)：取一条 question 类的合成 id 来切 */
  const target = wb.db.prepare("SELECT id FROM user_entries WHERE profile_key = ? AND kind = 'question' ORDER BY rowid").get(key).id;
  const r = wb.setPrivacy(key, 'question', target, true);
  assert.ok(r.ok && r.private === true);
  assert.equal(wb.db.prepare('SELECT is_private FROM user_entries WHERE id = ?').get(target).is_private, 1);
  const others = wb.db.prepare('SELECT COUNT(*) AS n FROM user_entries WHERE profile_key = ? AND is_private = 1').get(key).n;
  assert.equal(others, 1, '只改目标行');
  assert.throws(() => wb.setPrivacy(key, 'question', 'user-9999', false), /找不到/, 'id 不存在必须报错');
  assert.throws(() => wb.setPrivacy(key, 'nope', target, true), /未知记录类型/, 'kind 非法必须报错');
  wb.close();
});

test('④ 错误路径可读：空名称 / 未知 kind / 不存在档案 / 非法 JSON body（HTTP 400）', async () => {
  const wb = await Workbench.open(tmp);
  const key = wb.listProfiles().find((p) => !p.is_demo).profile_key;
  assert.throws(() => wb.createProfile({ name: '   ' }), /必填/, '空名称给可读错误');
  assert.throws(() => wb.addEntry(key, 'nope', {}), /未知记录类型/, 'kind 非法给可读错误');
  assert.throws(() => wb.addEntry('ghost', 'lab', {}), /档案不存在/, '档案不存在给可读错误');
  wb.close();
  /* HTTP 层：body 解析失败 → 400 可读中文；body 超限 → 413 */
  const { Workbench: W } = await import('../dsh/workbench.js');
  const { startWorkbenchServer } = await import('../dsh/server.js');
  const wb2 = await W.open(tmp);
  const { server } = await startWorkbenchServer({ port: 0, workbench: wb2 });
  const port = server.address().port;
  try {
    const bad = await fetch(`http://127.0.0.1:${port}/api/profiles`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    const bj = await bad.json();
    assert.equal(bad.status, 400);
    assert.match(bj.message || '', /不是合法 JSON/, 'JSON 解析失败返回可读中文错误');
    const big = await fetch(`http://127.0.0.1:${port}/api/profiles`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(70 * 1024) });
    assert.equal(big.status, 413, 'body 超 64KB 返回 413');
    const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
    assert.ok((health.capabilities || []).includes('write'), 'health 自证 write 能力');
  } finally {
    server.close();
    wb2.close();
  }
});
