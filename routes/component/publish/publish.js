/**
 * @name component/publish
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 发布/取消发布组件（是否公开）
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/component/publish/publish');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

const validator = [
  body('id').exists().withMessage('必须传 id').bail().isNumeric().withMessage('id 必须是数字'),
  body('isPublic').exists().withMessage('必须传 isPublic').bail().isInt({ min: 0, max: 1 }).withMessage('isPublic 只能为 0/1'),
];

router.post('/dkBi/component/publish', validator, verifyTokenPublic, service.publish);

module.exports = router;
