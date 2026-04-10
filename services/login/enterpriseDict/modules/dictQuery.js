/**
 * @name dictQuery.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 通用字典查询模块
 */

const core = require('./enterpriseDictCore');

module.exports = {
  getDictData: core.getDictData,
  getDictItems: core.getDictItems,
  listDict: core.listDict
};