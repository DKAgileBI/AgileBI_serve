# 数据库设计文档

## ✅ 表名：`menus`

### 字段说明：

| 字段名      | 类型         | 说明 |
|-------------|--------------|------|
| `id`        | BIGINT       | 主键，自增 ID |
| `parent_id` | BIGINT       | 父菜单 ID，顶级菜单为 0 |
| `label`     | VARCHAR(100) | 菜单名称（展示用） |
| `key`       | VARCHAR(100) | 父菜单的唯一标识（如 allProject） |
| `name`      | VARCHAR(100) | 路由名称（RouterLink.to.name） |
| `path`      | VARCHAR(200) | 前端路由路径（如 `/myproject`） |
| `icon`      | VARCHAR(100) | 图标名（如 DevicesIcon） |
| `sort`      | INT          | 排序字段，数字越小越靠前 |
| `is_hidden` | BOOLEAN      | 是否隐藏该菜单项 |
| `created_at`| DATETIME     | 创建时间 |
| `updated_at`| DATETIME     | 更新时间 |

---


## ✅ 建表语句（MySQL）

```sql
DROP TABLE IF EXISTS menus;

CREATE TABLE menus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  parent_id BIGINT DEFAULT 0 COMMENT '父菜单ID，顶级为0',
  label VARCHAR(100) NOT NULL COMMENT '菜单显示名称',
  `key` VARCHAR(100) DEFAULT NULL COMMENT '菜单唯一标识',
  name VARCHAR(100) DEFAULT NULL COMMENT '路由名称',
  path VARCHAR(200) DEFAULT NULL COMMENT '路由路径',
  icon VARCHAR(100) DEFAULT NULL COMMENT '图标',
  sort INT DEFAULT 0 COMMENT '排序',
  type VARCHAR(20) DEFAULT 'menu' COMMENT '菜单类型，值为menu或group',
  is_hidden BOOLEAN DEFAULT FALSE COMMENT '是否隐藏',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_key (`key`),
  INDEX idx_name (name)
) COMMENT='菜单表，支持分组group和普通菜单menu';

