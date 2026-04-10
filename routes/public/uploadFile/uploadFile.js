/**
 * @name public/uploadFile
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/30
 * @description 上传文件图片（限制 25MB）
 **/
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  CODE_ERROR,
} = require('../../../utils/Statuscode');
const nodeConfig = require('../../../config/node.config.json')
const service = require('../../../services/public/uploadFile/uploadFile');
const verifyTokenPublic = require('../../../utils/verifyTheToken');
// ✅ 主路由
router.post(
  '/dkBi/project/upload',verifyTokenPublic,service.uploadFile
);

module.exports = router;
