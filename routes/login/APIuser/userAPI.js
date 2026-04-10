/**
 * @name userAPI
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/28
 * @property {serious} vaildator  登录注册严重
 * @property {module}  service // 引入数据库逻辑
 * @description 登录模块路由
 **/
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/login/serveUser/userServe');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

// 登录校验（保持相对宽松，避免影响历史账号/密码策略）
const loginValidator = [
    body('username')
        .isString().withMessage('用户名类型错误')
        .trim()
        .matches(/^[A-Za-z0-9]+$/).withMessage('用户名只能包含字母和数字'),
    body('password').isString().withMessage('密码类型错误')
]

// 注册校验（更严格：账号长度 + 密码复杂度）
const registerValidator = [
    body('username')
        .isString().withMessage('用户名类型错误')
        .trim()
        .matches(/^[A-Za-z0-9]+$/).withMessage('用户名只能包含字母和数字')
        .isLength({ min: 4, max: 20 }).withMessage('用户名长度需为4-20位'),
    body('email')
        .isString().withMessage('邮箱类型错误')
        .trim()
        .isEmail().withMessage('邮箱格式错误'),
    body('emailCode')
        .isString().withMessage('邮箱验证码类型错误')
        .trim()
        .matches(/^\d{6}$/).withMessage('邮箱验证码必须是6位数字'),
    body('password')
        .isString().withMessage('密码类型错误')
        .isLength({ min: 6, max: 64 }).withMessage('密码长度至少6位')
        .matches(/^(?=.*[A-Za-z])(?=.*\d).{6,}$/).withMessage('密码至少6位，且必须包含字母和数字'),
    body('company')
        .custom((v) => {
            if (v === undefined || v === null) return false;
            const s = String(v).trim();
            return s.length > 0;
        }).withMessage('company 必填')
]

/**
 * @name /login
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/28
 * @description 登录模块路由
 **/

router.post('/dkBi/sys/login', loginValidator, service.login);

/**
 * @name /register
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/09
 * @description 注册接口
 **/
router.post('/dkBi/sys/register', registerValidator, service.register);
/**
 * @name /logout
 * @author Mr·Fan DkPlusAI
 * @Time 2025/05/07
 * @description 退出登录模块
 **/
router.post('/dkBi/sys/logout',verifyTokenPublic, service.logout);

module.exports = router;