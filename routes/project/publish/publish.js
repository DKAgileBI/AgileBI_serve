/**
 * @name project/publish
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 变更是否发布状态
 **/
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/project/publish/publish');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const vaildator = [
    body('id').custom((v) => v !== undefined && v !== null && String(v).trim() !== '').withMessage('id不能为空'),
    body ('state').isInt().withMessage('state不能为空')
]

router.put('/dkBi/project/publish',vaildator,verifyTokenPublic, service.publish);
module.exports = router;