/**
 * @name enterpriseDictServe.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 通用字典服务聚合入口。
 * 说明：
 * - 本文件只负责聚合导出企业字典模块能力
 * - 具体实现已拆到 modules 目录
 * - 路由层引用路径保持不变
 */

const crud = require('./modules/dictCrud');
const query = require('./modules/dictQuery');

module.exports = {
  ...crud,
  ...query
};