/**
 * @name component/detail
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 组件详情
 **/

const express = require('express');
const router = express.Router();
const service = require('../../../services/component/detail/detail');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

router.get('/dkBi/component/detail', verifyTokenPublic, service.detail);

module.exports = router;
