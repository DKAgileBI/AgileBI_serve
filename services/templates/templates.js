/**
 * @name templates.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 模板服务聚合入口。
 * 说明：
 * - 本文件只负责聚合导出模板模块能力
 * - 具体实现已拆到 modules 目录
 * - 路由层引用路径保持不变
 */

const list = require('./modules/templateList');
const detail = require('./modules/templateDetail');
const edit = require('./modules/templateEdit');
const upload = require('./modules/templateUpload');

module.exports = {
  ...list,
  ...detail,
  ...edit,
  ...upload
};