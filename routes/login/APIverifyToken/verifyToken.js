/**
 * @name verifyToken
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/07
 * @description 验证token是否过期
 **/
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/login/verifyToken/verifyToken');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

router.get('/dkBi/verifyToken',verifyTokenPublic, service.verifyToken);
module.exports = router;