/**
 * @name templateEdit.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 模板编辑模块
 */

const core = require('./templateCore');

module.exports = {
  createTemplate: core.createTemplate,
  updateTemplate: core.updateTemplate,
  bindTemplateUsers: core.bindTemplateUsers,
  setTemplateEnabledByBody: core.setTemplateEnabledByBody,
  deleteTemplateByBody: core.deleteTemplateByBody,
  setTemplateMetaByBody: core.setTemplateMetaByBody
};