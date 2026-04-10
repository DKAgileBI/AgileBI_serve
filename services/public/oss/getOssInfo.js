/**
 * @name public/getOssInfo.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/31
 * @description 获取 OSS 文件存储配置地址（Bucket + URL）
 */

/**
 * @api {get} /api/public/getOssInfo 获取 OSS 文件存储地址
 * @apiName GetOssInfo
 * @apiGroup Public
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取当前系统配置的 OSS 存储桶信息与访问路径前缀。<br>
 * 前端可使用该接口返回的 `bucketURL` 拼接文件完整访问路径。<br>
 * **此接口不做权限校验，可公开访问。**
 *
 * ---
 *
 * @apiExample {curl} 请求示例:
 * curl -X GET "http://localhost:3041/api/public/getOssInfo"
 *
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg  提示信息
 * @apiSuccess (200) {Object} data 配置信息对象
 * @apiSuccess (200) {String} data.BucketName OSS 存储桶名称（Bucket）
 * @apiSuccess (200) {String} data.bucketURL OSS 文件访问前缀地址（URL）
 *
 * @apiSuccessExample {json} 成功响应示例:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "请求成功",
 *   "data": {
 *     "BucketName": "public-assets",
 *     "bucketURL": "/upload"
 *   }
 * }
 *
 * @apiErrorExample {json} 失败响应示例:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "服务器内部错误",
 *   "data": null
 * }
 *
 * @apiSampleRequest /api/public/getOssInfo
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-31
 */
function getOssInfo (req, res, next) {
  const bucketName = process.env.OSS_BUCKET_NAME || 'public-assets';
  const bucketURL = process.env.OSS_BUCKET_URL || '/upload';
  res.json({
    code: 200,
    msg: '请求成功',
    data: {
      BucketName: bucketName,
      bucketURL
    }
  })
}
module.exports = {
  getOssInfo
}