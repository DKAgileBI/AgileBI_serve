/**
 * @name datasetDetail.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 数据集详情与管理模块
 */

const core = require('./datasetCore');

module.exports = {
  getPublicDatasetDetail: core.getPublicDatasetDetail,
  getDatasetDetail: core.getDatasetDetail,
  createDataset: core.createDataset,
  updateDataset: core.updateDataset,
  bindDatasetUsers: core.bindDatasetUsers,
  patchDatasetEnabled: core.patchDatasetEnabled,
  deleteDataset: core.deleteDataset,
  isAdminUser: core.isAdminUser
};