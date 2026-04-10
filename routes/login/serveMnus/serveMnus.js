/**
 * @name serveMnusAPI
 * @author Mr·Fan DkPlusAI
 * @Time 2025/07/22
 * @property {serious} serveMnus  获取菜单
 * @property {module}  service // 引入数据库逻辑
 * @description 菜单
 **/
const express = require('express');
const router = express.Router();
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const service = require('../../../services/login/serveMnus/serveMnus');

/**
 * @name /serveMnus
 * @author Mr·Fan DkPlusAI
 * @Time 2025/07/22
 * @description 菜单
 **/

router.post('/serveMnus', verifyTokenPublic, service.serveMnus);


module.exports = router;