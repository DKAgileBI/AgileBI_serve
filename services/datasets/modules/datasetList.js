/**
 * @name datasetList.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 数据集列表模块
 */

const core = require('./datasetCore');

module.exports = {
  listDatasets: core.listDatasets,
  listPublicDatasets: core.listPublicDatasets
};