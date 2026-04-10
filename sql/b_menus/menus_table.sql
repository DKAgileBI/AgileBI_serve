-- 文件名：menus_table.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 菜单表设计
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



-- 插入示例数据
-- 顶级菜单，工作空间
INSERT INTO menus (id, parent_id, label, `key`, icon, sort, type) VALUES
(1, 0, '工作空间', 'allProject', 'DevicesIcon', 1, 'menu');

-- 我的工作台分组（group类型）
INSERT INTO menus (id, parent_id, label, `key`, sort, type) VALUES
(10, 1, '我的工作台', 'myprojectGroup', 1, 'group');

-- 我的工作台子菜单
INSERT INTO menus (id, parent_id, label, `key`, name, path, icon, sort, type) VALUES
(2, 10, '我的项目', 'myproject', 'myproject', '/myproject', 'TvOutlineIcon', 1, 'menu'),
(3, 10, '我的模板', 'mytemplate', 'mytemplate', '/mytemplate', 'ObjectStorageIcon', 2, 'menu'),
(4, 10, '公共模板', 'mypublictemplate', 'mypublictemplate', '/mypublictemplate', 'BarChartOutline', 3, 'menu');

-- 我的数据源分组（group类型）
INSERT INTO menus (id, parent_id, label, `key`, sort, type) VALUES
(11, 1, '我的数据源', 'mysqlSettingsGroup', 2, 'group');

-- 我的数据源子菜单
INSERT INTO menus (id, parent_id, label, `key`, name, path, icon, sort, type) VALUES
(5, 11, '我的数据库配置', 'mysqlSettings', 'mysqlSettings', '/mysqlSettings', 'ConsoleSqlOutlined', 1, 'menu'),
(6, 11, '我的接口配置', 'myInterfaceSettings', 'myInterfaceSettings', '/myInterfaceSettings', 'Link', 2, 'menu'),
(7, 11, '静态数据配置', 'mystatic', 'mystatic', '/mystatic', 'FolderTwotone', 3, 'menu');

-- 我的模型配置分组（group类型）
INSERT INTO menus (id, parent_id, label, `key`, sort, type) VALUES
(12, 1, '我的模型配置', 'myModelGroup', 3, 'group');

-- 我的模型配置子菜单
INSERT INTO menus (id, parent_id, label, `key`, name, path, icon, sort, type) VALUES
(8, 12, '我的模型配置', 'myModel', 'myModel', '/myModel', 'ModelAlt', 1, 'menu');
