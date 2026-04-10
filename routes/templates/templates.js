/**
 * @name templates
 * @author Mr·Fan DkPlusAI
 * @Time 2026/02/05
 * @description 模板模块路由（我的模板 / 公共模板 / 复制项目为模板）
 **/

const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');

const verifyTokenPublic = require('../../utils/verifyTheToken');
const service = require('../../services/templates/templates');

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
  query('company').optional().isString().withMessage('company 类型错误'),
  query('includeAuthorized').optional().custom((v) => (v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false || v === 'true' || v === 'false')).withMessage('includeAuthorized 参数错误')
];

const vaildatorId = [
  param('id').custom((v) => {
    const n = Number(v);
    return (String(v).trim().length > 0) && (Number.isFinite(n) ? n > 0 : true);
  }).withMessage('id 参数错误')
];

const vaildatorUsers = [
  body('users').custom((v) => Array.isArray(v)).withMessage('users 必须是数组'),
  body('users.*').optional().isString().withMessage('users 元素必须是字符串')
];

const vaildatorEnabled = [
  body('enabled').custom((v) => (v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false || v === 'true' || v === 'false')).withMessage('enabled 参数错误')
];

// 兼容组件模块风格：POST body 传参
const vaildatorDeleteBody = [
  body('id')
    .custom((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .withMessage('id 必填')
    .bail()
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('id 类型错误')
];

const vaildatorEnabledBody = [
  body('id')
    .custom((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .withMessage('id 必填')
    .bail()
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('id 类型错误'),
  ...vaildatorEnabled
];

// 公共模板引用为“我的项目”
const vaildatorPublicToProjectBody = [
  body('id')
    .custom((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .withMessage('id 必填')
    .bail()
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('id 类型错误'),
  body('projectName').optional().isString().withMessage('projectName 类型错误')
];

// 单独设置：name/desc/visibility
const vaildatorMetaBody = [
  body('id')
    .custom((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .withMessage('id 必填')
    .bail()
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('id 类型错误'),
  body('name')
    .custom((v) => typeof v === 'string' && String(v).trim().length > 0)
    .withMessage('name 必填'),
  body('desc').optional().isString().withMessage('desc 类型错误'),
  body('visibility')
    .custom((v) => v && typeof v === 'object')
    .withMessage('visibility 必填')
];

const vaildatorCopy = [
  body('projectId').custom((v) => {
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).withMessage('projectId 参数错误'),
  body('name').optional().isString().withMessage('name 类型错误'),
  body('desc').optional().isString().withMessage('desc 类型错误')
];

// GET /api/dkBi/templates?page=1&pageSize=10&keyword=&enabled=&includeAuthorized=
router.get('/dkBi/templates', vaildatorList, verifyTokenPublic, service.listTemplates);

// GET /api/dkBi/templates/public?page=1&pageSize=10&keyword=&enabled=&visibilityScope=&company=
router.get('/dkBi/templates/public', vaildatorList, verifyTokenPublic, service.listPublicTemplates);

// GET /api/dkBi/templates/public/{id}
router.get('/dkBi/templates/public/:id', vaildatorId, verifyTokenPublic, service.getPublicTemplateDetail);

// GET /api/dkBi/templates/{id}
router.get('/dkBi/templates/:id', vaildatorId, verifyTokenPublic, service.getTemplateDetail);

// POST /api/dkBi/templates/copyFromProject { projectId, name?, desc? }
router.post('/dkBi/templates/copyFromProject', vaildatorCopy, verifyTokenPublic, service.copyFromProject);

// POST /api/dkBi/templates/public/toProject { id, projectName? }
router.post('/dkBi/templates/public/toProject', vaildatorPublicToProjectBody, verifyTokenPublic, service.createProjectFromPublicTemplate);

// 兼容旧/误用路径：publicToProject
router.post('/dkBi/templates/publicToProject', vaildatorPublicToProjectBody, verifyTokenPublic, service.createProjectFromPublicTemplate);

// POST /api/dkBi/templates
router.post('/dkBi/templates', verifyTokenPublic, service.createTemplate);

// PUT /api/dkBi/templates/{id}
router.put('/dkBi/templates/:id', vaildatorId, verifyTokenPublic, service.updateTemplate);

// PUT /api/dkBi/templates/{id}/users { users: string[] }
router.put('/dkBi/templates/:id/users', vaildatorId, vaildatorUsers, verifyTokenPublic, service.bindTemplateUsers);

// POST /api/dkBi/templates/enabled { id, enabled }
router.post('/dkBi/templates/enabled', vaildatorEnabledBody, verifyTokenPublic, service.setTemplateEnabledByBody);

// POST /api/dkBi/templates/delete { id }
router.post('/dkBi/templates/delete', vaildatorDeleteBody, verifyTokenPublic, service.deleteTemplateByBody);

// POST /api/dkBi/templates/uploadCover (multipart/form-data)
router.post('/dkBi/templates/uploadCover', verifyTokenPublic, service.uploadTemplateCover);

// POST /api/dkBi/templates/meta { id, name, desc?, visibility }
router.post('/dkBi/templates/meta', vaildatorMetaBody, verifyTokenPublic, service.setTemplateMetaByBody);

module.exports = router;
