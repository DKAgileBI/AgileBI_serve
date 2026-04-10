/**
 * @name project/publish
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 变更是否发布状态
 **/
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const service = require('../../../services/project/delete/delete');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const vaildator = [
    query('ids').custom((v) => v !== undefined && v !== null && String(v).trim() !== '').withMessage('ids不能为空'),
]

router.delete('/dkBi/project/delete',vaildator,verifyTokenPublic, service.deletFun);
module.exports = router;