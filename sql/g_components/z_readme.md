# 🧩 组件库表设计文档（led_components）

用于存储用户自定义组件（我的组件）以及公开组件（公共组件）。

- **我的组件**：`IsPublic = 0` 且 `CreateUserId = 当前用户`
- **公共组件**：`IsPublic = 1`

---

## ✅ 表名：`led_components`

### 字段说明

| 字段名 | 类型 | 说明 |
|---|---|---|
| `Id` | INT UNSIGNED | 主键，自增，组件ID |
| `ComponentName` | VARCHAR(100) | 组件名称 |
| `ComponentDesc` | VARCHAR(500) | 组件描述 |
| `ComponentType` | VARCHAR(100) | 组件类型（服务端从 `ComponentData` 自动推导，如：柱状图/下拉选择器/组合控件） |
| `ComponentData` | LONGTEXT | 组件内容（建议存 JSON 字符串） |
| `PreviewImage` | VARCHAR(255) | 组件预览图（文件名/相对路径） |
| `IsPublic` | TINYINT(1) | 是否公开：0=我的组件，1=公共组件 |
| `IsDelete` | TINYINT(1) | 逻辑删除：0=未删除，1=已删除 |
| `Visibility` | JSON | 可见性（与“我的数据集”一致）scope: all/self/company/users |
| `CreateUserId` | INT UNSIGNED | 创建人用户ID（users.uid） |
| `CreateUserName` | VARCHAR(50) | 创建人账号（users.account） |
| `CreateTime` | DATETIME | 创建时间 |
| `UpdateUserId` | INT UNSIGNED | 更新人用户ID |
| `UpdateUserName` | VARCHAR(50) | 更新人账号 |
| `UpdateTime` | DATETIME | 更新时间 |

---

## ✅ 建表 SQL（MySQL）

见同目录文件：
- [components_table.sql](components_table.sql)

指定用户可见权限表：
- [components_user_permission.sql](components_user_permission.sql)

若你已建过表的增量升级：
- [alter_components_add_visibility.sql](alter_components_add_visibility.sql)
- [alter_components_add_component_type.sql](alter_components_add_component_type.sql)

---

## ✅ 业务约定

1. 前端上传预览图后，拿到返回的 `fileName`，在保存组件时作为 `previewImage` 传入。
2. 保存组件时只需要：
   - `componentName`
   - `componentDesc`（可选）
   - `componentData`（组件内容，建议 JSON 字符串）
   - `previewImage`（可选）
3. 组件可见性（与“我的数据集”完全一致）：
   - `visibility.scope = self`：仅自己可见
   - `visibility.scope = all`：所有人可见
   - `visibility.scope = company`：同企业可见（匹配当前用户 `users.company`）
   - `visibility.scope = users`：指定账号可见（同时会同步写入权限表 `components_user_permission`）
4. 当 `visibility.scope = users` 时：
   - 组件表 `Visibility.users` 仅作为前端回显
   - 权限判断以 `components_user_permission` 为准（与数据集一致）
5. 发布/取消发布只更新 `IsPublic`（是否上架到公共组件库），不等同于可见性。
6. 删除组件为逻辑删除：将 `IsDelete=1`，列表与详情默认过滤 `IsDelete=0`。
7. `ComponentType` 由服务端在保存/更新时根据 `componentData` 自动写入：
   - 组合组件（`isComposite=true` 或存在 `components` 数组）→ `组合控件`
   - 否则优先取 `component.chartConfig.title`（如：柱状图、下拉选择器）
