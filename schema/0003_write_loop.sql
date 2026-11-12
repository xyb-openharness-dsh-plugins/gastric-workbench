/* 0003 · 写入闭环（新建患者 + 多用户记录 + 私密标记）
 *
 * 为什么不在 0001 里加：0001 已对外冻结（schema/freeze-contract.md 记了哈希），
 * 改历史迁移会让两台机器的库结构不一样。本文件只做追加式变更：
 *   1. subjects 追加 is_demo / created_on 两列（ALTER 只能加在末尾，生成器镜像同步写最后）；
 *   2. 新建 profile_facts（建档逐字段事实，按 (profile_key, fact_key) 唯一）；
 *   3. 新建 user_entries（用户自记条目：八类记录统一 JSON 落库 + 私密标记）。
 *
 * 语义约定：
 *   - is_demo：1 = 演示档案（播种写入）；0 = 用户自建（createProfile 写 0）。旧库升级时
 *     已有档案全部标 1（DEFAULT 1），与「旧库里只有演示数据」的事实一致，不回填猜测。
 *   - user_entries.data 是 JSON 字符串（形状由调用层约定），不拆列：八类记录字段差异大，
 *     拆成八张表会把「读模型还不知道形状」的问题搬到 schema 里；读侧按 kind 解析。
 *   - user_entries.id 由服务层合成（'user-' + 补零序号），前端拿它做私密寻址；
 *     id 与 rowid 的对应关系由服务层保证（见 dsh/workbench.js），不在 schema 里放 rowid。
 *
 * 与 0001 相同的约束：scripts/check-demo-columns 类检查会执行 schema/00*.sql 全部文件后
 * 与 demo/build-demo-data.mjs 的 CREATE TABLE 镜像逐列比对 —— 改这里必须同步改镜像。
 */

ALTER TABLE subjects ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subjects ADD COLUMN created_on TEXT;

/* 演示库 trials 表的条目统一标 fictional=1：标题是 2026 年真实登记方向的中文摘要，
   但本表只装演示数据，不与 research/ 快照混标（§1.2.9：虚构与真实不许混）。
   真实快照（research/gastric-cancer/，236 条）走 /api/trials 服务层透传。 */
ALTER TABLE trials ADD COLUMN fictional INTEGER NOT NULL DEFAULT 1;

/* 建档逐字段事实（createProfile 落库；空值跳过）。
   fact_order 保留排序位（录入顺序），读侧按它还原填写顺序。 */
CREATE TABLE profile_facts (
  profile_key TEXT NOT NULL,
  fact_key    TEXT NOT NULL,
  fact_value  TEXT,
  fact_order  INTEGER,
  PRIMARY KEY (profile_key, fact_key)
);

/* 用户自记条目：bleed / lab / treatment / question / hospital / report / doc / mind 八类。
   is_private 默认 0（不私密）；私密切换按 id 更新本列，历史不改写。 */
CREATE TABLE user_entries (
  id          TEXT PRIMARY KEY,
  profile_key TEXT,
  kind        TEXT,
  data        TEXT,             -- JSON 字符串（各 kind 的字段按服务层约定）
  is_private  INTEGER NOT NULL DEFAULT 0,
  created_on  TEXT
);

CREATE INDEX idx_user_entries_profile_kind ON user_entries (profile_key, kind);
