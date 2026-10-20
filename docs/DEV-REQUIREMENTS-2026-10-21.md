# 胃癌开发版需求与硬约束清单（2026-10-21）

本文件是胃癌工作台从「starter 骨架」进入「调研 → schema → 临床数据 → demo HTML」的**唯一执行依据**。
前半部分是范围与验收（照抄小畅宝 `colorectal-workbench/docs/DEV-REQUIREMENTS-2026-10-20.md` 的体例），
后半部分是**从肠癌第一轮开发中逐条回收的错误**，标为硬约束，违反即视为未完成。

样板 = `~/Downloads/colorectal-workbench`（v0.1.0，`a50ea76`，`npm run check` 全绿 + 无头浏览器六项实测通过）。
胃癌本轮目标：**达到样板现在的开发版效果**，并按胃癌 SPEC（`docs/SPEC.md`）换内容。

---

## 一、范围（本轮要交付什么）

| # | 交付物 | 落点 | 怎么验 |
| --- | --- | --- | --- |
| 1 | 胃癌 2026 临床试验资料包 | `research/gastric-cancer/{manifest.json, trials-2026.jsonl, gastric_cancer_trials_2026.sqlite, README.md}` | manifest 记录数 = jsonl 行数 = sqlite `trial_records` 行数；sha256 与文件实算一致；`docs/CLINICAL-DATA-2026.md` 写清口径与限制 |
| 2 | 采集脚本随项目版本化 | `scripts/fetch-gastric-trials-2026.mjs` | 空跑 `--dry-run` 只打印命中数；重跑可复现（同一口径同一条数） |
| 3 | 胃癌数据模型 | `docs/SCHEMA.md` + `schema/0001_initial.sql` + `schema/freeze-contract.md` | `npm run check` 的 `check-schema` 验哈希；改结构只能加 `0002_*.sql` |
| 4 | 2 套 6 个月演示档案 | `demo/build-demo-data.mjs` → `prototypes/v0.2/demo-data.js` + `demo/demo-data.sqlite` | 单测断言：指标点升序、主序列跨度 ≥150 天、两档案都能渲染全部视图 |
| 5 | 原型 demo 四件套 | `prototypes/v0.2/{index.html, style.css, app.js, demo-data.js}` | 浏览器打开 file:// 无控制台错误；一级页 9 个（**无「营养支持」页**，A15） |
| 6 | 开发版 `public/` + DSH 链路 | `public/{index.html, style.css, shell.css, app.js}`、`dsh/*`、`lib/*` | `test/ui-parity.test.mjs` 逐视图比对原型与开发版；`npm run check` 全绿 |
| 7 | 顶栏 / AI 面板 / 一图秀 / 3D 卡 | 见第二节 | 见第二节 |

## 二、照抄样板的四条产品要求（不许"按比例缩减"）

| # | 要求 | 做什么 | 怎么验 |
| --- | --- | --- | --- |
| R1 | 顶栏三段式 + AI 主按钮五态 | 左＝品牌+版本 chip（中性灰）/ 中＝一句说明 `flex:1` / 右＝主操作组 `margin-left:auto`；五态文案固定：AI 对话 / 正在连接… / 收起 AI 对话 / 打开 AI 对话 / AI 对话暂不可用 | parity ⑨：三段顺序、chip 在左、`flex:1`、`margin-left:auto`、五态文案齐全 |
| R2 | AI 面板可打开 / 隐藏 / 调宽 | 25%–45% 可拖、`role="separator"` + aria 区间、键盘 ←/→、Home/End、localStorage 记忆 | parity ⑨ + 浏览器实测（`--agent-w` 三列、拖动后 stored 值变化） |
| R3 | 一图秀严格按设计原型 | 统一画布常量、单调三次插值（无过冲）、每指标独立配色、治疗泳道与评估标记、末点防叠 13px | parity ① 逐视图；**默认指标是体重不是 CEA**（A6） |
| R4 | 3D 指标卡按 `docs/24-METRIC-TREND-TAB-DESIGN.md` | 整卡点击 180°、`perspective:1100px`、`480ms cubic-bezier(.2,.7,.2,1)`、双面 `backface-visibility:hidden`、隐藏面 `aria-hidden`、键盘 Enter/Space、分类记录不翻不连线 | 卡片 HTML 有 `role="group" tabindex="0" data-flipped`；样式有 `.mcard[data-flipped="true"]` 规则 |

---

## 三、硬约束（肠癌第一轮逐条回收的错误，胃癌必须不再犯）

### 3.1 数据层

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H1 | **复合主键表裸 `SELECT *` 必须写 `ORDER BY rowid`**。SQLite 会按索引字母序返回，`metrics(profile_key,key)` 曾让 `alb` 排在 `cea` 前，parity 直接红。 | 肠癌 parity ③ |
| H2 | **手写倒序数组（日记/记录清单）用 `ORDER BY ord`，绝不叠加 DESC**。作者已按「最新在前」写数组，再 DESC 会二次反转。 | 肠癌 parity ③（造口日记） |
| H3 | **可选字段要显式写 `null`**，读模型按 `=== null` 判定，不能靠"键不存在"分支。演示数据生成处统一 `band: m.band ?? null`。 | 肠癌 parity ③ |
| H4 | 演示数据口径：化验/体征每 2–4 周一点并延续到当天；**影像/内镜按真实频率，不加密**。 | 家族约定 |
| H5 | 看法恒不为结论（`is_conclusion=0`）；更正只新增版本不覆盖；四点位缺健侧不生成差值。 | 家族四条契约 |

### 3.2 前端

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H6 | **图标 key 必须有别名兜底**：页面键（`records`/`labs`/`timeline`）与图标表键（`folder`/`lab`/`chart`）不同名时一律走 `ICON_ALIAS`，最终兜底 `icons.badge`。曾出现 `<path d="undefined">` 控制台报错。 | 肠癌截图实测 |
| H7 | **内联 `<svg>` 必须给尺寸**（`.actions .hero-ai svg{width:15px;height:15px}`）。曾把 hero 按钮撑成竖块。 | 用户截图 6 |
| H8 | **页脚贴底**：`.work-area{min-height:100%}` 且 `.work-area .work-grid{flex:1 1 auto;align-content:start}`，否则页脚悬在页面中部。 | 用户截图 7 |
| H9 | **顶栏中区只放一句说明**，不渲染注释/TODO/提示条残留。 | 用户截图 7 |
| H10 | **`[hidden]` 要防 CSS `display` 覆盖**：写了 `hidden` 属性但 CSS 给了 `display:flex` 会失效，需 `[hidden]{display:none!important}` 或改用类。 | 家族踩坑 |
| H11 | **二级页签必须按 `state.sub` 分流**，不能默认返回第一个页签内容——用户曾逐页截图指出"tab 和内容不一致"。测试要**穷举 sub × 档案**。 | 用户轮次 A（已沉淀 starter `docs/19-PROTOTYPE-CRAFT.md` §5.14） |
| H12 | 字号基线 **12.5px**；面板参数唯一来源 `lib/layout.js`，客户端与页面不许各写一份字面量。 | 用户轮次 C |

### 3.3 工程与交付

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H13 | **装机目录必须是 `~/.dsh/profiles/desktop`**，不是 web。`dsh.client.platform="web"` 是运行环境（官方检查器强制），与装机目录是两件事。 | 用户轮次 E-1 |
| H14 | 文案红线词表本身也会命中红线 → 词表所在行加 `// wording-allow` 并写理由。 | 肠癌 `check-wording` 6 处失败 |
| H15 | `schema/freeze-contract.md` 里的 sha256 **必须用实算值写入**，不能留 `${sha}` 未展开。 | 肠癌 `check-schema` 失败 |
| H16 | `lib/version.js` 是生成物，改完 `VERSION` 要跑 `scripts/build-version.mjs`。 | 肠癌 `check-version` 失败 |
| H17 | `check-workbench-package` 会比对 `project.config.json.repository` 与 `lib/client.js` 描述符的 repository，**两边必须同字符串**。 | 肠癌包检查失败 |
| H18 | 跑测试 / `pnpm add` 前先 `NODE_OPTIONS=`（置空），宿主 shim 会拦临时目录删除与 symlink，制造假失败。 | 家族记忆 |
| H19 | macOS **BSD grep 用 `\|` 会静默失败**，一律 `grep -E "a\|b"`。校验 HTML 标签配平用 python 不用 shell。 | 家族记忆 |
| H20 | `git commit` 不带 `-C <dir>` 会跑在会话默认 cwd；提交前先确认分支与 cwd。 | 肠癌推送时踩到 |

### 3.4 胃癌专属新增约束

| # | 约束 | 依据 |
| --- | --- | --- |
| G-A1 | 四标志物（HER2 / PD-L1 CPS / MSI / CLDN18.2）**各自独立状态**：已检测 / 未检测 / 待出；**未检测不得补"阴性"**。 | SPEC A1 |
| G-A2 | CA19-9 页固定出现 Lewis 阴性说明占位（医生结论原文位），**不把缺失当正常**。 | SPEC A2 / G5 |
| G-A3 | 切除方式四选一（全胃 / 近端 / 远端 / ESD）+ 手术日期 + 机构。 | SPEC A3 |
| G-A4 | 进食记录只记餐次与症状标记（倾倒 / 反流 / 腹胀），**无处理建议**。 | SPEC A4 |
| G-A5 | 补充剂只显示**医嘱原文与起止**，无剂量推荐、无品牌。 | SPEC A5 |
| G-A6 | 一图秀默认指标 **体重（kg）**，治疗节点与体重序列分离。 | SPEC A6 |
| G-A7 | 围手术期方案带「术前 / 术后」阶段标签。 | SPEC A7 |
| G-A8 | **不设「营养支持」一级页**（防双入口回归），营养内容全部并入「进食与营养」。 | SPEC A15 |
| G-A9 | 不做补剂剂量推荐、Hp 根除建议、倾倒自疗、残胃癌概率、病友匹配。 | SPEC「明确不做」 |

---

## 四、本轮明确未做（不许在验收里算通过）

- DSH 真机装机（打 tar → desktop profile → 重启 Desktop 人工确认）。
- Desktop 内可拖会话栏（需 `customFrame=true` 接管原生会话，M5 决策项）。
- MinerU 真实解析、导出 PDF/DOCX、云端同步。
- ChinaDrugTrials 与 ChiCTR 采集（需会话采集器），资料包里显式记 `included:false`。

## 五、需要用户澄清 / 我按脚手架替你定的（默认执行，可回退）

| # | 项 | 默认决定 | 理由 |
| --- | --- | --- | --- |
| Q1 | 品牌主色 | **小胃宝橙**：`--violet:#C2410C` / `--violet-soft:#FFF1E7` / `--violet-deep:#9A3412`；外壳中性色（`--paper:#f7f9fc`、`--ink:#1c2b3a`、`--line:#e2e9f1`）与肠癌完全一致，只换品牌变量 | `docs/BRIEF.md` §2026-10-18 记载「沿用既有 Stompal 小胃宝 Logo（**橙色**）」；家族纸色底保持一致便于横向比较。变量集中在一处，换色成本 = 改 3 行 CSS |
| Q2 | 3D 卡高 | 沿用样板的 **188px**（三列网格密度），不套 doc24 的 276px 两列基线 | 肠癌同一偏差已在交付说明里提出，未收到回退指示 |
| Q3 | 一图秀默认指标 | **体重**（SPEC A6），可在指标卡上切换其它序列 | SPEC 明文 |
| Q4 | 资料包年份口径 | **首次公示在 2026 年**（与肠癌一致），不是启动年份 | 与样板对齐，便于横向比较 |
| Q5 | 检索词 | `gastric cancer` + `gastroesophageal junction cancer` + `esophagogastric junction adenocarcinoma` 三组并集后去重 | 单一检索词会漏 GEJ；比肠癌多两组，属改进，已在 manifest 记录 |
