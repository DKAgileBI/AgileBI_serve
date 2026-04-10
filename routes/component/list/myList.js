/**
 * @name component/list/my
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 我的组件列表
 **/

const express = require('express');
const router = express.Router();
const service = require('../../../services/component/list/myList');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

router.get('/dkBi/component/myList', verifyTokenPublic, service.myList);

module.exports = router;
