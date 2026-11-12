# 胃癌临床研究登记资料（2026）

这是用于胃癌（Stompal 小胃宝）工作台设计与资料结构验证的本地研究数据库，**不是产品已接入的数据服务**。

## 文件

- `gastric_cancer_trials_2026.sqlite`：SQLite 数据库。`trial_records` 保存登记资料，`source_coverage` 标记每个来源的覆盖范围，`metadata` 记录筛选口径。
- `trials-2026.jsonl`：同一批数据的逐行 JSON 导出。
- `manifest.json`：记录数、来源覆盖、边界说明及 SQLite SHA-256。

当前共 **236 条**（三组词去重后 256 条，本地疾病术语过滤后保留 236）：全部来自 ClinicalTrials.gov。其中疾病特异研究 223 条、广谱篮式研究 13 条。所有保留记录的首次公示日期均在 2026-01-01 至采集日（含）之间，2025 及以前登记的记录已排除。

## 数据来源与覆盖

| 来源 | 纳入 | 覆盖说明 |
|---|---:|---|
| ClinicalTrials.gov | 236 | 官方 API v2。检索词三组并集：`query.cond="gastric cancer"`（原始 221）、`"gastroesophageal junction cancer"`（80）、`"esophagogastric junction adenocarcinoma"`（98）；`filter.advanced=AREA[StudyFirstPostDate]RANGE[2026-01-01,MAX] AND AREA[StudyType]INTERVENTIONAL`；再经本地疾病术语过滤（gastric / stomach / GEJ / gastroesophageal / esophagogastric / cardia 等，命中标题或 condition 任一）。该数仅代表这组查询与过滤口径，不代表所有全球注册库。 |
| ChinaDrugTrials | 0 | **本轮未采集**（需会话采集器与既有会话配置）。2026 记录数未知，"未命中"不能解释为"不存在"。 |
| ChiCTR | 0 | **本轮未采集**。同上。 |

状态分布（登记状态，非入组资格）：RECRUITING 109、NOT_YET_RECRUITING 103、COMPLETED 11、ENROLLING_BY_INVITATION 7、ACTIVE_NOT_RECRUITING 6。119 条记录含中国中心。

分期分布：PHASE2 86、NA（未标注/不适用）61、PHASE1 32、PHASE3 22、PHASE1|PHASE2 19、PHASE4 7、EARLY_PHASE1 5、PHASE2|PHASE3 4。

## 检索路径

与结直肠癌、卵巢癌资料包同一方法学：ClinicalTrials.gov API v2 直连（未走 MCP 在线适配器）；本地展平、去重、术语过滤、写入 SQLite。
采集脚本随胃癌项目版本化：`gastric-workbench/scripts/fetch-gastric-trials-2026.mjs`（支持 `--dry-run` 只报命中数）。采集为一次性全量，**未做增量更新机制**。

### 与结直肠癌资料包的两处口径差异（属改进，已在 manifest 记录）

1. **检索词由 1 组扩到 3 组**。单用 `gastric cancer` 会漏掉只写 GEJ / 胃食管交界腺癌的研究；实测三组并集去重后 256 条，比单组多 35 条。
2. **篮式研究判定改为「conditions 含泛化实体瘤词 且 同时列入 ≥1 个上消化道以外瘤种」**。原规则（conditions 里没有疾病特异词才算篮式）在本批数据上判出 0 条，与实际不符；现判出 13 条。食管癌（esophageal）**故意不算**"其它瘤种"——GEJ 研究常同时列入食管腺癌，属同一疾病域。

## 数据模型简述

`trial_records` 主要字段：`registry`、`registry_id`（NCT 号）、标题、官方标题、`first_posted`（首次公示日期）、开始/主要完成/最近更新日期、登记状态、研究类型、分期、疾病、干预、申办方、国家、入组人数、摘要、入排标准、`category`（disease-specific / basket）、来源 URL。未保留 PI 电话/邮箱等直接联系字段。

## 2026 年登记主题观察（仅描述登记研究，不构成疗效或推荐）

以下为主题词的近似命中统计（对 title + summary + conditions + interventions 做关键词匹配，同一研究可命中多个主题，**计数为量级参考不是精确分类**）：

| 主题 | 命中 | 占比 |
|---|---:|---:|
| 手术相关（surgery / resection / gastrectomy） | 88 | 37% |
| 围手术期（perioperative / neoadjuvant / adjuvant） | 71 | 30% |
| 辅助治疗 | 57 | 24% |
| HER2 | 43 | 18% |
| 新辅助 | 42 | 17% |
| PD-L1 / PD-1 | 31 | 13% |
| 细胞治疗（TCR-T / TIL / NK / 过继细胞） | 21 | 8% |
| 生活质量 / 患者报告结局 | 21 | 8% |
| 放疗 / 放化疗 | 20 | 8% |
| 营养与体重（nutrition / weight loss / sarcopenia / cachexia） | 19 | 8% |
| CLDN18.2 | 18 | 7% |
| VEGF / 抗血管生成 | 16 | 6% |
| 腹膜转移 | 13 | 5% |
| MSI / dMMR | 12 | 5% |
| 转化治疗 | 12 | 5% |
| 腹腔灌注（intraperitoneal / HIPEC / PIPAC） | 10 | 4% |
| 双抗 / 双靶点 | 7 | 2% |
| 影像 AI / 影像组学 | 6 | 2% |
| ADC | 5 | 2% |
| CAR-T | 5 | 2% |

结构性观察：本批登记里**围手术期与手术相关研究合计占比最高**（与中国胃癌高发、可切除人群基数大一致）；分子分层以 **HER2 与 PD-L1/PD-1 为主，CLDN18.2 已有一定密度**；**腹膜转移与腹腔灌注是一块独立且规模不小的登记活动**（含根治性手术 vs 非手术的对照、HIPEC 联合系统治疗等）；**营养与体重相关研究占 8%**，与工作台「进食与营养」模块的定位吻合。

> 药物层面的机制、阶段与已发布疗效数据**不在本资料包范围内**。若要做药物级梳理，须逐条回源取登记页原文与已发表文献，并另走临床审核。

## 2026 指南监测线索（地区适用边界不同，均需取得原文核验后才能用于产品解释）

- 中国 CSCO 胃癌指南 2026 版状态**未核验**；产品临床解释须核对中国适用指南全文与发布日期。
- NCCN Gastric Cancer 2026 版更新状态**未核验**。
- ESMO 胃癌相关指南 2026 更新状态**未核验**。

## 限制

1. 年份口径是"首次公示在 2026 年"，不是试验启动或结果发表年份。
2. 仅干预性研究；观察性研究未采集。
3. ChinaDrugTrials 与 ChiCTR 未采集，覆盖未知，**不能推断中国登记全量**——中国中心数（119 条）只反映 ClinicalTrials.gov 上标明中国站点的记录。
4. 试验登记不证明方案有效、安全、获批或正在开放入组；涉及具体患者应由专业团队结合病理、分期、既往治疗、分子结果判断，并回源核实状态与纳排标准。
5. 主题命中数为关键词近似统计，不等同于人工分类，不可作为"某方向有多少研究"的精确结论引用。
6. 该库未接入 `unified_search_trials` 在线 MCP 源注册表与胃癌工作台业务数据层；产品化需另做数据许可、同步/去重、版本管理与临床审核。
