-- 文件名：alter_enterprise_dict_add_remark.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 老库增量升级：enterprise_dict 增加 remark 字段
-- 说明：若你的 enterprise_dict 已存在且不想 DROP 重建，可执行本脚本。

ALTER TABLE `enterprise_dict`
  ADD COLUMN `remark` VARCHAR(500) NULL COMMENT '备注' AFTER `desc`;
