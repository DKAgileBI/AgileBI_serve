/**
 * @name project/copy
 * @author Mr·Fan DkPlusAI
 * @Time 2026/02/05
 * @description 复制项目为“我的项目”
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const verifyTokenPublic = require('../../../utils/verifyTheToken');
const service = require('../../../services/project/copy/copy');

const validator = [
  body('projectId')
    .custom((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .withMessage('projectId 参数错误'),
  body('remarks').optional().isString().withMessage('remarks 必须是字符串'),
  body('indexImage').optional().isString().withMessage('indexImage 必须是字符串')
];

// POST /api/dkBi/project/copy
router.post('/dkBi/project/copy', validator, verifyTokenPublic, service.copy);

module.exports = router;
