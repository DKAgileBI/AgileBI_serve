/**
 * @name edit/edite
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 变更是否发布状态
 **/
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const multiparty = require('multiparty');
const service = require('../../../services/project/edit/data');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

// 仅对该接口：兼容 multipart/form-data（否则 req.body 为空）
router.use('/dkBi/project/save/data', (req, _res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) return next();
  const form = new multiparty.Form();
  form.parse(req, (err, fields) => {
    if (err) return next(err);
    req.body = req.body || {};
    Object.keys(fields || {}).forEach((key) => {
      const val = fields[key];
      // multiparty fields 默认是数组
      req.body[key] = Array.isArray(val) ? val[0] : val;
    });
    next();
  });
});

// 兼容部分前端字段名大小写不一致、以及 data 包装（ProjectId/data.projectId -> projectId）
router.use('/dkBi/project/save/data', (req, _res, next) => {
  req.body = req.body || {};
  req.query = req.query || {};

  const bodyData = req.body.data || {};

  if (req.body.projectId == null) {
    req.body.projectId = req.body.ProjectId ?? bodyData.projectId ?? bodyData.ProjectId;
  }
  if (req.body.content == null) {
    req.body.content = req.body.Content ?? bodyData.content ?? bodyData.Content;
  }
  if (req.query.projectId == null) {
    req.query.projectId = req.query.ProjectId;
  }

  next();
});

const vaildator = [
  // 兼容前端传 number 或 string
  check('projectId')
    .custom((val) => val !== undefined && val !== null && String(val).trim() !== '')
    .withMessage('projectId不能为空')
    .custom((val) => typeof val === 'string' || typeof val === 'number')
    .withMessage('projectId不能为空并且是字符串类型'),
  // 兼容前端传 string 或 object/array（服务端会在入库前 stringify）
  check('content').custom((val) => val !== undefined && val !== null).withMessage('content不能为空'),
]

router.post('/dkBi/project/save/data',vaildator,verifyTokenPublic, service.data);
module.exports = router;