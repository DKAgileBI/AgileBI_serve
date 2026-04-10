/**
 * @name component/uploadPreview
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 上传组件预览图
 */

/**
 * @api {post} /api/dkBi/component/uploadPreview 上传组件预览图
 * @apiName UploadComponentPreview
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription
 * 上传组件预览图（图片格式），返回 fileName。保存组件时把 fileName 作为 previewImage 传入即可。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 * @apiBody {File} object 预览图文件（multipart/form-data）
 */

const fs = require('fs');
const multiparty = require('multiparty');
const path = require('path');
const moment = require('moment');
const File = require('../../../utils/File');
const { UPLOAD_PATH_COMPONENT_PREVIEW } = require('../../../db/dbFileConfig');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');

function uploadPreview(req, res) {
  try {
    const uploadDir = UPLOAD_PATH_COMPONENT_PREVIEW;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new multiparty.Form({ uploadDir });
    form.on('error', (err) => {
      res.status(500).json({
        code: CODE_ERROR,
        msg: '表单解析失败',
        err: err.message
      });
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(500).json({
          code: CODE_ERROR,
          msg: '文件解析失败',
          err: err.message
        });
      }

      const fileArray = (files && files.object) || (files && files.file) || (files && files.preview) || null;
      const fileInfo = fileArray && fileArray[0] ? fileArray[0] : null;
      if (!fileInfo) {
        return res.json({
          code: CODE_ERROR,
          msg: '请上传预览图（表单字段名：object / file / preview）',
          data: null
        });
      }

      const fileSize = fileInfo.size;
      const uploadedPath = fileInfo.path;
      const originalFilename = fileInfo.originalFilename;

      const ext = path.extname(originalFilename || '').toLowerCase();
      const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      if (!allowed.includes(ext)) {
        return res.json({
          code: CODE_ERROR,
          msg: '仅支持上传图片格式：png/jpg/jpeg/gif/webp',
          data: null
        });
      }

      const uid = req.userFFK && req.userFFK.uid ? req.userFFK.uid : 'user';
      const safeName = `component_preview_${uid}_${Date.now()}${ext}`;
      const dstPath = path.join(uploadDir, safeName);

      File.rename(uploadedPath, dstPath).then((renameErr) => {
        if (renameErr) {
          return res.status(500).json({
            code: CODE_ERROR,
            msg: '保存预览图失败',
            err: String(renameErr)
          });
        }

        res.json({
          code: CODE_SUCCESS,
          msg: '上传成功',
          data: {
            id: moment(Date.now()).format('YYYYMMDDhhmmss'),
            fileName: safeName,
            fileSize
          }
        });
        res.end();
      });
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      err: error.message
    });
  }
}

module.exports = { uploadPreview };
