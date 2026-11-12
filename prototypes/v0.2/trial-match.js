/* 35 号 · 试验匹配纯函数（展示层计算；可被 node 测试以 new Function 方式断言）
 * 红线（E7）：
 *   ① 判据只来自快照真实存在的字段（title/studyType）；未结构化 → '?' 不进分母
 *   ② 药物靶点不进分母（本快照没有靶点字段，函数签名也不收靶点——靶点是「药打哪里」，不是患者条件）
 *   ③ 可对照项不足 2 条不给百分数
 *   ④ 反向条件显式反转（本台无反向条件字段，保留语义位）
 * 禁词：匹配指数 / 入选概率 / eligible / suitability —— 百分数只在展示层，命名用「登记字段符合度」。
 */
;(function (global) {
  'use strict'

  var RELEVANT = /gastric|gastro|胃|gastroesophageal|esophagogastric|\bGEJ\b/i

  function items(facts, prefs) {
    var out = []
    var title = String(facts && facts.title || '')
    var type = String(facts && facts.studyType || '')
    var pref = prefs && prefs.type ? String(prefs.type) : 'all'
    /* ① 疾病相关性（硬性）——判据只来自快照真实字段 title */
    out.push({
      state: RELEVANT.test(title) ? '✓' : '✕',
      label: '与本台疾病相关（胃癌，含腺癌 / 胃食管交界 / GEJ）',
      hard: true,
      got: '登记题目「' + (title.length > 40 ? title.slice(0, 40) + '…' : title) + '」（快照字段 title）',
      req: '登记题目或研究对象与胃癌相关'
    })
    /* ② 研究类型 vs 用户偏好——偏好=all 时不产出该条（不进分母） */
    if (pref !== 'all') {
      var wantRe = pref === 'interventional' ? /干预|intervention/i : /观察|observ/i
      out.push({
        state: wantRe.test(type) ? '✓' : (type ? '✕' : '?'),
        label: '研究类型符合你在建档里选的偏好',
        hard: false,
        got: type ? '登记类型「' + type + '」（快照字段 study_type）' : '快照未存类型（需人工核对）',
        req: '研究类型符合你在建档里选的偏好（只影响排序与对照，不是入排条件）'
      })
    }
    /* ③ 入组状态——登记状态一律「未核实」，快照没有可核实的招募时间线，恒为 '?'，不进分母 */
    out.push({
      state: '?',
      label: '仍在招募（可入组）',
      hard: false,
      got: '本机快照只存登记的结构化字段，登记状态一律「登记状态，未核实」（快照会过期）',
      req: '当前在招募期且名额可用——需人工核对，以官方登记页为准'
    })
    return out
  }

  function score(items) {
    var comparable = (items || []).filter(function (i) { return i.state !== '?' })
    if (comparable.length < 2) return { pct: null, ok: 0, m: comparable.length, reason: '可对照项不足 2 条，不给符合度' }
    var ok = comparable.filter(function (i) { return i.state === '✓' }).length
    return { pct: Math.round(ok / comparable.length * 100), ok: ok, m: comparable.length, reason: '' }
  }

  /* 三态排序：✕ 与 ? 排前（先行展示不符合与待确认），其余折叠由 UI 决定 */
  function sorted(items) {
    var rank = { '✕': 0, '?': 1, '✓': 2 }
    return (items || []).slice().sort(function (a, b) { return (rank[a.state] ?? 3) - (rank[b.state] ?? 3) })
  }

  global.StomTrialMatch = { items: items, score: score, sorted: sorted, RELEVANT: RELEVANT }
})(window)
