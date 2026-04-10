# 👤 用户表设计文档（users）

用于存储系统用户信息，包括账号、手机号、邮箱、密码哈希等，同时包含会话版本字段 `sessionVersion` 用于登录状态控制。

---

## ✅ 表名：`users`

### 字段说明：

| 字段名          | 类型            | 说明 |
|-----------------|-----------------|------|
| `uid`           | INT UNSIGNED    | 主键，自增，用户唯一 ID |
| `username`      | VARCHAR(50)     | 用户名（昵称） |
| `account`       | VARCHAR(50)     | 登录账号，唯一 |
| `phone`         | VARCHAR(20)     | 手机号，唯一 |
| `email`         | VARCHAR(100)    | 邮箱，唯一 |
| `password`      | VARCHAR(255)    | 密码哈希（建议使用 bcrypt） |
| `avatar`        | VARCHAR(255)    | 头像 URL |
| `remark`        | TEXT            | 用户备注信息 |
| `role`          | TEXT            | 用户角色信息 |
| `gender`        | TINYINT(1)      | 性别：0=未知，1=男，2=女 |
| `company`       | VARCHAR(100)    | 公司名称 |
| `sessionVersion`| VARCHAR(50)     | 会话版本（用于强制下线） |
| `enabled`       | TINYINT(1)      | 是否启用：0=未启用，1=启用 |
| `created_at`    | TIMESTAMP       | 创建时间（默认当前） |
| `updated_at`    | TIMESTAMP       | 更新时间（自动更新） |

---

## ✅ 建表 SQL（MySQL）

```sql
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
