# 变更记录

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
