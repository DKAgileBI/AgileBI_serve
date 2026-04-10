/**
 * @name edit/edite
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/31
 * @description 新增项目
 **/
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/project/create/create');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const vaildator = [
  body('projectName')
    .exists().withMessage('必须传projectName字段')
    .bail()
    .isString().withMessage('projectName必须是字符串')
    .bail()
    .notEmpty().withMessage('projectName不能为空')

]

router.post('/dkBi/project/create',vaildator,verifyTokenPublic, service.create);
module.exports = router;