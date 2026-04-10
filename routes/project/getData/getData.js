/**
 * @name getData/getData
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 查询项目详情
 **/
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const service = require('../../../services/project/getData/getData');
const vaildator = [
    query('projectId').custom((v) => v !== undefined && v !== null && String(v).trim() !== '').withMessage('projectId不能为空')
]

router.get('/dkBi/project/getData',vaildator, service.getData);
module.exports = router;