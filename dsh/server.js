/* HTTP 层：一个 /api 前缀的 JSON 接口 + public/ 静态文件。零依赖，只用 node:http / node:fs。
 *
 * 三件事这里说了算，别处不许再定一遍：
 * 1. 静态文件只在 public/ 目录内解析；`..` 一律拦掉（路径穿越），解析结果必须仍在根目录里。
 * 2. 未知 /api/* 返回 JSON 404，不返回 HTML（前端按 JSON 解析，收到 HTML 会报很难查的错）。
 * 3. assertWorkspacePath：资料目录必须由用户选定——主目录 / 桌面 / 下载根目录、/tmp、/var
 *    都在拒绝清单里，父目录不存在时不静默创建，把可读错误交回调用方去提示用户。 */

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
};

/* ---------------- 工作区路径校验 ---------------- */

/** 返回人类可读的问题；空数组＝可以用。调用方负责把问题提示给用户，这里不帮用户"猜一个目录"。 */
export function workspaceProblems(p) {
  if (typeof p !== 'string' || !p.trim()) return ['资料目录不能为空：需要你明确选择一个目录'];
  const target = resolve(p);
  const home = resolve(homedir());
  const problems = [];
  if (target === home) problems.push('不能用主目录当资料目录（会和个人文件混在一起）');
  if (target === '/tmp' || target.startsWith('/tmp' + sep) || target === '/var' || target.startsWith('/var' + sep)) {
    problems.push('不能用 /tmp 或 /var：系统可能会清理，资料会丢');
  }
  for (const name of ['Desktop', 'Downloads', 'Documents']) {
    const d = join(home, name);
    if (target === d) problems.push(`不能用「${name}」根目录当资料目录：请在它下面新建一个目录`);
  }
  if (!existsSync(dirname(target))) problems.push(`上级目录不存在：${dirname(target)}（不自动创建，请确认你选的位置）`);
  return problems;
}

/** 校验版：不合法就抛 Error。启动流程用它拦在打开数据库之前。 */
export function assertWorkspacePath(p) {
  const problems = workspaceProblems(p);
  if (problems.length) throw new Error(problems.join('；'));
  return resolve(p);
}

/* ---------------- 静态文件 ---------------- */

function safeJoin(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = clean.replace(/^\/+/, '');
  const full = resolve(root, rel || 'index.html');
  // 解析后必须仍在 root 内（含 root 自身）
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

function sendFile(res, file) {
  try {
    const st = statSync(file);
    if (!st.isFile()) return false;
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-cache',
    });
    createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

/* ---------------- 路由 ---------------- */

/**
 * 把 public/ 下的文件按 urlPath 回出去（只读 GET/HEAD，路径穿越已拦）。
 * 独立启动与 DSH 宿主两条链路共用这一份，避免"本地能开、装进 Desktop 就 404"。
 * @returns {boolean} 是否已经写完响应
 */
export function servePublic(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return true;
  }
  const file = safeJoin(PUBLIC_DIR, urlPath);
  if (file && sendFile(res, file)) return true;
  // 单页应用：未知路径回 index.html，交给前端按 hash 路由
  return sendFile(res, join(PUBLIC_DIR, 'index.html'));
}

export function createHandler({ workbench }) {
  /* 写入闭环（0.1.4）：服务层从 workbench 实例装配一次；宿主形态（dsh/index.js）用同一批
     库层函数装配出等价 services，两条启动路径共享同一套写入语义。 */
  const services = workbench ? {
    version: workbench.version,
    capabilities: ['bootstrap', 'health', 'write'],
    kinds: workbench.kinds,
    bootstrap: () => workbench.bootstrap(),
    trialMatch: (kw) => workbench.trialMatch(kw),
    createProfile: (b) => workbench.createProfile(b),
    addEntry: (key, kind, b) => workbench.addEntry(key, kind, b),
    setPrivacy: (b) => workbench.setPrivacy(b.profileKey, b.kind, b.id, b.private),
  } : null;

  /** 读 JSON body（≤64KB）；超限 413、解析失败 400（可读中文），返回 null 让调用方短路。 */
  async function readBody(req, res, json) {
    try {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 65536) { json(413, { error: 'body_too_large', message: '请求体超过 64KB 上限，请拆小后再试' }); return null; }
        chunks.push(c);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      return text ? JSON.parse(text) : {};
    } catch (error) {
      json(400, { error: 'invalid_json', message: `请求体不是合法 JSON：${error.message}` });
      return null;
    }
  }

  return async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const path = url.pathname;

    const json = (code, body) => {
      const buf = Buffer.from(JSON.stringify(body), 'utf8');
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length });
      res.end(buf);
    };

    if (path === '/api/health') {
      return json(200, { ok: true, version: services.version, capabilities: services.capabilities });
    }
    if (path === '/api/bootstrap') {
      try {
        return json(200, services.bootstrap());
      } catch (error) {
        return json(500, { error: 'bootstrap_failed', message: error.message });
      }
    }
    if (path === '/api/trials' && services.trialMatch) {
      if (req.method !== 'GET') { json(405, { error: 'method_not_allowed', message: '临床试验检索只支持 GET' }); return; }
      try {
        return json(200, services.trialMatch(url.searchParams.get('keyword') || ''));
      } catch (error) {
        return json(500, { error: 'trials_failed', detail: String(error.message || error) });
      }
    }
    /* ---------- 写入 API（0.1.4）：POST /profiles、POST /profiles/{key}/{kind}、POST /privacy ---------- */
    const kindRe = (services.kinds || []).join('|');
    const mEntry = kindRe ? path.match(new RegExp(`^/api/profiles/([A-Za-z0-9_-]+)/(${kindRe})$`)) : null;
    if (path === '/api/profiles' && req.method === 'POST') {
      const body = await readBody(req, res, json); if (body === null) return;
      try { return json(200, services.createProfile(body || {})); }
      catch (error) { return json(400, { error: 'createProfile_failed', message: String(error.message || error) }); }
    }
    if (mEntry && req.method === 'POST') {
      const body = await readBody(req, res, json); if (body === null) return;
      try { return json(200, services.addEntry(mEntry[1], mEntry[2], body || {})); }
      catch (error) { return json(400, { error: 'addEntry_failed', message: String(error.message || error) }); }
    }
    if (path === '/api/privacy' && req.method === 'POST') {
      const body = await readBody(req, res, json); if (body === null) return;
      try { return json(200, services.setPrivacy(body || {})); }
      catch (error) { return json(400, { error: 'setPrivacy_failed', message: String(error.message || error) }); }
    }
    if (path.startsWith('/api/')) return json(404, { error: 'not_found', path });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD, POST' });
      return res.end();
    }

    const file = safeJoin(PUBLIC_DIR, path);
    if (!file || !sendFile(res, file)) {
      // 单页应用：未知路径回 index.html，交给前端按 hash 路由
      if (sendFile(res, join(PUBLIC_DIR, 'index.html'))) return;
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404');
    }
  };
}

/** 起服务。port=0 时由系统分配（测试用），返回实际端口。 */
export function startWorkbenchServer({ port = 4173, host = '127.0.0.1', workbench }) {
  if (!workbench) throw new Error('startWorkbenchServer 需要一个 workbench 实例');
  const server = createServer(createHandler({ workbench }));
  return new Promise((res, rej) => {
    server.once('error', rej);
    server.listen(port, host, () => {
      const actual = server.address().port;
      res({ server, port: actual, host, url: `http://${host}:${actual}/` });
    });
  });
}
