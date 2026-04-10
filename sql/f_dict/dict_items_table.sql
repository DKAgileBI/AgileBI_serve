-- 文件名：dict_items_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 通用字典-字典项（enterprise_dict_items）建表语句
-- 说明：
-- 1) 一个 enterprise_dict 代表一份通用字典（dictKey 为后端生成的唯一标识）
-- 2) enterprise_dict_items 存该字典类型下的“数组项/字典项”，支持单项增删改查/排序/启停（后续可扩展接口）

DROP TABLE IF EXISTS enterprise_dict_items;

CREATE TABLE enterprise_dict_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '字典项ID',
  dictId BIGINT NOT NULL COMMENT '字典ID(enterprise_dict.id)',
  keyName VARCHAR(255) DEFAULT NULL COMMENT '业务标识（冗余字段；用于按 keyName 直接查询字典项）',
  itemKey VARCHAR(255) DEFAULT NULL COMMENT '字典项key（可选，比如 value/code）',
  itemLabel VARCHAR(255) DEFAULT NULL COMMENT '字典项label（可选，比如 label/name）',
  itemValue VARCHAR(255) DEFAULT NULL COMMENT '字典项value（可选，字符串化）',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  itemData JSON NOT NULL COMMENT '字典项完整数据(JSON，建议对象/数组元素)',
  sort INT NOT NULL DEFAULT 0 COMMENT '排序(越大越靠前/或按你前端习惯)',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用(0/1)',
  IsDelete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除(0未删/1已删)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_dictId (dictId),
  INDEX idx_keyName (keyName),
  INDEX idx_dictId_isDelete (dictId, IsDelete),
  INDEX idx_keyName_isDelete (keyName, IsDelete),
  INDEX idx_enabled (enabled),
  INDEX idx_isDelete (IsDelete)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通用字典-字典项';
