-- 文件名：alter_projects_add_visibility.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 项目权限升级（与 datasets/templates/components 的 visibility 模型一致）
-- 目标：给 Led_Projects 增加 Visibility JSON 字段（scope: all/self/company/users）

-- 1) 增加 Visibility 字段（允许先为 NULL，便于线上平滑升级）
ALTER TABLE Led_Projects
  ADD COLUMN Visibility JSON NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users；company=字典value；companyLabel=字典label）' AFTER IsDelete;

-- 2) 填充历史数据默认 all（所有人可见）
UPDATE Led_Projects
SET Visibility = JSON_OBJECT('scope', 'all')
WHERE Visibility IS NULL;

-- 3) （可选）若你确认历史数据均补齐，可改为 NOT NULL
-- ALTER TABLE Led_Projects MODIFY COLUMN Visibility JSON NOT NULL;
