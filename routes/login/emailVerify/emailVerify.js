/**
 * @name login/emailVerify
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/09
 * @description 邮箱验证码（注册用）
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/login/emailVerify/emailVerify');

// 发送邮箱验证码（注册前可用）
router.post(
    '/dkBi/sys/email/sendCode',
    [
        body('email').isString().withMessage('邮箱类型错误').trim().isEmail().withMessage('邮箱格式错误')
    ],
    service.sendEmailCode
);

module.exports = router;
