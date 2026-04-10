# 🧩 模板表设计文档（templates）

用于“我的模板 / 公共模板”模块，以及“从项目复制为模板”。

- **我的模板**：默认仅创建者可见（`visibility.scope = self`）
- **公共模板**：按可见性规则 `all/company/users` 对外可见（需要登录）

---

## ✅ 表：`led_templates`

模板主表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| `id` | BIGINT | 主键，自增 |
| `ownerAccount` | VARCHAR(255) | 创建人账号（`users.account`） |
| `name` | VARCHAR(255) | 模板名称 |
| `desc` | TEXT | 模板描述 |
| `enabled` | TINYINT(1) | 启用状态（0/1） |
| `IsDelete` | TINYINT(1) | 逻辑删除（0未删/1已删） |
| `visibility` | JSON | 可见性：`{ scope, company, companyLabel, users }` |
| `indexImage` | LONGTEXT | 封面图（可选） |
| `createdAt` | DATETIME | 创建时间 |
| `updatedAt` | DATETIME | 更新时间 |

> `visibility.scope` 取值：`all/self/company/users`

---

## ✅ 表：`led_template_datas`

模板内容表（与模板主表 1:1，通过 `templateId` 唯一约束保证）。

| 字段名 | 类型 | 说明 |
|---|---|---|
| `templateId` | BIGINT | 模板ID（`led_templates.id`） |
| `contentData` | LONGTEXT | 模板内容（通常为 JSON 字符串/大字段） |

---

## ✅ 表：`templates_user_permission`

当 `visibility.scope = users` 时，用该表做“指定账号可见”的权限判断（便于走索引、适合绑定用户较多的场景）。

| 字段名 | 类型 | 说明 |
|---|---|---|
| `templateId` | BIGINT | 模板ID |
| `userAccount` | VARCHAR(255) | 被授权账号（`users.account`） |

唯一约束：`(templateId, userAccount)`

---

## ✅ 可见性规则（后端过滤口径）

- `scope = self`：仅创建者（`ownerAccount = 当前账号`）
- `scope = all`：所有登录用户可见
- `scope = company`：同企业可见（匹配当前用户 `users.company` 与 `visibility.company` / `visibility.companyLabel`）
- `scope = users`：指定账号可见（以 `templates_user_permission` 命中为准；`visibility.users` 主要用于前端回显）
- 管理员：可见/可维护全部（不含已删除）

---

## ✅ 建表 SQL（MySQL）

同目录：
- [templates_table.sql](templates_table.sql)
- [templates_user_permission.sql](templates_user_permission.sql)

---

## ✅ 业务约定（复制项目为模板）

后端接口 `POST /api/dkBi/templates/copyFromProject`：

- 读取 `Led_Projects` + `Led_Projectdatas.ContentData`
- 新建一条 `led_templates` + `led_template_datas`
- **复制后的模板默认 `visibility.scope = self`**（即“保存为我的模板”）
