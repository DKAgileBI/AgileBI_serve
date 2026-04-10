/**
 * @name verifyToken.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/02
 * @description verifyToken  验证token是否过期
 **/
/**
 * @api {post} /api/verifyToken 验证 Token 是否有效
 * @apiGroup Public
 * @apiVersion 1.0.0
 * @apiName verifyToken
 * @apiDescription
 * 验证用户登录令牌（JWT）是否有效或已过期。<br>
 * 该接口通常用于前端路由守卫或自动续期逻辑中，确保当前用户登录状态仍然有效。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token（必填）
 * @apiHeaderExample {json} Header 示例:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 * }
 *
 * @apiSuccess (200) {Number} code 业务状态码（200 表示成功）
 * @apiSuccess (200) {String} msg  响应信息
 * @apiSuccess (200) {Boolean} data Token 是否有效
 *
 * @apiSuccessExample {json} 成功响应:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "请求成功",
 *   "data": true
 * }
 *
 * @apiErrorExample {json} Token 不存在:
 * HTTP/1.1 401 Unauthorized
 * {
 *   "code": -1,
 *   "msg": "token不存在"
 * }
 *
 * @apiErrorExample {json} Token 已过期:
 * HTTP/1.1 401 Unauthorized
 * {
 *   "code": -1,
 *   "msg": "token已过期"
 * }
 *
 * @apiErrorExample {json} 服务器异常:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "服务器内部错误: <错误详情>"
 * }
 *
 * @apiSampleRequest /api/verifyToken
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-04-02
 */
const {
  CODE_SUCCESS
} = require('../../../utils/Statuscode');

function verifyToken (req, res, next) {
  res.json({
    code: CODE_SUCCESS,
    msg: '请求成功',
    data: true
  })
}
module.exports = {
  verifyToken
}