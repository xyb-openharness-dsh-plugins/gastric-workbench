-- 0001_initial.sql · 小胃宝 Stompal 胃癌工作台（slice 1）
--
-- 来源：`demo/build-demo-data.mjs` 里那份 CREATE TABLE 清单。列顺序与类型逐条照抄，
-- 保证生成器里的 INSERT（含按位置写的那几条）与本文件一一对应；改一处就要改两处。
--
-- 与生成器唯一的结构差异是刻意的，改前先看：
-- `schema_migrations` 是迁移台账，生成器不管它，只有 dsh/store.js 的 migrate() 用
-- CREATE TABLE IF NOT EXISTS 建（台账必须先于迁移存在，写在迁移里会"自己建自己"）。
--
-- 与样板（结直肠癌）的差异：肠癌的 stoma_diary / lars / resect_rows / lynch_rows /
-- nutrition_notes 五张表换成胃癌的 resection_rows / meal_log / dumping_rows /
-- supplement_rows / peritoneal_rows / endoscopy_rows / hp_rows 七张表。
--
-- 排序：`events` 没有 ord 列（生成器原本就没写），读取时按 rowid 升序，与插入顺序一致；
-- 其余「一组多行」的表都按 ord 升序。**复合主键表裸 SELECT * 会按索引字母序返回，
-- 必须显式 ORDER BY rowid**（metrics 是 (profile_key, key) 复合主键，踩过一次）。

CREATE TABLE subjects (
  profile_key         TEXT PRIMARY KEY,
  name                TEXT,
  sex                 TEXT,
  age                 INTEGER,
  meta                TEXT,
  headline            TEXT,
  stage               TEXT,
  mindset             TEXT,
  dash_keys           TEXT,
  path                TEXT,
  activity            TEXT,
  family_talk         TEXT,
  hp_title            TEXT,
  resection_title    TEXT,
  perioperative_title TEXT,
  peritoneal_title   TEXT,
  endoscopy_title    TEXT,
  pathology_title    TEXT,
  pathology_status   TEXT
);

CREATE TABLE metrics (
  profile_key TEXT,
  key         TEXT,
  name        TEXT,
  unit        TEXT,
  cat         TEXT,
  color       TEXT,
  dec         INTEGER,
  kind        TEXT,
  band_low    REAL,
  band_high   REAL,
  note        TEXT,
  PRIMARY KEY (profile_key, key)
);

CREATE TABLE metric_points (
  profile_key TEXT,
  metric_key  TEXT,
  d           TEXT,
  v_num       REAL,
  v_text      TEXT,
  src         TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, metric_key, d, ord)
);

-- 标志物档案：四项（HER2 / PD-L1 CPS / MSI / CLDN18.2）各自一行、各自状态。
-- state 四态：ok 已检测 / na 未检测 / warn 需关注 / pending 待出。
-- SPEC A1：未检测不得补「阴性」——na 的 v 一律写「未检测」，不写「阴性」。
CREATE TABLE molecular (
  profile_key TEXT,
  k           TEXT,
  v           TEXT,
  src         TEXT,
  state       TEXT,
  note        TEXT,
  ord         INTEGER
);

CREATE TABLE events (
  profile_key TEXT,
  d           TEXT,
  label       TEXT
);

CREATE TABLE rhythm (
  profile_key TEXT,
  item        TEXT,
  freq        TEXT,
  guideline   TEXT,
  next        TEXT,
  ord         INTEGER
);

CREATE TABLE cycles (
  profile_key TEXT,
  name        TEXT,
  date        TEXT,
  drugs       TEXT,
  status      TEXT,
  done        INTEGER,
  ord         INTEGER
);

CREATE TABLE treatment_lines (
  profile_key TEXT,
  name        TEXT,
  detail      TEXT,
  done        INTEGER,
  ord         INTEGER
);

-- 围手术期方案（SPEC A7）：phase 只取「术前 / 术后 / 未手术」，阶段标签不省略。
CREATE TABLE perioperative_rows (
  profile_key TEXT,
  phase       TEXT,
  name        TEXT,
  window      TEXT,
  detail      TEXT,
  note        TEXT,
  ord         INTEGER
);

-- 切除方式档案（SPEC A3）：kind 四选一（全胃 / 近端 / 远端 / ESD）+ 手术日期 + 机构。
CREATE TABLE resection_rows (
  profile_key TEXT,
  d           TEXT,
  kind        TEXT,
  extent      TEXT,
  recon       TEXT,
  institution TEXT,
  note        TEXT,
  ord         INTEGER
);

-- 进食记录（SPEC A4）：只记餐次、份量与症状标记，没有任何处理建议列——
-- 加"应对方法"这类列就等于把产品立场写进表结构里。
CREATE TABLE meal_log (
  profile_key TEXT,
  d           TEXT,
  slot        TEXT,
  portion     TEXT,
  foods       TEXT,
  symptoms    TEXT,
  note        TEXT,
  ord         INTEGER
);

CREATE TABLE dumping_rows (
  profile_key TEXT,
  d           TEXT,
  slot        TEXT,
  onset       TEXT,
  symptoms    TEXT,
  severity    TEXT,
  note        TEXT,
  ord         INTEGER
);

-- 补充剂（SPEC A5）：order_text 存医嘱原文，没有剂量推荐列、没有品牌列。
CREATE TABLE supplement_rows (
  profile_key TEXT,
  item        TEXT,
  order_text  TEXT,
  start       TEXT,
  end         TEXT,
  source      TEXT,
  ord         INTEGER
);

-- 腹膜转移与腹腔治疗：detail（做了什么）与 imaging（影像原文）分列，不合并成一格。
CREATE TABLE peritoneal_rows (
  profile_key TEXT,
  d           TEXT,
  kind        TEXT,
  detail      TEXT,
  imaging     TEXT,
  note        TEXT,
  ord         INTEGER
);

CREATE TABLE endoscopy_rows (
  profile_key TEXT,
  d           TEXT,
  kind        TEXT,
  finding     TEXT,
  next        TEXT,
  note        TEXT,
  ord         INTEGER
);

-- Hp 与家族史：只记录安排与原文，不做根除建议——所以表里没有"处理建议"列。
CREATE TABLE hp_rows (
  profile_key TEXT,
  d           TEXT,
  item        TEXT,
  note        TEXT,
  ord         INTEGER
);

CREATE TABLE viewpoints (
  profile_key TEXT,
  d           TEXT,
  mood        TEXT,
  text        TEXT,
  ord         INTEGER
);

-- 试验演示行：真实登记摘录。登记状态不是入组资格，页面必须带免责。
CREATE TABLE trials (
  nct_id   TEXT PRIMARY KEY,
  title    TEXT,
  phase    TEXT,
  status   TEXT,
  sponsor  TEXT,
  url      TEXT
);

CREATE TABLE demo_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);

CREATE TABLE documents (
  profile_key TEXT,
  id          TEXT,
  name        TEXT,
  date        TEXT,
  type        TEXT,
  status      TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, id)
);

CREATE TABLE candidate_fields (
  profile_key TEXT,
  id          TEXT,
  name        TEXT,
  value       TEXT,
  source      TEXT,
  status      TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, id)
);

-- kind 取 'row'（已核实的病理条目）或 'gap'（缺项）。缺项单列，不与已核实条目混排。
CREATE TABLE pathology_rows (
  profile_key TEXT,
  kind        TEXT,
  a           TEXT,
  b           TEXT,
  ord         INTEGER
);

-- 迁移台账 schema_migrations 不在这里建：它由 dsh/store.js 的 migrate() 在跑任何迁移之前
-- 用 CREATE TABLE IF NOT EXISTS 建好（台账必须先于迁移存在，写在迁移里会"自己建自己"）。
-- 本文件只负责业务表。

CREATE INDEX idx_points ON metric_points (profile_key, metric_key);
