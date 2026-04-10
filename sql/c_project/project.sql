-- 文件名：project.sql
-- 作者：Mr·Fan DkPlusAI
-- 日期：2026/03/24
-- 作用：创建项目主表 Led_Projects，保存项目基础信息、权限配置与封面等字段

DROP TABLE IF EXISTS `Led_Projects`;
CREATE TABLE `Led_Projects` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `ProjectName` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '项目名称',
  `State` int NOT NULL COMMENT '状态-1未发布1发布',
  `CreateTime` datetime(6) DEFAULT NULL COMMENT '创建时间',
  `CreateUserId` int DEFAULT NULL COMMENT '创建人ID',
  `CreateUserName` varchar(100) DEFAULT NULL COMMENT '创建人用户名',
  `UpdateUserId` int DEFAULT NULL COMMENT '更新人ID',
  `UpdateUserName` varchar(100) DEFAULT NULL COMMENT '更新人用户名',
  `UpdateTime` datetime DEFAULT NULL COMMENT '更新时间',
  `CreateUserRole` varchar(50) DEFAULT NULL COMMENT '创建人角色',
  `PermissionLevel` int DEFAULT 0 COMMENT '权限级别(0公开,1组内,2仅本人,3自定义)',
  `PermissionUsers` json DEFAULT NULL COMMENT '自定义权限用户ID列表(JSON数组)',
  `IsDelete` int NOT NULL COMMENT '是否删除(0否,1是)',
  `Visibility` json DEFAULT NULL COMMENT '可见性 {scope, company, companyLabel, users}（scope: all/self/company/users）',
  `IndexImage` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '封面图',
  `Remarks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '备注',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`Id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='LED项目表';


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
