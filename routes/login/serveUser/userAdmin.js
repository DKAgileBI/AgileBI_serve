/**
 * @name userAdminAPI
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/15
 * @description 管理员用户管理路由（仅管理员可操作）
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const verifyTokenPublic = require('../../../utils/verifyTheToken');
const service = require('../../../services/login/serveUser/userAdminServe');

const { CODE_ERROR } = require('../../../utils/Statuscode');

function isAdminUser(user) {
    const account = user && user.account ? String(user.account) : '';
    const role = user && user.role ? String(user.role) : '';

    if (account && account.toLowerCase() === 'admin') return true;
    if (role && role.toLowerCase().includes('admin')) return true;
    if (role && role.includes('管理员')) return true;
    return false;
}

function adminOnly(req, res, next) {
    const user = req.userFFK || {};
    if (!isAdminUser(user)) {
        return res.json({
            code: CODE_ERROR,
            msg: '只有管理员用户才能操作',
            data: null
        });
    }
    next();
}

const createUserValidator = [
    body('account')
        .isString().withMessage('account 类型错误')
        .trim()
        .matches(/^[A-Za-z0-9]+$/).withMessage('account 只能包含字母和数字')
        .isLength({ min: 4, max: 20 }).withMessage('account 长度需为4-20位'),
    body('password')
        .isString().withMessage('password 类型错误')
        .isLength({ min: 6, max: 64 }).withMessage('password 长度至少6位'),
    body('role').optional().isString().withMessage('role 类型错误'),
    body('enabled').optional().custom((v) => (v === 0 || v === 1 || v === '0' || v === '1')).withMessage('enabled 只能是0或1'),
    body('email').optional().isEmail().withMessage('email 格式错误'),
];

const uidValidator = [
    body('uid')
        .custom((v) => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0;
        })
        .withMessage('uid 参数错误')
];

const setRoleValidator = [
    ...uidValidator,
    body('role').isString().withMessage('role 类型错误').trim().notEmpty().withMessage('role 不能为空')
];

const setEnabledValidator = [
    ...uidValidator,
    body('enabled')
        .custom((v) => (v === 0 || v === 1 || v === '0' || v === '1'))
        .withMessage('enabled 只能是0或1')
];

const resetPasswordValidator = [
    ...uidValidator,
    body('newPassword')
        .isString().withMessage('newPassword 类型错误')
        .isLength({ min: 6, max: 64 }).withMessage('newPassword 长度至少6位')
];

const listUsersValidator = [
    body('page').optional().custom((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 1;
    }).withMessage('page 参数错误'),
    body('pageSize').optional().custom((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 1 && n <= 200;
    }).withMessage('pageSize 参数错误'),
    body('keyword').optional().isString().withMessage('keyword 类型错误'),
    body('enabled').optional().custom((v) => (v === 0 || v === 1 || v === '0' || v === '1')).withMessage('enabled 只能是0或1'),
    body('role').optional().isString().withMessage('role 类型错误'),
    body('company').optional().isString().withMessage('company 类型错误')
];

// 新增账号（管理员）
router.post('/dkBi/sys/user/create', verifyTokenPublic, adminOnly, createUserValidator, service.createUser);

// 删除账号（管理员）
router.post('/dkBi/sys/user/delete', verifyTokenPublic, adminOnly, uidValidator, service.deleteUser);

// 设置用户角色（管理员）
router.post('/dkBi/sys/user/setRole', verifyTokenPublic, adminOnly, setRoleValidator, service.setUserRole);

// 启用/停用（管理员）
router.post('/dkBi/sys/user/setEnabled', verifyTokenPublic, adminOnly, setEnabledValidator, service.setUserEnabled);

// 重置密码（管理员）
router.post('/dkBi/sys/user/resetPassword', verifyTokenPublic, adminOnly, resetPasswordValidator, service.resetPassword);

// 用户列表（管理员）
router.post('/dkBi/sys/user/list', verifyTokenPublic, adminOnly, listUsersValidator, service.listUsers);

module.exports = router;
