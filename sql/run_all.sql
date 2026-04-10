-- 文件名：run_all.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- DK AgileBI 数据库初始化汇总脚本
--
-- 说明：本文件使用 mysql 客户端命令 `source` 来串联执行各子目录 SQL。
-- 推荐执行（确保相对路径正确）：
--   1) 进入 sql/ 目录
--   2) mysql -u <user> -p <dbName> < run_all.sql
-- 或者登录 mysql 后执行：
--   SOURCE run_all.sql;
--
-- 你也可以选择在命令行直接指定库：mysql -u <user> -p <dbName>

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) 用户体系
source a_users/users_table.sql;

-- 2) 菜单体系
source b_menus/menus_table.sql;

-- 3) 企业字典/通用字典
source f_dict/dict_table.sql;
source f_dict/dict_items_table.sql;

-- 4) 项目体系
source c_project/project.sql;

-- 5) 邮箱验证码
source d_email/email_code.sql;

-- 6) 数据集
source e_datasets/datasets_table.sql;
source e_datasets/datasets_user_permission.sql;

-- 7) 组件库
source g_components/components_table.sql;
source g_components/components_user_permission.sql;

-- 8) 模板库
source h_templates/templates_table.sql;
source h_templates/templates_user_permission.sql;

-- 9) 可选：老库升级（仅当你的 led_components 表缺字段时再执行；新库不需要）
-- source g_components/alter_components_add_component_type.sql;
-- source g_components/alter_components_add_visibility.sql;

SET FOREIGN_KEY_CHECKS = 1;
