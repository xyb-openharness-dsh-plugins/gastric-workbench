/**
 * 包的入口：DSH 插件的服务端侧。宿主加载的就是这个文件，需要
 * `name` / `inject` / `Config` / `apply` 四样（workbench-standard §3.4）。
 *
 * 这一层只做三件事：
 * 1. 打开数据（配了 `root` 就用那个资料目录；没配就退到内存演示库，保证装上去能看见东西）；
 * 2. 在 `/api/gastric` 前缀下挂接口：`/health`、`/bootstrap`，以及 `/ui/*` 的静态页面；
 * 3. 所有请求先过宿主的鉴权回执（`connection.requestRejection`），不自己造登录。
 *
 * 为什么 UI 走 iframe：本项目是**标准分栏**（见 lib/layout.js，customFrame=false），
 * 右侧原生会话由宿主管，业务区只需要一个能自己滚动的页面。iframe 指向
 * `/api/gastric/ui/`，页面里的接口基址按自身路径推出来（见 public/app.js 的 apiBase()），
 * 所以「本地 dev-server 打开」与「装进 Desktop」用的是同一份前端，不需要两套构建。
 */
import Schema from '@deepseek-ai/schemastery'
import { openDatabase, migrate, close } from './store.js'
import { seedDemo, hasDemoData } from './demo.js'
import { bootstrap } from './readmodels.js'
import { servePublic } from './server.js'
import { KINDS, createProfile, addEntry, setPrivacy, trialMatch } from './workbench.js'
import { version, build } from '../lib/version.js'

export const name = 'gastric-main'
export const inject = ['webServer', 'connection']

/** 接口前缀与 UI 前缀：前端按同一份约定推基址，改这里要同步 public/app.js 的 apiBase()。 */
export const API_PREFIX = '/api/gastric'
export const UI_PREFIX = `${API_PREFIX}/ui`

/** Config 必须是 Schemastery schema；root 可选——不给就用内存演示库。 */
export const Config = Schema.object({
  root: Schema.string(),
})

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' })
  res.end(buf)
}

/** 读 JSON body（≤64KB）；超限 413、解析失败 400（可读中文），返回 null 让调用方短路。 */
async function readBody(req, res) {
  try {
    const chunks = []
    let size = 0
    for await (const c of req) {
      size += c.length
      if (size > 65536) { sendJson(res, 413, { error: 'body_too_large', message: '请求体超过 64KB 上限，请拆小后再试' }); return null }
      chunks.push(c)
    }
    const text = Buffer.concat(chunks).toString('utf8')
    return text ? JSON.parse(text) : {}
  } catch (error) {
    sendJson(res, 400, { error: 'invalid_json', message: `请求体不是合法 JSON：${error.message}` })
    return null
  }
}

/** 打开数据源。返回写入闭环的 services（宿主与 dev-server 两条启动路径用同一批库层函数）。 */
function openDataSource(root) {
  // 没配资料目录：内存库 + 演示数据。只读演示，不落盘，不会在用户机器上留文件。
  const file = root ? `${root.replace(/\/+$/, '')}/xyb-gastric.sqlite` : ':memory:'
  const db = openDatabase(file)
  migrate(db)
  if (!hasDemoData(db)) seedDemo(db)
  return {
    db,
    capabilities: ['bootstrap', 'health', 'write'],
    kinds: KINDS,
    bootstrap: () => bootstrap(db, { version, build }),
    trialMatch: (kw) => trialMatch(kw, { root }),
    createProfile: (b) => createProfile(db, b),
    addEntry: (key, kind, b) => addEntry(db, key, kind, b),
    setPrivacy: (b) => setPrivacy(db, b.profileKey, b.kind, b.id, b.private),
    close: () => close(db),
  }
}

export function apply(ctx, config = {}) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')

  let source = null
  let failure = null
  try {
    source = openDataSource(config.root)
  } catch (error) {
    failure = error.message
  }

  const handler = async (req, res) => {
    // 鉴权：宿主不给结论就不放行，不自建登录态
    if (typeof ctx.connection?.requestRejection !== 'function') {
      return sendJson(res, 503, { error: 'connection authentication capability unavailable' })
    }
    const rejection = ctx.connection.requestRejection(req)
    if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })

    const url = new URL(req.url, 'http://127.0.0.1')
    const path = url.pathname

    if (path === `${API_PREFIX}/health`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
      return sendJson(res, 200, {
        ok: !failure, version, ui: UI_PREFIX,
        capabilities: source ? source.capabilities : ['health'],
        error: failure || undefined,
      })
    }
    if (path === `${API_PREFIX}/bootstrap`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
      if (failure) return sendJson(res, 503, { error: 'bootstrap_unavailable', message: failure })
      try {
        return sendJson(res, 200, source.bootstrap())
      } catch (error) {
        return sendJson(res, 500, { error: 'bootstrap_failed', message: error.message })
      }
    }
    if (path === `${API_PREFIX}/trials` && source) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
      try {
        return sendJson(res, 200, source.trialMatch(url.searchParams.get('keyword') || ''))
      } catch (error) {
        return sendJson(res, 500, { error: 'trials_failed', detail: String(error.message || error) })
      }
    }
    /* ---------- 写入 API（0.1.4）：与 scripts/dev-server.mjs 同一批库层函数，禁止只改一处 ---------- */
    const kindRe = source ? source.kinds.join('|') : ''
    const mEntry = kindRe ? path.match(new RegExp(`^${API_PREFIX}/profiles/([A-Za-z0-9_-]+)/(${kindRe})$`)) : null
    if (path === `${API_PREFIX}/profiles` && req.method === 'POST') {
      if (failure) return sendJson(res, 503, { error: 'write_unavailable', message: failure })
      const body = await readBody(req, res); if (body === null) return
      try { return sendJson(res, 200, source.createProfile(body || {})) }
      catch (error) { return sendJson(res, 400, { error: 'createProfile_failed', message: String(error.message || error) }) }
    }
    if (mEntry && req.method === 'POST') {
      if (failure) return sendJson(res, 503, { error: 'write_unavailable', message: failure })
      const body = await readBody(req, res); if (body === null) return
      try { return sendJson(res, 200, source.addEntry(mEntry[1], mEntry[2], body || {})) }
      catch (error) { return sendJson(res, 400, { error: 'addEntry_failed', message: String(error.message || error) }) }
    }
    if (path === `${API_PREFIX}/privacy` && req.method === 'POST') {
      if (failure) return sendJson(res, 503, { error: 'write_unavailable', message: failure })
      const body = await readBody(req, res); if (body === null) return
      try { return sendJson(res, 200, source.setPrivacy(body || {})) }
      catch (error) { return sendJson(res, 400, { error: 'setPrivacy_failed', message: String(error.message || error) }) }
    }
    if (path === UI_PREFIX || path.startsWith(`${UI_PREFIX}/`)) {
      return void servePublic(req, res, path.slice(UI_PREFIX.length) || '/')
    }
    sendJson(res, 404, { error: 'not_found', path })
  }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler })
    return () => {
      try { dispose && dispose() } catch { /* 宿主卸载时的清理失败不该盖住原错误 */ }
      if (source) { try { source.close() } catch { /* 同上 */ } }
    }
  }, 'colorectal ui + api')
}
