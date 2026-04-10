/**
 * @name component/save
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 保存组件（新增/更新）
 **/

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../../../services/component/save/save');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

const validator = [
  body('componentName')
    .exists().withMessage('必须传 componentName 字段')
    .bail()
    .isString().withMessage('componentName 必须是字符串')
    .bail()
    .notEmpty().withMessage('componentName 不能为空'),
  body('componentDesc')
    .optional({ nullable: true })
    .isString().withMessage('componentDesc 必须是字符串'),
  body('componentData')
    .optional({ nullable: true })
    .custom((v) => typeof v === 'string' || typeof v === 'object').withMessage('componentData 必须为字符串或对象'),
  body('previewImage')
    .optional({ nullable: true })
    .isString().withMessage('previewImage 必须是字符串'),
  body('id')
    .optional({ nullable: true })
    .custom((v) => String(v).trim() !== '').withMessage('id 不能为空')
];

router.post('/dkBi/component/save', validator, verifyTokenPublic, service.save);

module.exports = router;
