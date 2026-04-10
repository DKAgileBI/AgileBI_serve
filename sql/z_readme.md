# SQL 目录总览

本目录用于当前开源版服务端的 MySQL 初始化与结构说明。

## 一键执行

```bash
cd sql
mysql -u <user> -p <dbName> < run_all.sql
```

## 目录对应关系

### a_users

- `users_table.sql`：用户表结构与示例数据

### b_menus

- `menus_table.sql`：菜单表结构与示例数据

### c_project

- `project.sql`：项目主表与内容表
- `projects_user_permission.sql`：项目指定用户授权表
- `alter_projects_add_visibility.sql`：老库增量脚本

### d_email

- `email_code.sql`：邮箱验证码表

### e_datasets

- `datasets_table.sql`：数据集主表
- `datasets_user_permission.sql`：数据集授权表

### f_dict

- `dict_table.sql`：字典主表
- `dict_items_table.sql`：字典项表

### g_components

- `components_table.sql`：组件主表
- `components_user_permission.sql`：组件授权表
- `alter_components_add_component_type.sql`：老库增量脚本
- `alter_components_add_visibility.sql`：老库增量脚本

### h_templates

- `templates_table.sql`：模板主表与模板内容表
- `templates_user_permission.sql`：模板授权表

## 说明

- 当前开源版已移除 AI 相关 SQL 初始化脚本。
- 建议 MySQL 版本为 `5.7+`，推荐 `8.0+`。
- 默认字符集为 `utf8mb4`。



