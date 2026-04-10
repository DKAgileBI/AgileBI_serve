/**
 * @name getOssInfo
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/21
 * @description OSS设置接口
 **/
const express = require('express');
const router = express.Router();
const service = require('../../../services/public/oss/getOssInfo');
router.get('/dkBi/sys/getOssInfo', service.getOssInfo);
module.exports = router;