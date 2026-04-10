# 📧 邮箱验证码表（email_code）

用于注册流程的邮箱验证码发送与校验。

## ✅ 表名：`email_code`

### 字段说明

| 字段名 | 类型 | 说明 |
|---|---|---|
| `id` | BIGINT UNSIGNED | 主键，自增 |
| `email` | VARCHAR(255) | 邮箱 |
| `code_hash` | VARCHAR(255) | 验证码 hash（不存明文验证码） |
| `expire_at` | DATETIME | 过期时间 |
| `used` | TINYINT(1) | 是否已使用：0=未使用，1=已使用 |
| `created_at` | TIMESTAMP | 创建时间 |

### 索引

- `idx_email_created (email, created_at)`：用于限频（查最近发送时间）
- `idx_email_used_expire (email, used, expire_at)`：用于校验时快速过滤未使用/未过期

## ✅ 建表 SQL（MySQL）

见同目录：`email_code.sql`

```sql
CREATE TABLE IF NOT EXISTS email_code (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL COMMENT '邮箱',
  code_hash VARCHAR(255) NOT NULL COMMENT '验证码hash',
  expire_at DATETIME NOT NULL COMMENT '过期时间',
  used TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已使用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_email_created (email, created_at),
  INDEX idx_email_used_expire (email, used, expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮箱验证码表';
```

## ✅ 使用说明（注册流程）

1. 先调 `POST /api/dkBi/sys/email/sendCode` 发送验证码
2. 再调 `POST /api/dkBi/sys/register` 携带 `email` + `emailCode`
3. 服务端会校验验证码有效期与是否已使用，通过后才允许注册
