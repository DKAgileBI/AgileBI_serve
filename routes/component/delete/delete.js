/**
 * @name component/delete
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 删除组件（逻辑删除）
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/component/delete/delete');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

const validator = [
  body('id')
    .exists().withMessage('必须传 id')
    .bail()
    .isNumeric().withMessage('id 必须是数字'),
];

router.post('/dkBi/component/delete', validator, verifyTokenPublic, service.del);

module.exports = router;
