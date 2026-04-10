/**
 * @name data
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/24
 * @description 修改项目数据详情。
 **/
/**
 * @api {post} /api/dkBi/project/save/data 修改项目数据详情
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription
 * 修改项目详情内容（`led_projectdatas.ContentData`）并同步更新项目信息更新时间。
 * 仅项目创建者或“超级管理员”可修改。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 *
 * @apiBody {String} projectId 项目ID（必填）
 * @apiBody {String} content   内容数据（JSON字符串或文本）
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg  提示信息
 * @apiSuccessExample {json} 成功响应:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "操作成功"
 * }
 *
 * @apiErrorExample {json} 无权限:
 * {
 *   "code": -1,
 *   "msg": "无权修改他人项目"
 * }
 *
 * @apiErrorExample {json} 记录不存在:
 * {
 *   "code": 404,
 *   "msg": "记录不存在"
 * }
 *
 * @apiErrorExample {json} 服务异常:
 * {
 *   "code": 500,
 *   "msg": "服务器异常: Error: connect ECONNREFUSED ::1:3306"
 * }
 *
 * @apiSampleRequest /api/dkBi/project/save/data
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-31
 */

const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const AnalysisToken = require('../../../utils/TokenInof');
const { querySql, execSql, execTransaction } = require('../../../utils/index');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');
const nodeConfig = require('../../../config/node.config.json');
const { resolveProjectId } = require('../../../utils/projectIdCodec');
const { getUserRowFromReq, isAdminUser } = require('../_permission');

async function data(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const firstMsg = (err.array && err.array()[0] && err.array()[0].msg) ? err.array()[0].msg : '参数错误';
    return res.json({
      code: CODE_ERROR,
      msg: firstMsg,
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
    const iid = userRow.uid ?? userRow.iid;
    const admin = isAdminUser(userRow);
    const content = req.body?.content ?? req.query?.content;
    const projectIdRaw = req.body?.projectId ?? req.query?.projectId;
    const projectId = resolveProjectId(projectIdRaw);
    if (!projectId) {
      return res.json({
        code: CODE_ERROR,
        msg: 'projectId 参数错误',
        data: false
      });
    }
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const query = `
      SELECT *
      FROM Led_Projects p
      INNER JOIN Led_Projectdatas d 
      ON p.Id = d.ProjectId
      WHERE p.Id = ? AND p.IsDelete = 0;
      `;
    const projects = await execSql(query, [projectId]);
    if (!projects || projects.length === 0) {
      return res.json({
        code: 404,
        msg: '记录不存在',
        data: false,
      });
    }

    const project = projects[0];
    if (!admin && account !== project.CreateUserName) {
      return res.json({
        code: -1,
        msg: '无权修改他人项目',
        data: false,
      });
    }
    const sqlList = [
      {
        sql: `UPDATE led_projects SET UpdateUserName=?, UpdateUserId=?, UpdateTime=NOW() WHERE id=?`,
        params: [account, iid, projectId],
      },
      {
        sql: `UPDATE led_projectdatas SET ContentData=? WHERE projectId=?`,
        params: [contentStr, projectId],
      },
    ];
    await execTransaction(sqlList);
    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
    });
  } catch (error) {
    console.error('❌ error:', error);
    return res.json({
      code: CODE_ERROR,
      msg: '服务器异常: ' + error.message,
      data: null,
    });
  }
}

module.exports = { data };
