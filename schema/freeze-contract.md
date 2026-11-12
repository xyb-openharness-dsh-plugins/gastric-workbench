# 迁移冻结合同（小胃宝 Stompal）

`schema/` 下的迁移一旦对外发布就不许再改：改历史迁移 = 两台机器的库结构不一样 = 数据不可复现。
本文件记每个迁移文件的 sha256，由 `npm run check` 里的 `scripts/check-schema.mjs` 逐条比对。

要改结构：**新增** `NNNN_name.sql`，并把新文件与哈希追加到下表的末尾。改旧文件会被检查拦下。

| 文件 | sha256 |
| --- | --- |
| `0001_initial.sql` | f5c6bac8e15726d22ddb5ed95b00124c033c8f4eb60b7d2f81a79209560e7e7d |
| `0003_write_loop.sql` | 44a16440803118f5009aa12aa8db5de73f6cb1bd21663be2c7aa78984d6e3cc9 |

## 0003 的内容边界

写入闭环（0.1.4）三件事，全部只增不改：

- `subjects` 追加 `is_demo INTEGER NOT NULL DEFAULT 1` 与 `created_on TEXT`（ALTER 追加到末尾，
  生成器镜像同步写在最后）。旧库升级时已有档案全部标 1（DEFAULT 1）——旧库里只有播种的演示
  数据，这样标不回填猜测；`createProfile` 新建的档案写 `is_demo=0`。
- `trials` 追加 `fictional INTEGER NOT NULL DEFAULT 1`：演示库的 10 条试验条目统一标虚构示例
  （§1.2.9 最少改动方案：保留现有 10 条并逐条加 fictional 标记，UI 标注「演示示例」；
  真实快照（research/gastric-cancer/ 236 条）走 /api/trials 服务层透传，两者不混标）。
- 新建 `profile_facts(profile_key, fact_key, fact_value, fact_order, PK(profile_key,fact_key))`：
  建档逐字段事实，空值跳过不落行。
- 新建 `user_entries(id TEXT PRIMARY KEY, profile_key, kind, data, is_private, created_on)` +
  `(profile_key, kind)` 索引：用户自记条目统一 JSON 落库（data 列），八类 kind 由服务层白名单校验；
  私密切换按 id 更新 `is_private`，不改写历史。`id` 由服务层合成（`user-` + 补零序号）。

`demo/build-demo-data.mjs` 的 CREATE TABLE 镜像会同步 subjects 两列 + 两张新表：
改这里必须同步改镜像。
