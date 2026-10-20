#!/usr/bin/env node
/**
 * 装机目标检查：**这个包必须登记到 desktop profile，不能只登记到 web profile。**
 *
 * 背景（2026-10-20）：上一轮打 tar 后装错位置，包被登记进了 `~/.dsh/profiles/web`，
 * Desktop 里自然看不到工作台。`dsh.client.platform = "web"` 指的是"客户端跑在浏览器/渲染进程里"，
 * 与"装到哪个 profile"是两件事——前者官方检查器要求必须是 web，后者必须是 desktop。
 *
 * 用法：
 *   node scripts/check-install.mjs                # 查默认位置 ~/.dsh/profiles
 *   node scripts/check-install.mjs --home <dir>   # 查别的 DSH 根目录
 * 退出码：0 = 已正确登记；1 = 未登记或只登记在 web。
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const homeIdx = args.indexOf('--home');
const dshHome = homeIdx >= 0 && args[homeIdx + 1] ? resolve(args[homeIdx + 1]) : join(homedir(), '.dsh');

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const NAME = pkg.name;

function readProfile(name) {
  const file = join(dshHome, 'profiles', name, 'package.json');
  if (!existsSync(file)) return null;
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const dep = json.dependencies?.[NAME] ?? null;
    const bundled = (json.dsh?.profile?.bundles ?? []).includes(NAME);
    return { file, dep, bundled };
  } catch (error) {
    return { file, error: error.message };
  }
}

const desktop = readProfile('desktop');
const web = readProfile('web');

const lines = [];
let ok = true;

if (!desktop) {
  ok = false;
  lines.push(`✗ 找不到 desktop profile：${join(dshHome, 'profiles', 'desktop', 'package.json')}`);
} else if (desktop.error) {
  ok = false;
  lines.push(`✗ desktop profile 的 package.json 读不了：${desktop.error}`);
} else {
  if (!desktop.dep) {
    ok = false;
    lines.push(`✗ desktop profile 的 dependencies 里没有 ${NAME}——这个工作台不会出现在 Desktop 里。`);
  }
  if (!desktop.bundled) {
    ok = false;
    lines.push(`✗ desktop profile 的 dsh.profile.bundles 里没有 ${NAME}——依赖装了但不会被加载。`);
  }
  if (ok) lines.push(`✓ ${NAME} 已登记到 desktop（${desktop.dep}）`);
}

if (web && web.dep) {
  lines.push(`! 同时也出现在 web profile（${web.dep}）——不是错误，但 Desktop 只读 desktop profile，别用 web 冒充装机通过。`);
}

if (!ok) {
  lines.push('');
  lines.push('正确做法（在仓库根目录执行，tar 放在 release/）：');
  lines.push(`  NODE_OPTIONS= npx --yes pnpm@10.15.0 --dir ~/.dsh/profiles/desktop add -w ./release/<包名>-<版本>.tgz`);
  lines.push(`  然后把 ${NAME} 加进 ~/.dsh/profiles/desktop/package.json 的 dsh.profile.bundles，重启 Desktop。`);
  lines.push('不要用 --dir ~/.dsh/profiles/web，也不要只 npm i 到仓库里。');
}

console.log(lines.join('\n'));
process.exit(ok ? 0 : 1);
