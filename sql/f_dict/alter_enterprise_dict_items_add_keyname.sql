-- 文件名：alter_enterprise_dict_items_add_keyname.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 老库增量升级：enterprise_dict_items 增加 keyName 字段
-- 说明：若你的 enterprise_dict_items 已存在且不想 DROP 重建，可执行本脚本。

ALTER TABLE `enterprise_dict_items`
  ADD COLUMN `keyName` VARCHAR(255) NULL COMMENT '业务标识（冗余字段；用于按 keyName 直接查询字典项）' AFTER `dictId`;

ALTER TABLE `enterprise_dict_items`
  ADD INDEX `idx_keyName` (`keyName`);

ALTER TABLE `enterprise_dict_items`
  ADD INDEX `idx_keyName_isDelete` (`keyName`, `IsDelete`);

-- 回填历史数据（若主表已有 keyName，则同步到子表）
UPDATE enterprise_dict_items i
JOIN enterprise_dict d ON d.id = i.dictId
SET i.keyName = d.keyName
WHERE (i.keyName IS NULL OR i.keyName = '')
  AND d.keyName IS NOT NULL
  AND d.keyName <> '';
