-- 文件名：datasets_user_permission.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 数据集-指定用户可见（datasets_user_permission）建表语句
-- 说明：
-- 1) 当 visibility.scope = 'users' 时，使用该表判断用户是否有权限看到数据集
-- 2) 用 datasetId + userAccount 建立唯一约束，避免重复绑定

DROP TABLE IF EXISTS datasets_user_permission;

CREATE TABLE datasets_user_permission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  datasetId BIGINT NOT NULL COMMENT '数据集ID(datasets.id)',
  userAccount VARCHAR(255) NOT NULL COMMENT '用户账号(users.account)',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dataset_user (datasetId, userAccount),
  INDEX idx_datasetId (datasetId),
  INDEX idx_userAccount (userAccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据集-指定用户可见权限';
