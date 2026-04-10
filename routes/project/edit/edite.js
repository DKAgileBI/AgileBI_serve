/**
 * @name edit/edite
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 变更是否发布状态
 **/
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/project/edit/edite');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const vaildator = [
  body('id').isString().withMessage('id不能为空并且是字符串类型')
]

router.post('/dkBi/project/edit',vaildator,verifyTokenPublic, service.edite);
module.exports = router;