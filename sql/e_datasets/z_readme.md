# 📦 数据集表设计文档（datasets）

用于“我的数据集”模块，后端按前端契约原样存储/返回：

- `visibility` / `requestGlobalConfig` / `request` 均以 JSON 字段存储
- 返回的数据集结构可直接给前端组件使用（无需转换）

---

## ✅ 表名：`datasets`

### 字段说明

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT | 主键，自增 ID |
| `ownerAccount` | VARCHAR(255) | 所属用户账号（visibility.scope=self 时用于权限判断） |
| `name` | VARCHAR(255) | 数据集名称（必填） |
| `desc` | TEXT | 描述 |
| `enabled` | TINYINT(1) | 是否启用（0/1） |
| `IsDelete` | TINYINT(1) | 是否删除（0未删/1已删，假删） |
| `visibility` | JSON | 可见性：`{ scope, company, companyLabel, users }`（company=字典value；companyLabel=字典label） |
| `requestGlobalConfig` | JSON | 全局请求配置（与前端一致） |
| `request` | JSON | 请求配置（与前端一致；SQL 请求也放这里） |
| `createdAt` | DATETIME | 创建时间 |
| `updatedAt` | DATETIME | 更新时间 |

---

## ✅ 建表 SQL（MySQL）

见同目录 [datasets_table.sql](datasets_table.sql)

> 依赖 MySQL 5.7+ / 8.0+ 的 JSON 类型与 JSON_* 函数（本项目在可见性过滤处使用了 JSON_EXTRACT/JSON_CONTAINS）。

---

## ✅ 可见性规则（后端过滤）

- 所有人可见：`visibility.scope = all`
- 仅自己可见：`visibility.scope = self` 且 `ownerAccount = 当前登录账号`
- 企业可见：`visibility.scope = company` 且 `visibility.company = 当前用户 company`（建议 company 保存企业字典的 value；companyLabel 保存字典 label）
- 指定人：`visibility.scope = users` 且当前登录账号被绑定到权限表
- 管理员：可见所有

### ✅ 指定用户可见（推荐方案）

当 `visibility.scope = users` 时，后端使用表 `datasets_user_permission` 来判断用户是否有权限看到该数据集（适合 100-1000+ 绑定用户的场景，查询可走索引）。

建表 SQL：见同目录 [datasets_user_permission.sql](datasets_user_permission.sql)

---

## ✅ 删除规则（假删）

- 删除接口不会物理删除记录，而是设置 `IsDelete = 1`
- 列表/详情/更新/启用停用接口默认只处理 `IsDelete = 0` 的数据

---

## ✅ 接口列表（REST）

前缀：`/api`

- `GET /api/dkBi/datasets?page=1&pageSize=10&keyword=&enabled=&visibilityScope=&company=`：分页列表
- `GET /api/dkBi/datasets/public?page=1&pageSize=10&keyword=&enabled=&visibilityScope=&company=`：公共数据集分页列表（登录可查；仅 all/company/users，不包含 self）
- `GET /api/dkBi/datasets/{id}`：详情
- `GET /api/dkBi/datasets/public/{id}`：公共数据集详情（登录可查；仅 all/company/users，不包含 self）
- `POST /api/dkBi/datasets`：新增（当前实现：仅管理员）
- `PUT /api/dkBi/datasets/{id}`：编辑（全量，仅管理员）
- `PUT /api/dkBi/datasets/{id}/users`：绑定指定用户（后端内部/可选；仅管理员；会将 scope 设为 users 并覆盖保存 users；前端正常保存无需调用，新增/编辑会自动同步权限表）
- `PATCH /api/dkBi/datasets/{id}/enabled`：启用/停用（仅管理员）
- `DELETE /api/dkBi/datasets/{id}`：删除（仅管理员）
