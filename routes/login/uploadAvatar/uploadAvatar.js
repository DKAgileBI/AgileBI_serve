/**
 * @name login/uploadAvatar
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/09
 * @description 上传用户头像（与图表截图上传目录分离）
 **/
const express = require('express');
const router = express.Router();
const service = require('../../../services/login/uploadAvatar/uploadAvatar');

// 上传头像（注册前可用，不需要登录）
router.post('/dkBi/sys/uploadAvatar', service.uploadAvatar);

module.exports = router;
