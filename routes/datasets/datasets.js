/**
 * @name datasets
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/21
 * @description 我的数据集模块路由（REST）
 **/

const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');

const verifyTokenPublic = require('../../utils/verifyTheToken');
const service = require('../../services/datasets/datasets');

function adminOnly(req, res, next) {
    const user = req.userFFK || {};
    if (!service.isAdminUser(user)) {
        return res.json({
            code: -1,
            msg: '只有管理员用户才能操作',
            data: null
        });
    }
    next();
}

const vaildatorList = [
    query('page').optional().custom((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 1;
    }).withMessage('page 参数错误'),
    query('pageSize').optional().custom((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 1 && n <= 200;
    }).withMessage('pageSize 参数错误'),
    query('keyword').optional().isString().withMessage('keyword 类型错误'),
    query('ownerName').optional().isString().withMessage('ownerName 类型错误'),
    query('enabled').optional().custom((v) => (v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false || v === 'true' || v === 'false')).withMessage('enabled 参数错误'),
    query('visibilityScope').optional().isString().withMessage('visibilityScope 类型错误'),
    query('company').optional().isString().withMessage('company 类型错误')
];

const vaildatorId = [
    param('id').custom((v) => {
        const n = Number(v);
        return (String(v).trim().length > 0) && (Number.isFinite(n) ? n > 0 : true);
    }).withMessage('id 参数错误')
];

const vaildatorEnabled = [
    body('enabled').custom((v) => (v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false || v === 'true' || v === 'false')).withMessage('enabled 参数错误')
];

const vaildatorUsers = [
    body('users').custom((v) => Array.isArray(v)).withMessage('users 必须是数组'),
    body('users.*').optional().isString().withMessage('users 元素必须是字符串')
];

// GET /api/dkBi/datasets?page=1&pageSize=10&keyword=&enabled=&visibilityScope=&company=
router.get('/dkBi/datasets', vaildatorList, verifyTokenPublic, service.listDatasets);

// GET /api/dkBi/datasets/public?page=1&pageSize=10&keyword=&enabled=&visibilityScope=&company=
router.get('/dkBi/datasets/public', vaildatorList, verifyTokenPublic, service.listPublicDatasets);

// GET /api/dkBi/datasets/public/{id}
router.get('/dkBi/datasets/public/:id', vaildatorId, verifyTokenPublic, service.getPublicDatasetDetail);

// GET /api/dkBi/datasets/{id}
router.get('/dkBi/datasets/:id', vaildatorId, verifyTokenPublic, service.getDatasetDetail);

// POST /api/dkBi/datasets
router.post('/dkBi/datasets', verifyTokenPublic, service.createDataset);

// PUT /api/dkBi/datasets/{id}
router.put('/dkBi/datasets/:id', vaildatorId, verifyTokenPublic, service.updateDataset);

// PUT /api/dkBi/datasets/{id}/users { users: string[] }
router.put('/dkBi/datasets/:id/users', vaildatorId, vaildatorUsers, verifyTokenPublic, service.bindDatasetUsers);

// PATCH /api/dkBi/datasets/{id}/enabled { enabled: boolean }
router.patch('/dkBi/datasets/:id/enabled', vaildatorId, vaildatorEnabled, verifyTokenPublic, service.patchDatasetEnabled);

// DELETE /api/dkBi/datasets/{id}
router.delete('/dkBi/datasets/:id', vaildatorId, verifyTokenPublic, service.deleteDataset);

module.exports = router;
