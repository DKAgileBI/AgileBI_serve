-- 文件名：dict_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 通用字典（enterprise_dict）建表语句
-- 说明：
-- 1) dictKey 为后端生成的唯一标识（前端不允许传）
-- 2) 字典项数组建议落在 enterprise_dict_items 表；dictData 可作为整包冗余/兼容字段

DROP TABLE IF EXISTS enterprise_dict;

CREATE TABLE enterprise_dict (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '字典ID',
  dictName VARCHAR(255) NOT NULL COMMENT '字典名称',
  dictKey VARCHAR(255) NOT NULL COMMENT '字典唯一标识（后端生成，建议全局唯一）',
  keyName VARCHAR(255) DEFAULT NULL COMMENT '业务标识（可读可控，用于按 keyName 查询）',
  `desc` TEXT COMMENT '描述',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  dictData JSON NOT NULL COMMENT '字典内容(JSON，整包冗余/兼容；推荐使用 enterprise_dict_items 存字典项数组)',
  company VARCHAR(100) DEFAULT 'dk' COMMENT '企业标识',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用(0/1)',
  IsDelete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除(0未删/1已删)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dictKey (dictKey),
  UNIQUE KEY uk_keyName (keyName),
  INDEX idx_company (company),
  INDEX idx_enabled (enabled),
  INDEX idx_isDelete (IsDelete)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通用字典';
