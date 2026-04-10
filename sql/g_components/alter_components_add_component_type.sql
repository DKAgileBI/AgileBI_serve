-- 文件名：alter_components_add_component_type.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 若你已经创建过 led_components 表，请执行本文件进行增量升级

-- 1) 增加 ComponentType 字段（由服务端从 ComponentData 自动推导，如：柱状图/下拉选择器/组合控件）
ALTER TABLE led_components
  ADD COLUMN ComponentType VARCHAR(100) NULL COMMENT '组件类型（服务端从 ComponentData 自动推导，如：柱状图/下拉选择器/组合控件）' AFTER ComponentDesc;

-- 2) 增加索引（用于类型筛选）
ALTER TABLE led_components
  ADD INDEX idx_components_type (ComponentType);

-- 说明：历史数据需要在“编辑保存”后会自动补齐 ComponentType；如需批量补齐，可在业务层读取 ComponentData 后回写。
