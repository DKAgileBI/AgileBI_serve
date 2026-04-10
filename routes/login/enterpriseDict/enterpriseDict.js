/**
 * @name enterpriseDict
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/21
 * @description 通用字典路由（/api/dkBi/sys/ 增删改查）
 **/

const express = require('express');
const router = express.Router();

const { body, query } = require('express-validator');
const jwt = require('jsonwebtoken');

const verifyTokenPublic = require('../../../utils/verifyTheToken');
const service = require('../../../services/login/enterpriseDict/enterpriseDictServe');
const { execSql } = require('../../../utils/index');
const { PRIVATE_KEY, CODE_ERROR } = require('../../../utils/Statuscode');

// 公开接口可选解析 token：不传 token 也能访问；传了且合法则注入 req.userFFK
function verifyTokenOptional(req, res, next) {
  const token = (req.headers && req.headers.authorization)
    ? String(req.headers.authorization)
    : (req.query && req.query.token ? String(req.query.token) : '');

  if (!token) return next();

  try {
    jwt.verify(token, PRIVATE_KEY);
    const decoded = jwt.decode(token) || {};
    const username = decoded.username ? String(decoded.username) : '';
    const tokenSessionVersion = decoded.sessionVersion !== undefined && decoded.sessionVersion !== null
      ? String(decoded.sessionVersion)
      : '';
    if (!username) return next();

    execSql('select * from users where account = ? limit 1', [username])
      .then(user => {
        if (!user || user.length === 0) return next();
        const dbUser = user[0] || {};

        // enabled 校验
        if (Object.prototype.hasOwnProperty.call(dbUser, 'enabled')) {
          const enabled = Number(dbUser.enabled);
          if (enabled !== 1) return next();
        }

        // sessionVersion 校验（若 token 含该字段）
        const dbSessionVersion = dbUser.sessionVersion !== undefined && dbUser.sessionVersion !== null
          ? String(dbUser.sessionVersion)
          : '';
        if (tokenSessionVersion && dbSessionVersion && tokenSessionVersion !== dbSessionVersion) {
          return next();
        }

        req.userFFK = dbUser;
        next();
      })
      .catch(() => next());
  } catch (e) {
    return next();
  }
}

function isAdminUser(user) {
  const account = user && user.account ? String(user.account) : '';
  const role = user && user.role ? String(user.role) : '';

  if (account && account.toLowerCase() === 'admin') return true;
  if (role && role.toLowerCase().includes('admin')) return true;
  if (role && role.includes('管理员')) return true;
  if (role && role.includes('超级管理员')) return true;
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

const createDictValidator = [
  body('dictName').isString().withMessage('dictName 类型错误').trim().notEmpty().withMessage('dictName 必填'),
  body('dictKey').custom(v => v === undefined || v === null || String(v).trim() === '').withMessage('dictKey 不允许传，必须后端生成'),
  body('dictType').custom(v => v === undefined || v === null || String(v).trim() === '').withMessage('dictType 不允许传，必须后端生成'),
  body('keyName').optional({ nullable: true }).isString().withMessage('keyName 类型错误').trim(),
  body('remark').optional({ nullable: true }).isString().withMessage('remark 类型错误'),
  body('dictData').custom(v => v !== undefined && v !== null).withMessage('dictData 必填'),
  body('enabled').optional().custom(v => (v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false || v === 'true' || v === 'false')).withMessage('enabled 参数错误'),
  body('company').optional().isString().withMessage('company 类型错误')
];

const updateDictValidator = [
  body('dictId').custom(v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }).withMessage('dictId 参数错误'),
  ...createDictValidator
];

const deleteDictValidator = [
  body('dictId').custom(v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }).withMessage('dictId 参数错误')
];

const getDictDataValidator = [
  query('dictId').optional().custom(v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }).withMessage('dictId 参数错误'),
  query('dictKey').optional().isString().withMessage('dictKey 类型错误').trim().notEmpty().withMessage('dictKey 不能为空'),
  query('keyName').optional().isString().withMessage('keyName 类型错误').trim().notEmpty().withMessage('keyName 不能为空'),
  query().custom((v, { req }) => {
    const { dictId, dictKey, keyName } = req.query || {};
    return (dictId !== undefined && dictId !== null && String(dictId) !== '')
      || (dictKey !== undefined && dictKey !== null && String(dictKey).trim() !== '')
      || (keyName !== undefined && keyName !== null && String(keyName).trim() !== '')
      ;
  }).withMessage('dictId 或 dictKey 或 keyName 必填')
];

const listDictValidator = [
  query('page').optional().custom(v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }).withMessage('page 参数错误'),
  query('pageSize').optional().custom(v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= 200;
  }).withMessage('pageSize 参数错误'),
  query('keyword').optional().isString().withMessage('keyword 类型错误').trim()
];

const getDictItemsValidator = [
  query('keyName').isString().withMessage('keyName 类型错误').trim().notEmpty().withMessage('keyName 必填')
];


// 新增（管理员）
router.post('/dkBi/sys/dict/create', verifyTokenPublic, adminOnly, createDictValidator, service.createDict);

// 编辑（管理员）
router.post('/dkBi/sys/dict/update', verifyTokenPublic, adminOnly, updateDictValidator, service.updateDict);

// 删除（管理员，假删）
router.post('/dkBi/sys/dict/delete', verifyTokenPublic, adminOnly, deleteDictValidator, service.deleteDict);

// 详情（根据ID查询）
router.get('/dkBi/sys/dict/getData', verifyTokenOptional, getDictDataValidator, service.getDictData);

// 字典项数组（按 keyName 查询）
router.get('/dkBi/sys/dict/items', verifyTokenOptional, getDictItemsValidator, service.getDictItems);

// 列表（分页查询，公开接口）
router.get('/dkBi/sys/dict/list', verifyTokenOptional, listDictValidator, service.listDict);

module.exports = router;
