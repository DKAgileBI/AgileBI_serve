-- 文件名：datasets_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 我的数据集（datasets）建表语句
-- 说明：visibility/requestGlobalConfig/request 使用 JSON 字段存储，保证与前端 RequestConfigType/RequestGlobalConfigType 结构一致。

DROP TABLE IF EXISTS datasets;

CREATE TABLE datasets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '数据集ID',
  ownerAccount VARCHAR(255) NOT NULL DEFAULT '' COMMENT '所属用户账号（visibility.scope=self 时用于权限判断）',
  name VARCHAR(255) NOT NULL COMMENT '名称',
  `desc` TEXT COMMENT '描述',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用(0/1)',
  IsDelete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除(0未删/1已删)',
  visibility JSON NOT NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users；company=字典value；companyLabel=字典label）',
  requestGlobalConfig JSON NULL COMMENT '全局请求配置（结构与前端一致）',
  request JSON NOT NULL COMMENT '请求配置（结构与前端一致）',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_isDelete (IsDelete),
  INDEX idx_enabled (enabled),
  INDEX idx_name (name),
  INDEX idx_ownerAccount (ownerAccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='我的数据集';
