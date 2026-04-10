# 数据库设计文档

## ✅ 表名：`Led_Projects`

### 表说明：
用于存储 LED 项目的基础信息，包括项目名称、状态、可见性权限（visibility）、创建者信息、封面图及备注等。  
此表主要服务于项目看板模块。

---

### 字段说明：

| 字段名              | 类型           | 说明 |
|---------------------|----------------|------|
| `Id`                | INT            | 主键，自增 ID |
| `ProjectName`       | LONGTEXT       | 项目名称 |
| `State`             | INT            | 状态（例如-1未发布1发布） |
| `CreateTime`        | DATETIME(6)    | 创建时间（业务创建时间） |
| `CreateUserId`      | INT            | 创建人 ID |
| `CreateUserName`    | VARCHAR(100)   | 创建人用户名 |
| `CreateUserRole`    | VARCHAR(50)    | 创建人角色（如管理员、普通用户） |
| `Visibility`        | JSON           | 可见性：`{ scope, company, companyLabel, users }`，其中 `scope` 取值：`all/self/company/users` |
| `IsDelete`          | INT            | 是否删除（0=否，1=是） |
| `IndexImage`        | LONGTEXT       | 封面图 URL |
| `Remarks`           | LONGTEXT       | 备注信息 |
| `created_at`        | DATETIME       | 数据创建时间（数据库自动维护） |
| `updated_at`        | DATETIME       | 数据更新时间（数据库自动维护） |

---

## ✅ 权限模型（与 datasets/templates/components 一致）

- `scope = self`：仅创建者可见（默认值）
- `scope = all`：所有人可见（允许未登录查看已发布项目）
- `scope = company`：同企业可见（匹配当前用户 `users.company` 与 `Visibility.company / Visibility.companyLabel`）
- `scope = users`：指定账号可见（以授权表 `projects_user_permission` 命中为准；`Visibility.users` 主要用于前端回显）

> 注意：当前服务端实现中，“未发布项目（State=-1）”仍保持仅创建者/管理员可在编辑模式查看；已发布项目才按 `Visibility` 进行公共可见性控制。

---

## ✅ 授权表：`projects_user_permission`

当 `Visibility.scope = users` 时，后端使用该表判断用户是否有权限查看项目（适合绑定用户较多的场景，查询可走索引）。

字段：
- `projectId`：项目 ID（Led_Projects.Id）
- `userAccount`：被授权账号（users.account）

---

## ✅ 建表语句（MySQL）

```sql
DROP TABLE IF EXISTS `Led_Projects`;

CREATE TABLE `Led_Projects` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `ProjectName` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '项目名称',
  `State` int NOT NULL COMMENT '状态-1未发布1发布',
  `CreateTime` datetime(6) DEFAULT NULL COMMENT '创建时间',
  `CreateUserId` int DEFAULT NULL COMMENT '创建人ID',
  `CreateUserName` varchar(100) DEFAULT NULL COMMENT '创建人用户名',
  `CreateUserRole` varchar(50) DEFAULT NULL COMMENT '创建人角色',
  `PermissionLevel` int DEFAULT 0 COMMENT '权限级别(0公开,1组内,2仅本人,3自定义)',
  `PermissionUsers` json DEFAULT NULL COMMENT '自定义权限用户ID列表(JSON数组)',
  `IsDelete` int NOT NULL COMMENT '是否删除(0否,1是)',
  `IndexImage` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '封面图',
  `Remarks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '备注',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`Id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='LED项目表';
```

---

## ✅ 索引与约束

| 索引类型 | 字段 | 说明 |
|-----------|-------|------|
| 主键索引 | `Id` | 唯一标识每条记录 |

---

## ✅ 设计备注

- 表采用 `utf8mb4` 字符集以支持 Emoji 和多语言字符。  
- 权限控制字段 `Visibility` 用于控制“已发布项目”的可见性（all/self/company/users）。  
- 软删除逻辑通过 `IsDelete` 字段实现。  
- 若启用 `scope=users`，请创建 `projects_user_permission` 并保证 `(projectId,userAccount)` 唯一索引存在。



# 🧾 数据库设计文档

## ✅ 表名：`Led_Projectdatas`

### 表说明：
用于存储 LED 项目的 **具体内容数据**，例如页面配置、组件数据、布局信息、版本记录等。  
此表与 `Led_Projects` 表通过 `ProjectId` 建立关联，是项目内容的承载表。  

---

### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Id` | INT | 主键，自增 ID |
| `ProjectId` | INT | 关联项目 ID（对应 `Led_Projects.Id`） |
| `ContentData` | LONGTEXT | 项目内容数据（JSON、配置文件、页面结构等） |

---

## ✅ 建表语句（MySQL）

```sql
DROP TABLE IF EXISTS `Led_Projectdatas`;
CREATE TABLE `Led_Projectdatas` (
  `Id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ProjectId` INT NOT NULL COMMENT '项目ID（关联 Led_Projects 表）',
  `ContentData` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '项目内容数据（JSON结构或大字段）',
  PRIMARY KEY (`Id`) USING BTREE
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_general_ci 
  ROW_FORMAT=DYNAMIC 
  COMMENT='LED 项目数据表（存储项目内容、创建与修改信息）';

```sql

