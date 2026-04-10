/**
 * @name uploadFile.js
 * @description 上传文件（自动创建目录 + multiparty）
 */

/**
 * @api {post} /dkBi/project/upload 上传文件图片
 * @apiName uploadFile
 * @apiGroup Public
 * @apiVersion 1.0.0
 * @apiDescription 
 * 上传文件接口，支持自动创建目录并保存文件到服务器本地。
 * 使用 multiparty 解析表单，可上传图片（PNG、JPG 等）或其他类型文件。
 * 
 * ---
 * 
 * @apiHeader {String} Authorization 用户登录的 Bearer Token
 * 
 * @apiBody {File} object  上传的文件对象（表单字段名为 `object`）
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg  提示信息
 * @apiSuccess (200) {Object} data 文件信息对象
 * @apiSuccess (200) {String} data.id 文件ID（时间戳）
 * @apiSuccess (200) {String} data.fileName 文件名
 * @apiSuccess (200) {Number} data.fileSize 文件大小（字节）
 * @apiSuccess (200) {String} data.fileSuffix 文件后缀（当前为空）
 * @apiSuccess (200) {String} data.relativePath 文件相对路径
 * @apiSuccess (200) {String} data.createTime 创建时间
 * @apiSuccess (200) {String} data.updateTime 更新时间
 * 
 * @apiSuccessExample {json} 成功响应:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "上传成功",
 *   "data": {
 *     "bucketName": "",
 *     "createTime": "2025-10-30T06:42:12.000Z",
 *     "createUserId": "",
 *     "createUserName": "",
 *     "fileName": "test.png",
 *     "fileSize": 15423,
 *     "fileSuffix": "",
 *     "id": "20251030144212",
 *     "updateTime": "2025-10-30T06:42:12.000Z",
 *     "updateUserId": "",
 *     "updateUserName": ""
 *   }
 * }
 * 
 * @apiError (Error 500) {Number} code 状态码（500）
 * @apiError (Error 500) {String} msg 错误信息
 * @apiError (Error 500) {String} err 详细错误
 * 
 * @apiErrorExample {json} 失败响应:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "文件解析失败",
 *   "err": "Error: ENOENT: no such file or directory..."
 * }
 * 
 * @apiSampleRequest /dkBi/project/upload
 * 
 * @apiPermission user
 */

const fs = require('fs')
const multiparty = require('multiparty')
const path = require('path')
const File = require('../../../utils/File')
const moment = require('moment')
const { UPLOAD_PATH_LED_Image } = require('../../../db/dbFileConfig')
const {
    CODE_ERROR,
    CODE_SUCCESS,
    PRIVATE_KEY,
    JWT_EXPIRED
} = require('../../../utils/Statuscode');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log('✅ 已自动创建上传目录:', dirPath)
  }
}

function uploadFile(req, res) {
  try {
    ensureDirSync(UPLOAD_PATH_LED_Image)
    const form = new multiparty.Form({ uploadDir: UPLOAD_PATH_LED_Image })
    form.on('error', (err) => {
      console.error('❌ 表单解析出错:', err.stack)
      res.status(500).json(
        {
          code: CODE_ERROR,
          msg: '表单解析失败',
          err: err.message
        })
    })

    // 4️⃣ 解析请求
    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(500).json(
          {
            code: CODE_ERROR,
            msg: '文件解析失败',
            err: err.message
          })
      }
      const fileList = (files && files.object) || (files && files.file) || null
      const file_info = fileList && fileList[0] ? fileList[0] : null
      if (!file_info) {
        return res.json({
          code: CODE_ERROR,
          msg: '请上传文件（表单字段名：object / file）',
          data: null
        })
      }

      const uploadDir = UPLOAD_PATH_LED_Image
      const relativeDir = 'image'
      ensureDirSync(uploadDir)

      let file_size = file_info.size
      let uploadedPath = file_info.path
      let originalFilename = path.basename(file_info.originalFilename || '')
      if (!originalFilename) {
        originalFilename = `upload_${Date.now()}`
      }
      let dstPath = path.join(uploadDir, originalFilename)
      const relativePath = `${relativeDir}/${originalFilename}`
      File.rename(uploadedPath, dstPath)
          .then(err => {
            if (err) {
              console.log('重命名文件错误：' + err)
            } else {
              //console.log('重命名文件成功。')
            }
            let data = {
              id: moment(new Date().getTime()).format('YYYYMMDDhhmmss'),
              fileName: originalFilename,
              bucketName: '',
              fileSize: file_size,
              fileSuffix: '',
              createUserId: '',
              createUserName: '',
              createTime: new Date(),
              updateUserId: '',
              updateUserName: '',
                updateTime: new Date(),
                relativePath
            }
            res.json({
              code: CODE_SUCCESS,
              msg: '上传成功',
              data: {
                bucketName: '',
                createTime:data.createTime,
                createUserId: "",
                createUserName: "",
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileSuffix: "",
                id: data.id,
                relativePath: data.relativePath,
                updateTime:data.updateTime,
                updateUserId: "",
                updateUserName: "",
              },
            })
          })
    })
  } catch (error) {
    console.error('❌ uploadFile 异常:', error)
    res.status(500).json({ code: 500, msg: '服务器内部错误', err: error.message })
  }
}

module.exports = {
  uploadFile,
}
