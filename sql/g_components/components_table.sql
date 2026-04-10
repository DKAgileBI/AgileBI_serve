-- 文件名：components_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 组件库表（我的组件 / 公共组件）
-- 表名：led_components

CREATE TABLE IF NOT EXISTS led_components (
  Id            INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '组件ID',
  ComponentName VARCHAR(100) NOT NULL COMMENT '组件名称',
  ComponentDesc VARCHAR(500) DEFAULT NULL COMMENT '组件描述',
  ComponentType VARCHAR(100) DEFAULT NULL COMMENT '组件类型（服务端从 ComponentData 自动推导，如：柱状图/下拉选择器/组合控件）',
  ComponentData LONGTEXT     DEFAULT NULL COMMENT '组件内容（建议存 JSON 字符串）',
  PreviewImage  VARCHAR(255) DEFAULT NULL COMMENT '组件预览图文件名/相对路径',
  IsPublic      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否公开：0=我的组件，1=公共组件',
  IsDelete      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否删除：0=未删除，1=已删除',

  Visibility    JSON         NOT NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users；company=字典value；companyLabel=字典label）',

  CreateUserId   INT UNSIGNED DEFAULT NULL COMMENT '创建人用户ID（users.uid）',
  CreateUserName VARCHAR(50)  DEFAULT NULL COMMENT '创建人账号（users.account）',
  CreateTime     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  UpdateUserId   INT UNSIGNED DEFAULT NULL COMMENT '更新人用户ID（users.uid）',
  UpdateUserName VARCHAR(50)  DEFAULT NULL COMMENT '更新人账号（users.account）',
  UpdateTime     DATETIME     DEFAULT NULL COMMENT '更新时间',

  PRIMARY KEY (Id),
  KEY idx_components_owner (CreateUserId, IsDelete),
  KEY idx_components_public (IsPublic, IsDelete),
  KEY idx_components_type (ComponentType),
  KEY idx_components_time (CreateTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组件库（我的组件/公共组件）';
