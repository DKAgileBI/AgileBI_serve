/**
 * @name component/uploadPreview
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 上传组件预览图
 **/

const express = require('express');
const router = express.Router();
const service = require('../../../services/component/uploadPreview/uploadPreview');
const verifyTokenPublic = require('../../../utils/verifyTheToken');

router.post('/dkBi/component/uploadPreview', verifyTokenPublic, service.uploadPreview);

module.exports = router;
