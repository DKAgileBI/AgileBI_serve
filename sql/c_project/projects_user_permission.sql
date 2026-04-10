-- 文件名：projects_user_permission.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 说明：当 Led_Projects.Visibility.scope = 'users' 时，使用该表判断指定账号是否有权限看到项目

DROP TABLE IF EXISTS projects_user_permission;

CREATE TABLE projects_user_permission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL COMMENT '项目ID（Led_Projects.Id）',
  userAccount VARCHAR(255) NOT NULL COMMENT '被授权可见的账号（users.account）',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_project_user (projectId, userAccount),
  KEY idx_userAccount (userAccount),
  KEY idx_projectId (projectId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目指定用户可见授权表（Visibility.scope=users）';
