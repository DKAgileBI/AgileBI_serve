
/**
 * @name project/delete.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/29
 * @description delete  删除项目
 **/


/**
 * @api {delete} /api/dkBi/project/delete 删除项目
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiName DeleteProject
 * @apiDescription
 * 删除指定的项目（软删除，设置 `isDelete = 1`）。<br>
 * 仅项目创建者或“超级管理员”可执行此操作。<br>
 * 被删除的项目不会物理移除，只会在数据库中标记删除。
 *
 * @apiHeader {String} Authorization 用户登录 Token（必填）
 * @apiHeaderExample {json} Header 示例:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 * }
 *
 * @apiQuery {Number} ids 要删除的项目 ID（必填，例如：?ids=3）
 *
 * @apiPermission 超级管理员 或 项目创建者
 *
 * @apiExample {curl} 请求示例:
 * curl -X DELETE "https://api.dkbi.com/api/dkBi/project/delete?ids=3" \
 *      -H "Authorization: Bearer <token>"
 *
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg  提示信息
 * @apiSuccess (200) {Boolean} data 删除结果（true 表示删除成功）
 * @apiSuccessExample {json} 成功响应:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "删除成功",
 *   "data": true
 * }
 *
 * @apiError (错误响应) {Number} code 状态码（非 200 表示失败）
 * @apiError (错误响应) {String} msg 错误信息
 *
 * @apiErrorExample {json} 缺少参数:
 * HTTP/1.1 400 Bad Request
 * {
 *   "code": -1,
 *   "msg": "请传入必要参数,ids"
 * }
 *
 * @apiErrorExample {json} 无权限删除:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": -1,
 *   "msg": "无权删除他人项目"
 * }
 *
 * @apiErrorExample {json} 项目不存在:
 * HTTP/1.1 404 Not Found
 * {
 *   "code": -1,
 *   "msg": "记录不存在"
 * }
 *
 * @apiErrorExample {json} 服务异常:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "服务器异常: connect ECONNREFUSED ::1:3306"
 * }
 *
 * @apiSampleRequest /api/dkBi/project/delete
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-29
 */

const nodeConfig = require('../../../config/node.config.json');
const { querySql, execSql } = require('../../../utils/index');
const AnalysisToken = require('../../../utils/TokenInof');
const { validationResult } = require('express-validator');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');
const { resolveProjectId } = require('../../../utils/projectIdCodec');
const { getUserRowFromReq, isAdminUser } = require('../_permission');

async function deletFun(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    return res.json({
      code: CODE_ERROR,
      msg: '请传入必要参数,ids',
    });
  }

  try {
    const userRow = await getUserRowFromReq(req);
    if (!userRow) {
      return res.json({
        code: CODE_ERROR,
        msg: 'Token 无效或已过期',
      });
    }
    const account = userRow.account;
    const admin = isAdminUser(userRow);
    const idNum = resolveProjectId(req.query && req.query.ids);
    if (!idNum) {
      return res.json({
        code: CODE_ERROR,
        msg: 'ids 参数错误',
        data: false
      });
    }

    const queryProject = `SELECT * FROM led_projects WHERE id='${idNum}'`;
    const projects = await querySql(queryProject);

    if (!projects || projects.length === 0) {
      return res.json({
        code: CODE_ERROR,
        msg: '记录不存在',
        data: false
      });
    }

    const project = projects[0];

    if (!admin && account !== project.CreateUserName) {
      return res.json({
        code: CODE_ERROR,
        msg: '无权删除他人项目',
        data: false
      });
    }
    await updateSl(1, idNum, res);
  } catch (error) {
    return res.json({
      code: CODE_ERROR,
      msg: '服务器异常: ' + error.message,
      data: null
    });
  }
}

async function updateSl(stateNum, id, res) {
  const updateSql = `UPDATE led_projects SET isDelete = ?, created_at = NOW() WHERE id = ?`;
  try {
    await execSql(updateSql, [stateNum, id]);
    return res.json({
      code: CODE_SUCCESS,
      msg: '删除成功',
      data: true
    });
  } catch (err) {
    console.error('err', err);
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = err;
    }
    return res.json({
      code: CODE_ERROR,
      msg: '服务器内部错误' + mag,
      data: null
    });
  }
}

module.exports = { deletFun };
