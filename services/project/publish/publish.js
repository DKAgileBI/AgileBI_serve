
/**
 * @name project/publish.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description publish  变更项目状态
 **/

/**
 * @api {put} /api/dkBi/project/publish 修改项目发布状态
 * @apiName PublishProject
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription
 * 用于根据项目 ID 修改项目的发布状态。<br>
 * - 仅项目创建者或“超级管理员”可修改状态；<br>
 * - 状态值仅支持 `1`（已发布）或 `-1`（未发布）。
 *
 * @apiHeader {String} Authorization 登录令牌（必填）<br>
 * 格式：`Bearer <token>`
 *
 * @apiBody {Number} id 项目 ID（必填）
 * @apiBody {Number} state 项目状态（1=发布，-1=未发布）
 *
 * @apiExample {curl} 请求示例:
 * curl -X PUT "https://api.dkbi.com/api/dkBi/project/publish" \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer <token>" \
 *      -d '{"id": 3, "state": 1}'
 *
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Boolean} data 修改结果（true 表示成功）
 *
 * @apiSuccessExample {json} 成功响应示例:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "请求成功",
 *   "data": true
 * }
 *
 * @apiError (错误响应) {Number} code 状态码（非 200 表示失败）
 * @apiError (错误响应) {String} msg 错误信息
 * @apiError (错误响应) {Boolean} [data] 错误时返回 false 或 null
 *
 * @apiErrorExample {json} 参数缺失:
 * HTTP/1.1 400 Bad Request
 * {
 *   "code": 1,
 *   "msg": "请传入必要参数,id,state"
 * }
 *
 * @apiErrorExample {json} 状态参数非法:
 * HTTP/1.1 400 Bad Request
 * {
 *   "code": 1,
 *   "msg": "state 参数不合法，只能为 1 或 -1"
 * }
 *
 * @apiErrorExample {json} 项目不存在:
 * HTTP/1.1 404 Not Found
 * {
 *   "code": 1,
 *   "msg": "记录不存在",
 *   "data": false
 * }
 *
 * @apiErrorExample {json} 权限不足:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": 1,
 *   "msg": "无权修改他人发布状态",
 *   "data": false
 * }
 *
 * @apiErrorExample {json} 服务端错误:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 1,
 *   "msg": "服务器内部错误: connect ECONNREFUSED ::1:3306",
 *   "data": null
 * }
 *
 * @apiSampleRequest /api/dkBi/project/publish
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-22
 */

const AnalysisToken = require('../../../utils/TokenInof');
const { querySql, execSql } = require('../../../utils/index');
const nodeConfig = require('../../../config/node.config.json')
const { validationResult } = require('express-validator');
const { resolveProjectId } = require('../../../utils/projectIdCodec');
const { getUserRowFromReq, isAdminUser } = require('../_permission');
const {
    CODE_ERROR,
    CODE_SUCCESS,
} = require('../../../utils/Statuscode');

async function publish (req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const mistake = '请传入必要参数,id,state';
    res.json({
      code: CODE_ERROR,
      msg: mistake,
    })
    res.end()
  } else {
    let { id: idRaw, state } = req.body;
    const id = resolveProjectId(idRaw);
    if (!id) {
      return res.json({
        code: CODE_ERROR,
        msg: 'id 参数错误',
        data: false
      })
    }
    let stateNum = Number(state)
    if (![1, -1].includes(stateNum)) {
      return res.json({
        code: CODE_ERROR,
        msg: 'state 参数不合法，只能为 1 或 -1'
      })
    }
    const userRow = await getUserRowFromReq(req);
    if (!userRow) {
      return res.json({
        code: CODE_ERROR,
        msg: 'Token 无效或已过期',
      });
    }
    const account = userRow.account;
    const admin = isAdminUser(userRow);
    // 查询该发布记录
    const queryProject = `SELECT * FROM led_projects WHERE id='${id}'`
    const projects = await querySql(queryProject)
    if (!projects || projects.length === 0) {
      return res.json(
        {
          code: CODE_ERROR,
          msg: '记录不存在',
          data: false
        }
      )
    }
    const project = projects[0]
    if (!admin && account !== project.CreateUserName) {
      return res.json(
        {
          code: CODE_ERROR,
          msg: '无权修改他人发布状态',
          data:false
        }
      )
    }
    updateSl(stateNum,id,res)
  }
}
async function updateSl(stateNum,id,res){
  const updateSql = `UPDATE led_projects SET state=? WHERE id=?`
  try {
    await execSql(updateSql, [stateNum, id])
    res.json({
      code: CODE_SUCCESS,
      msg: '请求成功',
      data: true
    })
  } catch (err) {
    console.log("err", err)
    let mag = ''
    if (nodeConfig.environment === 'text') {
      mag = err
    }
    res.json({
      code: CODE_ERROR,
      msg: '服务器内部错误' + mag,
      data: null
    })
    res.end()
  }
}
module.exports = {
  publish
}