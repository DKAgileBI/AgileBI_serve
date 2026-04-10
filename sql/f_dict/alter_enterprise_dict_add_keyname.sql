-- 文件名：alter_enterprise_dict_add_keyname.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 老库增量升级：enterprise_dict 增加 keyName 字段
-- 说明：若你的 enterprise_dict 已存在且不想 DROP 重建，可执行本脚本。

ALTER TABLE `enterprise_dict`
  ADD COLUMN `keyName` VARCHAR(255) NULL COMMENT '业务标识（可读可控，用于按 keyName 查询）' AFTER `dictKey`;

-- 唯一索引（允许多个 NULL）
ALTER TABLE `enterprise_dict`
  ADD UNIQUE KEY `uk_keyName` (`keyName`);
