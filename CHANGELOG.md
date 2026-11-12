## 0.1.5 — 2026-11-13

三缺口批量补齐（A 型：临床线与新建患者早已就绪，只缺资料目录入口）：

- **A 资料目录**：面板顶栏新增「配置目录」→ `uiWorkspace.pickDirectory()` → 口径硬拒（主目录本身/桌面/下载根/tmp，客户端+服务端双判）→ `POST /api/gastric/api/root` 落盘回显；`cordis.patch.yml` 补 `config.root: !!js dshHomePath('gastric-workbench')`。
- 用法说明：本仓客户端是**单文件 lib/client.js**（无 src/ 构建），改动直接落在该文件；版本字面量在 `lib/client.js`、`public/index.html`、`public/app.js` 三处，已同步 0.1.5。
- 校验：三闸门全绿；`npm run check` 全绿。

## 0.1.3（2026-11-11，AI 对话面板激活修复）

- 会话判定改用宿主归属 `ownedSession()`（`ownsSession(currentSession())`），不再用 `Boolean(conversation)`（customFrame 下没会话也会传隐藏容器 → 判断恒为真 → 点了没反应）。
- 创建路径改 `service.newSession(workspaceId)`，工作区取 `service.defaultWorkspace?.()?.workspaceId`；无可用工作区时由宿主提示选目录；不再用 `ensureSession({})`。
- 取消目录选择不留空会话并提示可重试；创建失败在工作台内显示原因；订阅会话变化触发重渲染；草稿仍只填不发。
- 版本与生成物同步 0.1.3；新增 `scripts/check-agent-pane-contract.mjs` 入 check 链。
- **界面加载与真机点击待人工**（需退出重开 DSH Desktop 后新建会话走查）。

# 变更记录

## 2026-10-27 · 36 号 v2 补齐（指南可点+状态卡）v0.1.1

- 模式层同步：`prototypes/v0.2/primer.{js,css}` 与 `public/primer.{js,css}` 覆盖为 starter 最新版（含 §2.5 链接渲染与 §4.3 排版对齐）；`scripts/probe-disease-primer.mjs` 升到 P1–P9。
- 指南链接：evidence 表 5 行与全部 `original:false` 来源补齐二次链接 —— NCCN 指南页、ESMO 胃与食管癌 CPG 页、AJCC 分期系统页、WHO/IARC 消化系统肿瘤（第 5 版）页，逐条真浏览器验活 OK（4 个唯一 URL）。CSCO 指南需会员登录、官网无公开 2026 版 PDF，按 `nolink + note` 如实标注（5 处 nolink：CSCO ×4 + 趋势段自采登记快照 ×1）。
- 看板状态卡：看板首卡补 §2.6 四件（卡头 eyebrow / 大字天数 / 现状行 / 出口按钮排）；本档案没有锚点日，天数显示「待初始化」并指向三步初始化，不手填、不倒推。
- `public/` 补齐 primer 三件套并接线（顶栏「?」+ 数据/样式/模块）；`scripts/check-primer-links.mjs` 纳入 `npm run check`，并断言 public 三件套与活动原型同源。
- 验证：链接断言 17 项、24 通过、0 失败；探针 P1–P9+E0 在原型与开发版各 10/10 PASS；`npm run check` 退出码 0。

## 2026-10-21 · 装机目标更正（V2 前的准备）

- **更正**：装机目录不是 `~/.dsh/profiles/desktop`（CLI 侧，Desktop 不读）。DSH Desktop 0.12.0 实际加载的是 app 自己的 Harness `~/Library/Application Support/dsh-desktop/harness/profiles/web`。
- `scripts/check-install.mjs` 换成自动探测版（Desktop Harness → `DSH_HOME` → `~/.dsh`，打印判定依据，区分市场安装/手工安装）；`docs/DEV-REQUIREMENTS-2026-10-21.md` H13 与 README V2 段同步更正。
- `scripts/build-version.mjs --check` 不再比较 `build` / `commit`（易变量），修掉每次提交后必失败的假阴性。


## 2026-10-21 · 开发版 v0.1.0（胃癌全链路）

- 完成 2026 临床试验资料包：236 条（223 病种特异 + 13 篮式，119 条含中国中心），采集脚本随仓库版本化（`scripts/fetch-gastric-trials-2026.mjs`）；资料包与口径见 `docs/CLINICAL-DATA-2026.md`。
- 数据模型冻结：`schema/0001_initial.sql`（22 表，含胃癌专属 8 张：perioperative/resection/meal_log/dumping/supplement/peritoneal/endoscopy/hp）+ `schema/freeze-contract.md`（sha256 记录）。
- 演示数据：2 档案（李先生 ⅡB 术后辅助 SOX / 赵女士 Ⅳ 期腹膜转化治疗）× 6 个月窗 × 64 指标 × 402 数据点 × 10 条真实试验摘录；唯一来源 `demo/build-demo-data.mjs`。
- 原型 v0.2（`prototypes/v0.2/`）：10 个一级页、9 视图二级页签分流、四标志物四态（未检测≠阴性）、品牌换小胃宝橙 #C2410C；无头浏览器实测通过（页签穷举 / 3D 卡 / AI 面板三态 / 无溢出 / 无 404）。
- 开发版（`public/` + `dsh/`）：从肠癌样板逐行移植；`GET /api/bootstrap` 与原型 demo-data.js 逐字段 parity（21 项测试全绿，`npm run check` 全绿）；顶栏三段式 + AI 面板五态 + 25%–45% 可拖记忆分栏。
- 修复原型一处缺陷：PAGE_CONTEXT 中重复的 `nutrition` 键（后者覆盖前者），开发版删除重复项并留注释。

## 2026-10-20 · 开发快照（包版本 0.1.0）

- 补录D9仓库纳管决定、实际仓库身份及Git同步与市场投稿的边界；当前仍是设计审定阶段。
- 本次仅修改设计会话与说明文档，未运行业务测试；不代表设计或实机验收。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。
