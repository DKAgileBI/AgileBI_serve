-- 文件名：templates_user_permission.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 模板-指定用户可见（templates_user_permission）建表语句
-- 说明：当 led_templates.visibility.scope = 'users' 时，使用该表判断用户是否有权限看到模板

DROP TABLE IF EXISTS templates_user_permission;

CREATE TABLE templates_user_permission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  templateId BIGINT NOT NULL COMMENT '模板ID(led_templates.id)',
  userAccount VARCHAR(255) NOT NULL COMMENT '用户账号(users.account)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_template_user (templateId, userAccount),
  INDEX idx_templateId (templateId),
  INDEX idx_userAccount (userAccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板-指定用户可见权限';
