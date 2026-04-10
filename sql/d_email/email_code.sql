-- 文件名：email_code.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 邮箱验证码表（用于注册邮箱验证）
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
