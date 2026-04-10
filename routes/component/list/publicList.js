/**
 * @name component/list/public
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 公共组件列表
 **/

const express = require('express');
const router = express.Router();
const service = require('../../../services/component/list/publicList');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

router.get('/dkBi/component/publicList', verifyTokenPublic, service.publicList);

module.exports = router;
