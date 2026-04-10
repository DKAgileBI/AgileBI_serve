
/**
 * @name edit/edit
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/30
 * @description 修改接口区域
 **/

/**
 * @api {post} /api/dkBi/project/edit 修改项目信息
 * @apiName editProject
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription 
 * 修改项目封面/名称/可见性（Visibility）。  
 * 仅项目创建者或管理员可修改。  
 * 
 * ---
 * 
 * @apiHeader {String} Authorization 用户登录的 Token（JWT）
 * 
 * @apiBody {String} id              项目ID（必填，支持加密ID）
 * @apiBody {String} [indexImage]    项目封面图片路径或URL（可选）
 * @apiBody {String} [projectName]   项目名称（可选）
 * @apiBody {Object} [visibility]    可见性（可选，更新时会同步 projects_user_permission）
 * @apiBody {String} [visibility.scope] 可见范围：`all/self/company/users`
 * @apiBody {String} [visibility.company] 企业（字典 value），scope=company 时必填（二选一：company/companyLabel）
 * @apiBody {String} [visibility.companyLabel] 企业（字典 label），scope=company 时可用
 * @apiBody {String[]} [visibility.users] 指定账号可见列表（users.account），scope=users 时必填
 * 
 * @apiSuccess (200) {Number} code   状态码（200 表示成功）
 * @apiSuccess (200) {String} msg    提示信息
 * @apiSuccessExample {json} 成功响应:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "操作成功"
 * }
 * 
 * @apiError (Error 400) {Number} code  状态码（400）
 * @apiError (Error 400) {String} msg   参数错误或缺失
 * @apiErrorExample {json} 参数缺失:
 * HTTP/1.1 400 Bad Request
 * {
 *   "code": 400,
 *   "msg": "请传入必要参数id,indexImage"
 * }
 * 
 * @apiError (Error -1) {Number} code  状态码（-1）
 * @apiError (Error -1) {String} msg   无权限修改他人项目
 * @apiErrorExample {json} 权限不足:
 * HTTP/1.1 200 OK
 * {
 *   "code": -1,
 *   "msg": "无权修改他人项目"
 * }
 * 
 * @apiError (Error 404) {Number} code  状态码（404）
 * @apiError (Error 404) {String} msg   找不到记录
 * @apiErrorExample {json} 项目不存在:
 * HTTP/1.1 200 OK
 * {
 *   "code": 404,
 *   "msg": "记录不存在"
 * }
 * 
 * @apiError (Error 500) {Number} code  状态码（500）
 * @apiError (Error 500) {String} msg   服务器内部错误
 * @apiErrorExample {json} 服务器异常:
 * HTTP/1.1 200 OK
 * {
 *   "code": 500,
 *   "msg": "服务器异常: Error: connect ECONNREFUSED ::1:3306",
 *   "data": null
 * }
 * 
 * @apiSampleRequest /api/dkBi/project/edit
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-31
 * @apiPermission user
 */

const {
  validationResult
} = require('express-validator');
const AnalysisToken = require('../../../utils/TokenInof');
const jwt = require('jsonwebtoken');
const { querySql, execSql } = require('../../../utils/index');
const {
    CODE_ERROR,
    CODE_SUCCESS,
} = require('../../../utils/Statuscode');
const nodeConfig = require('../../../config/node.config.json');
const { resolveProjectId } = require('../../../utils/projectIdCodec');
const {
  getUserRowFromReq,
  isAdminUser,
  normalizeVisibility,
  validateVisibilityOrMsg,
  syncProjectUserPermission
} = require('../_permission');

async function edite (req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const mistake = '请传入必要参数id';
    res.json({
      code: CODE_ERROR,
      msg: mistake,
    })
    res.end()
  } else {
    try {
      const userRow = await getUserRowFromReq(req);
      if (!userRow) {
        return res.json({
          code: CODE_ERROR,
          msg: 'Token 无效或已过期',
        });
      }
      const role = userRow.role;
      const account = userRow.account;
      const iid = userRow.uid ?? userRow.iid;
      const id = resolveProjectId(req.body && req.body.id);
      if (!id) {
        return res.json({
          code: CODE_ERROR,
          msg: 'id 参数错误',
          data: false
        });
      }
      const { indexImage, projectName } = req.body;
      const queryProject = `SELECT * FROM led_projects WHERE id='${id}'`;
      const projects = await querySql(queryProject);
      if (!projects || projects.length === 0) {
        return res.json({
          code: CODE_ERROR,
          msg: '记录不存在',
          data: false
        });
      }
      const project = projects[0];
      const admin = isAdminUser(userRow);
      if (!admin && account !== project.CreateUserName) {
        return res.json({
          code: CODE_ERROR,
          msg: '无权修改他人项目',
          data: false
        });
      }

      // 可选：更新 Visibility（与 datasets/templates 一致）
      let visibility = null;
      if (Object.prototype.hasOwnProperty.call(req.body || {}, 'visibility')) {
        visibility = normalizeVisibility(req.body.visibility, userRow);
        const msg = validateVisibilityOrMsg(visibility);
        if (msg) {
          return res.json({
            code: CODE_ERROR,
            msg,
            data: null
          });
        }

        if (String(visibility.scope) === 'users') {
          try {
            await execSql('SELECT 1 FROM projects_user_permission LIMIT 1');
          } catch (e) {
            if (e && e.code === 'ER_NO_SUCH_TABLE') {
              return res.json({
                code: CODE_ERROR,
                msg: '缺少 projects_user_permission 表，请先执行 sql/c_project/projects_user_permission.sql',
                data: null
              });
            }
            throw e;
          }
        }
      }

      await updateSl(
        { projectName: projectName, id: id, img: indexImage, account, iid: iid, visibility },
        res
      );
    } catch (error) { 
      console.error('error', error);
      let mag = '';
      if (nodeConfig.environment === 'text') {
        mag = err;
      }
      return res.json({
        code: CODE_ERROR,
        msg: '服务器异常: ' + error,
        data: null
      });
    }
  }
}

async function updateSl (params, res) {
  let updateSql = '';
  let updateVal = [];

  const hasVisibility = params.visibility && typeof params.visibility === 'object';
  const visibilityJson = hasVisibility ? JSON.stringify(params.visibility) : null;

  if (params.projectName!==undefined) {
    if (hasVisibility) {
      updateSql=`UPDATE led_projects SET ProjectName = ?,IndexImage = ?, Visibility = ?, UpdateUserName = ?,UpdateUserId = ?,UpdateTime = NOW() WHERE id = ?`;
      updateVal=[params.projectName, params.img, visibilityJson, params.account, params.iid, params.id]
    } else {
      updateSql=`UPDATE led_projects SET ProjectName = ?,IndexImage = ?, UpdateUserName = ?,UpdateUserId = ?,UpdateTime = NOW() WHERE id = ?`;
      updateVal=[params.projectName,params.img, params.account,params.iid,params.id]
    }
  }else{
    if (hasVisibility) {
      updateSql=`UPDATE led_projects SET IndexImage = ?, Visibility = ?, UpdateUserName = ?,UpdateUserId = ?,UpdateTime = NOW() WHERE id = ?`;
      updateVal=[params.img, visibilityJson, params.account, params.iid, params.id]
    } else {
      updateSql=`UPDATE led_projects SET IndexImage = ?, UpdateUserName = ?,UpdateUserId = ?,UpdateTime = NOW() WHERE id = ?`;
      updateVal=[params.img, params.account,params.iid,params.id]
    }
  }
  try {
    await execSql(updateSql,updateVal );

    if (hasVisibility) {
      try {
        await syncProjectUserPermission(params.id, params.visibility);
      } catch (e) {
        if (e && e.code === 'ER_NO_SUCH_TABLE') {
          return res.json({
            code: CODE_ERROR,
            msg: '缺少 projects_user_permission 表，请先执行 sql/c_project/projects_user_permission.sql',
            data: null
          });
        }
        throw e;
      }
    }

    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功'
    });
  } catch (err) {
    console.error('err', err);
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = err;
    }
    return res.json({
      code: CODE_ERROR,
      msg: '服务器内部错误' + mag
    });
  }
}

module.exports = {
  edite
}