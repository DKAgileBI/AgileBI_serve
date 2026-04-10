-- 文件名：alter_components_add_visibility.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 若你已经创建过 led_components 表，请执行本文件进行增量升级

-- 1) 增加 Visibility 字段（与 datasets.visibility 结构一致）
ALTER TABLE led_components
  ADD COLUMN Visibility JSON NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users；company=字典value；companyLabel=字典label）' AFTER IsDelete;

-- 2) 历史数据默认设为仅自己可见
UPDATE led_components
SET Visibility = JSON_OBJECT('scope','self')
WHERE Visibility IS NULL;

-- 3) 将 Visibility 调整为 NOT NULL（可选：若你确定历史数据已补齐）
-- ALTER TABLE led_components MODIFY COLUMN Visibility JSON NOT NULL;
