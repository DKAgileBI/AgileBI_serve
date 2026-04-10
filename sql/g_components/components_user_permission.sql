-- 文件名：components_user_permission.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 组件-指定用户可见（components_user_permission）建表语句
-- 说明：当 led_components.Visibility.scope = 'users' 时，使用该表判断用户是否有权限看到组件

DROP TABLE IF EXISTS components_user_permission;

CREATE TABLE components_user_permission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  componentId BIGINT NOT NULL COMMENT '组件ID(led_components.Id)',
  userAccount VARCHAR(255) NOT NULL COMMENT '用户账号(users.account)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_component_user (componentId, userAccount),
  INDEX idx_componentId (componentId),
  INDEX idx_userAccount (userAccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组件-指定用户可见权限';
