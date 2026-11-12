#!/usr/bin/env node
/**
 * 生成 public/demo-data.js —— 「无 API 形态」的回退数据（window.DEMO_DATA）。
 *
 * 为什么要有它：开发版数据来自 GET /api/bootstrap；纯静态托管 / file:// 打开时没有 API，
 * loadBootstrap() 的回退分支会读 window.DEMO_DATA（§模拟数据回退）。这份文件必须与
 * /api/bootstrap 的对象形状完全一致，所以不走手写 —— 直接用读模型 bootstrap()
 * 从 demo/demo-data.sqlite 生成（与 /api/bootstrap 同一条读路径，buildData 直接消费）。
 *
 * 重新生成方式（改演示数据后两条都要跑）：
 *   node demo/build-demo-data.mjs && npm run build:demo-data
 *
 * 用法：node scripts/build-public-demo-data.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrap } from '../dsh/readmodels.js';
import { version, build } from '../lib/version.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const db = new DatabaseSync(join(ROOT, 'demo/demo-data.sqlite'), { readOnly: true });
const payload = bootstrap(db, { version, build });
db.close();

if (!payload.profiles || !payload.profiles.A || !payload.profiles.B) {
  console.error('✗ demo/demo-data.sqlite 里没有 A/B 演示档案，先跑 node demo/build-demo-data.mjs');
  process.exit(1);
}

const js = '/* 由 scripts/build-public-demo-data.mjs 生成；勿手改。'
  + '数据经读模型 bootstrap() 取自 demo/demo-data.sqlite，与 /api/bootstrap 的对象形状一致'
  + '（public/app.js 的 buildData 直接消费）。重新生成：node demo/build-demo-data.mjs && npm run build:demo-data */\n'
  + 'window.DEMO_DATA = ' + JSON.stringify(payload) + ';\n';
writeFileSync(join(ROOT, 'public/demo-data.js'), js);
console.log(`public/demo-data.js 生成完毕：${Object.keys(payload.profiles).length} 档案 / ${payload.trials.length} 条试验 / ${payload.subjects.length} subjects`);
