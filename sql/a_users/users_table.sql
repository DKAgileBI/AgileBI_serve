-- 文件名：users_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 用户表设计（含 sessionVersion 字段）
CREATE TABLE users (
    uid             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户唯一ID',
    username        VARCHAR(50) NOT NULL COMMENT '用户名',
    account         VARCHAR(50) UNIQUE NOT NULL COMMENT '用户账号',
    phone           VARCHAR(20) UNIQUE COMMENT '手机号',
    email           VARCHAR(100) UNIQUE COMMENT '邮箱',
    password        VARCHAR(255) NOT NULL COMMENT '密码哈希值',
    avatar          VARCHAR(255) COMMENT '头像URL',
    remark          TEXT COMMENT '备注',
    role            TEXT COMMENT '角色',
    gender          TINYINT(1) DEFAULT 0 COMMENT '性别 (0: 未知, 1: 男, 2: 女)',
    company         VARCHAR(100) COMMENT '公司名称',
    sessionVersion  VARCHAR(50) DEFAULT NULL COMMENT '会话版本',
    enabled         TINYINT(1) DEFAULT 0 COMMENT '是否启用 (0: 未启用, 1: 启用)',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';



-- 插入示例数据
INSERT INTO users (
    username, account, phone, email, password, avatar, remark, role, gender, company, sessionVersion
)
VALUES
('Admin', 'admin', '13800000000', 'admin@example.com',
 MD5('admin123456789'),
 '',
 '超级管理员', '超级管理员', 1, 'demo', NULL),
('DemoUser', 'demo_user', '13900000000', 'user@example.com',
 MD5('admin123456789'),
 '',
 '普通用户', '普通用户', 2, 'demo', NULL);
