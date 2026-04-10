/**
 * @name datasets.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 数据集服务聚合入口。
 * 说明：
 * - 本文件只负责聚合导出数据集模块能力
 * - 具体实现已拆到 modules 目录
 * - 路由层引用路径保持不变
 */

const list = require('./modules/datasetList');
const detail = require('./modules/datasetDetail');

module.exports = {
  ...list,
  ...detail
};