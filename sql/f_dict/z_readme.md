# 🧾 通用字典表设计文档（enterprise_dict）

用于系统“通用字典”管理（增删改查）。
字典通过后端生成的 `dictKey` 作为唯一标识。

---

## ✅ 表名：`enterprise_dict`

> 说明：一条记录表示一份“通用字典”，用 `dictKey` 唯一定位（后端生成，前端不允许传）。

### 字段说明

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT | 主键，自增 ID |
| `dictName` | VARCHAR(255) | 字典名称 |
| `dictKey` | VARCHAR(255) | 字典唯一标识（后端生成；用于查询参数 `dictKey`） |
| `keyName` | VARCHAR(255) | 业务标识（可读可控；用于查询参数 `keyName`） |
| `desc` | TEXT | 描述 |
| `remark` | VARCHAR(500) | 备注 |
| `dictData` | JSON | 字典内容（建议数组，例如 `[{"label":"启用","value":1}]`） |
| `company` | VARCHAR(100) | 企业标识（默认 dk） |
| `enabled` | TINYINT(1) | 是否启用（0/1） |
| `IsDelete` | TINYINT(1) | 是否删除（0未删/1已删，假删） |
| `createdAt` | DATETIME | 创建时间 |
| `updatedAt` | DATETIME | 更新时间 |

---

## ✅ 建表 SQL

见同目录 [dict_table.sql](dict_table.sql)

---

## ✅ 子表：`enterprise_dict_items`

> 说明：用于存放某个字典下的“数组项/字典项”，让字典真正变成可维护的数组。

### 字段说明（核心）

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT | 字典项ID |
| `dictId` | BIGINT | 关联字典ID（enterprise_dict.id） |
| `keyName` | VARCHAR(255) | 业务标识（冗余字段；用于按 keyName 直接查询字典项） |
| `itemKey/itemLabel/itemValue` | VARCHAR | 常用字段抽取（可选，便于筛选/索引） |
| `remark` | VARCHAR(500) | 备注（可选；会从 itemData 的 `remark/desc/description` 抽取写入） |
| `itemData` | JSON | 字典项完整数据（数组元素） |
| `sort` | INT | 排序 |
| `enabled` | TINYINT(1) | 是否启用 |
| `IsDelete` | TINYINT(1) | 假删 |

> 说明：前端在新增/修改字典时，`dictData` 数组的每个元素都可以直接带 `remark` 字段，例如：
> `[{"label":"德开","value":"1","remark":"备注"}]`

建表 SQL：见同目录 [dict_items_table.sql](dict_items_table.sql)

## ✅ 老库升级（ALTER 脚本）

如果你是老库（表已存在，不想 DROP 重建），可执行：

- `alter_enterprise_dict_add_keyname.sql`：主表 enterprise_dict 增加 keyName
- `alter_enterprise_dict_items_add_keyname.sql`：子表 enterprise_dict_items 增加 keyName
- `alter_enterprise_dict_add_remark.sql`：主表 enterprise_dict 增加 remark
- `alter_enterprise_dict_items_add_remark.sql`：子表 enterprise_dict_items 增加 remark

---

## ✅ 接口（/api/dkBi/sys/ 风格）

- `POST /api/dkBi/sys/dict/create`：新增字典（管理员；`dictKey` 后端生成，前端不允许传）
- `POST /api/dkBi/sys/dict/update`：修改字典（管理员；`dictKey` 不允许修改，前端不允许传）
- `POST /api/dkBi/sys/dict/delete`：删除字典（假删，管理员）
- `GET /api/dkBi/sys/dict/getData?dictId=1`：根据字典ID查询字典（公开接口，不需要 token）
- `GET /api/dkBi/sys/dict/getData?dictKey=xxx`：根据字典唯一标识查询字典（公开接口，不需要 token）
- `GET /api/dkBi/sys/dict/getData?keyName=xxx`：根据业务标识查询字典（公开接口，不需要 token）
- `GET /api/dkBi/sys/dict/items?keyName=xxx`：根据业务标识直接查询字典项数组（公开接口，不需要 token）
- `GET /api/dkBi/sys/dict/list?page=1&pageSize=10&keyword=xx`：字典列表分页查询（公开接口，不需要 token）

---

## ✅ 规则

- 查询默认只查 `IsDelete = 0`
- 删除为假删：设置 `IsDelete = 1`
- 字典标识 `dictKey` 由后端生成（前端不允许传入）
- `getData` 为公开接口：任何人可查，不需要 token
- 公开查询（不带 token）仅返回 `enabled = 1` 的字典与字典项
- 如果携带管理员 token（Authorization），`getData/list` 可查询到禁用的数据（便于后台管理）

> 重要：

> - `enterprise_dict_items` 是字典数组项的权威存储。
> - 接口返回的 `data.dictData` 将从 `enterprise_dict_items` 组装为数组。
