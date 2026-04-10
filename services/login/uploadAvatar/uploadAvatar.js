/**
 * @name uploadAvatar.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/09
 * @description 上传用户头像（存储目录与图表截图分离）
 */

/**
 * @api {post} /api/dkBi/sys/uploadAvatar 上传用户头像
 * @apiName uploadAvatar
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription
 * 上传头像文件到服务器本地目录（与图表截图上传目录分离）。<br>
 * - 注册前可用：不需要登录（Authorization 可不传）<br>
 * - 表单字段名：object<br>
 * - 拿到返回的 fileName 后，可在注册接口 /api/dkBi/sys/register 的 avatar 字段里传入该值
 *
 * @apiHeader {String} [Authorization] 登录令牌（可选）
 * @apiBody {File} object 头像文件（multipart/form-data）
 *
 * @apiExample {curl} 请求示例:
 * curl -X POST "http://127.0.0.1:3041/api/dkBi/sys/uploadAvatar" \
 *   -H "Authorization: <token>" \
 *   -F "object=@C:/path/to/avatar.png"
 *
 * @apiSuccess {Number} code 状态码，200 表示成功
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 文件信息
 * @apiSuccess {String} data.fileName 文件名
 * @apiSuccess {Number} data.fileSize 文件大小（字节）
 * @apiSuccess {String} data.id 文件ID（时间戳）
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "上传成功",
 *   "data": {
 *     "id": "20260109123045",
 *     "fileName": "avatar.png",
 *     "fileSize": 12345
 *   }
 * }
 */

const fs = require('fs');
const multiparty = require('multiparty');
const path = require('path');
const moment = require('moment');
const File = require('../../../utils/File');
const { execSql } = require('../../../utils/index');
const { UPLOAD_PATH_AVATAR } = require('../../../db/dbFileConfig');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');
const nodeConfig = require('../../../config/node.config.json');

function uploadAvatar(req, res) {
    try {
        const uploadDir = UPLOAD_PATH_AVATAR;
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const form = new multiparty.Form({ uploadDir });
        form.on('error', (err) => {
            res.status(500).json({
                code: CODE_ERROR,
                msg: '表单解析失败',
                err: err.message
            })
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(500).json({
                    code: CODE_ERROR,
                    msg: '文件解析失败',
                    err: err.message
                })
            }

            // 兼容多种表单字段名：object（推荐）/file/avatar
            const fileArray = (files && files.object) || (files && files.file) || (files && files.avatar) || null;
            const fileInfo = fileArray && fileArray[0] ? fileArray[0] : null;
            if (!fileInfo) {
                return res.json({
                    code: CODE_ERROR,
                    msg: '请上传头像文件（表单字段名：object / file / avatar）',
                    data: null
                })
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
                })
            }

            const safeName = `avatar_${req.userFFK && req.userFFK.uid ? req.userFFK.uid : 'user'}_${Date.now()}${ext}`;
            const dstPath = path.join(uploadDir, safeName);

            File.rename(uploadedPath, dstPath).then((renameErr) => {
                if (renameErr) {
                    return res.status(500).json({
                        code: CODE_ERROR,
                        msg: '保存头像失败',
                        err: String(renameErr)
                    })
                }

                // 写回用户表 avatar 字段（保存文件名；线上可由静态服务拼接 URL）
                const uid = req.userFFK && req.userFFK.uid;
                if (uid) {
                    const sql = 'UPDATE users SET avatar = ? WHERE uid = ?';
                    execSql(sql, [safeName, uid]).catch((e) => {
                        if (nodeConfig.environment === 'text') {
                            console.log('update avatar err', e);
                        }
                    })
                }

                res.json({
                    code: CODE_SUCCESS,
                    msg: '上传成功',
                    data: {
                        id: moment(Date.now()).format('YYYYMMDDhhmmss'),
                        fileName: safeName,
                        fileSize
                    }
                })
                res.end()
            })
        })
    } catch (error) {
        res.status(500).json({
            code: 500,
            msg: '服务器内部错误',
            err: error.message
        })
    }
}

module.exports = {
    uploadAvatar,
};
