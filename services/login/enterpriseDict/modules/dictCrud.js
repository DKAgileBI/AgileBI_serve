/**
 * @name dictCrud.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 通用字典增删改模块
 */

const core = require('./enterpriseDictCore');

module.exports = {
  createDict: core.createDict,
  updateDict: core.updateDict,
  deleteDict: core.deleteDict
};