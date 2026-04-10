/**
 * @name templateDetail.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 模板详情与复制模块
 */

const core = require('./templateCore');

module.exports = {
  getPublicTemplateDetail: core.getPublicTemplateDetail,
  getTemplateDetail: core.getTemplateDetail,
  copyFromProject: core.copyFromProject,
  createProjectFromPublicTemplate: core.createProjectFromPublicTemplate
};