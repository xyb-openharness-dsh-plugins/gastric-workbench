#!/usr/bin/env node
/**
 * check-trial-snapshot.mjs — research/ 快照四件套对账（35 号 §1.4：有快照就必须对账）。
 *
 * 【本仓快照字段口径】（与食管癌参考实现同源，以本仓 research/gastric-cancer 真实字段为准改写）：
 *   - 表名 trial_records（另有 source_coverage / metadata 两张非记录表，不参与对账）；
 *     主键列 registry_id；
 *   - 字段是扁平标量（registry / registry_id / title / official_title / first_posted /
 *     start_date / primary_completion / last_update / overall_status / study_type / phases /
 *     conditions / interventions / lead_sponsor / countries / enrollment / summary /
 *     eligibility / category / source_url / fetched_at），无 JSON 编码列；
 *   - manifest 是 fetch-gastric-trials-2026.mjs 的产物：total_records 计数（=236）；
 *     files.<slug>.sqlite.sha256 / files.<slug>.jsonl.lines（jsonl 只有行数，无哈希）；
 *     另有 sources.* 记通道终态（ClinicalTrials included=true, ChinaDrugTrials/ChiCTR 未采集）
 *     与 china_sites / by_status 统计 —— 本脚本不据此断言，只对账三件套数字。
 *
 * 断言：manifest.total_records = jsonl 行数 = sqlite trial_records 行数；sqlite sha256 与
 * manifest 一致；jsonl 与 sqlite 按 registry_id 逐条逐字段相等；integrity_check 通过。
 *
 * 用法：node scripts/check-trial-snapshot.mjs [项目根]
 */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { join, resolve } from 'node:path'

const target = resolve(process.argv[2] || process.cwd())
const errors = []
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const FIELDS = [
  'registry', 'registry_id', 'title', 'official_title', 'first_posted', 'start_date',
  'primary_completion', 'last_update', 'overall_status', 'study_type', 'phases',
  'conditions', 'interventions', 'lead_sponsor', 'countries', 'enrollment',
  'summary', 'eligibility', 'category', 'source_url', 'fetched_at',
]

async function isSnapshotDirectory(dir) {
  try {
    const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'))
    return typeof manifest.total_records === 'number' && !!manifest.files
  } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

async function findSnapshots(dir) {
  let entries = []
  try { entries = await readdir(dir, { withFileTypes: true }) } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  const found = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const child = join(dir, entry.name)
    if (entry.name === 'research') found.push(...await findSnapshots(child))
    else if (await isSnapshotDirectory(child)) found.push(child)
  }
  return found
}

async function checkSnapshot(dir) {
  let manifest
  try { manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')) }
  catch (error) { errors.push(`${dir}: cannot read manifest.json: ${error.message}`); return }

  /* manifest.files.<slug>.{sqlite:{sha256,bytes}, jsonl:{lines}} —— 本仓口径 */
  const slug = Object.keys(manifest.files || {})[0]
  if (!slug) { errors.push(`${dir}: manifest.files is empty`); return }
  const spec = manifest.files[slug]
  const jsonlPath = join(dir, 'trials-' + (manifest.year || '') + '.jsonl')
  const dbPath = join(dir, slug + '.sqlite')

  /* 1. sqlite sha256 / bytes */
  let dbBytes
  try {
    dbBytes = await readFile(dbPath)
    if (spec.sqlite && typeof spec.sqlite.sha256 === 'string' && sha256(dbBytes) !== spec.sqlite.sha256) {
      errors.push(`${dir}: SHA-256 mismatch for ${slug}.sqlite`)
    }
    if (spec.sqlite && typeof spec.sqlite.bytes === 'number' && dbBytes.length !== spec.sqlite.bytes) {
      errors.push(`${dir}: byte size mismatch for ${slug}.sqlite (manifest ${spec.sqlite.bytes} vs ${dbBytes.length})`)
    }
  } catch (error) { errors.push(`${dir}: cannot read ${slug}.sqlite: ${error.message}`); return }

  /* 2. jsonl 行数与逐行解析 */
  let rows
  try {
    const text = (await readFile(jsonlPath)).toString('utf8')
    rows = text.split(/\r?\n/).filter((line) => line.trim()).map((line, i) => {
      try { return JSON.parse(line) } catch (error) { throw new Error(`JSONL line ${i + 1}: ${error.message}`) }
    })
  } catch (error) { errors.push(`${dir}: ${error.message}`); return }
  if (spec.jsonl && typeof spec.jsonl.lines === 'number' && spec.jsonl.lines !== rows.length) {
    errors.push(`${dir}: manifest files.${slug}.jsonl.lines ${spec.jsonl.lines} != JSONL ${rows.length}`)
  }

  const rowMap = new Map()
  for (const row of rows) {
    if (typeof row.registry_id !== 'string' || !row.registry_id) { errors.push(`${dir}: JSONL record has no registry_id`); continue }
    if (rowMap.has(row.registry_id)) errors.push(`${dir}: duplicate JSONL registry_id ${row.registry_id}`)
    rowMap.set(row.registry_id, row)
  }

  /* 3. manifest.total_records = jsonl = sqlite */
  if (manifest.total_records !== rows.length) {
    errors.push(`${dir}: manifest total_records ${manifest.total_records} != JSONL ${rows.length}`)
  }

  let db
  try { db = new DatabaseSync(dbPath, { readOnly: true }) }
  catch (error) { errors.push(`${dir}: cannot open SQLite read-only: ${error.message}`); return }
  try {
    const integrity = db.prepare('PRAGMA integrity_check').all().map((r) => Object.values(r)[0])
    if (integrity.length !== 1 || integrity[0] !== 'ok') errors.push(`${dir}: SQLite integrity_check failed: ${integrity.join('; ')}`)
    const columns = new Set(db.prepare('PRAGMA table_info(trial_records)').all().map((r) => r.name))
    for (const f of FIELDS) if (!columns.has(f)) errors.push(`${dir}: SQLite trial_records missing column ${f}`)
    const dbRows = db.prepare('SELECT * FROM trial_records').all()
    if (rows.length !== dbRows.length) errors.push(`${dir}: JSONL ${rows.length} != SQLite trial_records ${dbRows.length}`)
    const dbMap = new Map(dbRows.map((r) => [r.registry_id, r]))
    for (const [id, source] of rowMap) {
      const sql = dbMap.get(id)
      if (!sql) { errors.push(`${dir}: ${id} exists in JSONL but not SQLite`); continue }
      for (const f of FIELDS) {
        const a = sql[f] ?? null, b = source[f] ?? null
        if (String(a) !== String(b)) errors.push(`${dir}: field mismatch ${id}.${f} (SQLite "${a}" vs JSONL "${b}")`)
      }
    }
    for (const id of dbMap.keys()) if (!rowMap.has(id)) errors.push(`${dir}: ${id} exists in SQLite but not JSONL`)
    console.log(`CHECK ${dir}: records=${rows.length}/${dbRows.length} (manifest ${manifest.total_records})`)
  } catch (error) {
    errors.push(`${dir}: SQLite validation failed: ${error.message}`)
  } finally { db.close() }
}

let snapshots = []
try {
  if (await isSnapshotDirectory(target)) snapshots = [target]
  else snapshots = await findSnapshots(target)
} catch (error) { errors.push(`Cannot inspect ${target}: ${error.message}`) }

if (!snapshots.length) errors.push(`No clinical snapshot found under ${target}（有快照就必须对账，不许 --if-present 蒙混）`)
for (const dir of snapshots) await checkSnapshot(dir)

if (errors.length) {
  for (const error of errors.slice(0, 50)) console.error(`FAIL ${error}`)
  if (errors.length > 50) console.error(`FAIL … ${errors.length - 50} more errors`)
  console.log(`FAIL snapshot consistency: ${errors.length} issue(s)`)
  process.exitCode = 1
} else {
  console.log(`PASS snapshot consistency: ${snapshots.length} snapshot(s)`)
}
