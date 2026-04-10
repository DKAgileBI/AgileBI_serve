-- 文件名：templates_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 模板表（我的模板 / 公共模板）
-- 说明：
-- 1) visibility 使用 JSON 字段存储：{scope, company, companyLabel, users}
-- 2) scope: all/self/company/users
-- 3) scope=users 时，授权表 templates_user_permission 生效

DROP TABLE IF EXISTS led_templates;

CREATE TABLE led_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '模板ID',
  ownerAccount VARCHAR(255) NOT NULL DEFAULT '' COMMENT '创建人账号(users.account)',
  name VARCHAR(255) NOT NULL COMMENT '模板名称',
  `desc` TEXT COMMENT '模板描述',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用(0/1)',
  IsDelete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除(0未删/1已删)',
  visibility JSON NOT NULL COMMENT '可见性 {scope, company, companyLabel, users}',
  indexImage LONGTEXT NULL COMMENT '封面图(可选)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_isDelete (IsDelete),
  INDEX idx_enabled (enabled),
  INDEX idx_ownerAccount (ownerAccount),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板（我的模板/公共模板）';

DROP TABLE IF EXISTS led_template_datas;

CREATE TABLE led_template_datas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  templateId BIGINT NOT NULL COMMENT '模板ID(led_templates.id)',
  contentData LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '模板内容(JSON/大字段)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_templateId (templateId),
  INDEX idx_templateId (templateId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板内容表';
