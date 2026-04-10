/**
 * @name project/list
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/21
 * @description 获取项目列表
 **/
const express = require('express');
const router = express.Router();
const { query  } = require('express-validator');
const service = require('../../../services/project/list/list');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
const vaildator = [
    query('pageNum').isString().withMessage('pageNum不能为空'),
    query('pageSize').isString().withMessage('pageSize不能为空')
]

router.get('/dkBi/project/list',vaildator,verifyTokenPublic, service.projectList);
module.exports = router;