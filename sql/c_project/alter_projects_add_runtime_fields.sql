-- 文件名：alter_projects_add_runtime_fields.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/04/10
-- 作用：给历史 Led_Projects 表补齐运行时依赖字段，避免编辑/发布时出现 Unknown column 错误

ALTER TABLE Led_Projects
  ADD COLUMN IF NOT EXISTS UpdateUserId INT DEFAULT NULL COMMENT '更新人ID' AFTER CreateUserName,
  ADD COLUMN IF NOT EXISTS UpdateUserName VARCHAR(100) DEFAULT NULL COMMENT '更新人用户名' AFTER UpdateUserId,
  ADD COLUMN IF NOT EXISTS UpdateTime DATETIME DEFAULT NULL COMMENT '更新时间' AFTER UpdateUserName,
  ADD COLUMN IF NOT EXISTS Visibility JSON NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users）' AFTER IsDelete;

UPDATE Led_Projects
SET Visibility = JSON_OBJECT('scope', 'all')
WHERE Visibility IS NULL;