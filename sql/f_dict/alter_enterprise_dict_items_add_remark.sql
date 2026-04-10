-- 文件名：alter_enterprise_dict_items_add_remark.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 老库增量升级：enterprise_dict_items 增加 remark 字段
-- 说明：若你的 enterprise_dict_items 已存在且不想 DROP 重建，可执行本脚本。

ALTER TABLE `enterprise_dict_items`
  ADD COLUMN `remark` VARCHAR(500) NULL COMMENT '备注' AFTER `itemValue`;

-- 回填（若 itemData 里有 remark/desc/description，可按需自行补充；默认不强制回填）
