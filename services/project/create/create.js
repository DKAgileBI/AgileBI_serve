/**
 * @name create/create
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/31
 * @description 新增项目
 **/

/**
 * @api {post} /api/dkBi/project/create  新增项目
 * @apiName CreateProject
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription 新增一个项目记录，同时在 `led_projectdatas` 表中自动创建对应的空数据记录。
 *
 * @apiHeader {String} Authorization  用户登录后返回的 Token（JWT）
 *
 * @apiBody {String} projectName  项目名称（不能为空）
 * @apiBody {Object} [visibility] 可见性（不传默认 self，仅创建者可见）
 * @apiBody {String} [visibility.scope] 可见范围：`all/self/company/users`
 * @apiBody {String} [visibility.company] 企业（字典 value），scope=company 时必填（二选一：company/companyLabel）
 * @apiBody {String} [visibility.companyLabel] 企业（字典 label），scope=company 时可用
 * @apiBody {String[]} [visibility.users] 指定账号可见列表（users.account），scope=users 时必填（写入 projects_user_permission）
 *
 * @apiSuccess (Success 200) {Number} code  状态码（200 表示成功）
 * @apiSuccess (Success 200) {String} msg   提示信息
 * @apiSuccess (Success 200) {Object} data  返回的数据对象
 * @apiSuccess (Success 200) {String} data.id  项目ID（加密/转义后的 token）
 * @apiSuccess (Success 200) {String} data.indexImage  项目封面图（可能为 null）
 * @apiSuccess (Success 200) {Number} data.isDelete  删除状态（0 表示未删除）
 * @apiSuccess (Success 200) {String} data.ProjectName  项目名称
 * @apiSuccess (Success 200) {String} data.Remarks  备注信息
 * @apiSuccess (Success 200) {Number} data.State  项目状态（-1 未发布）
 *
 * @apiError (Error 200) {Number} code  错误码（如 -1、500 等）
 * @apiError (Error 200) {String} msg   错误信息说明
 *
 * @apiExample {json} 请求示例:
 * POST /api/dkBi/project/create
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 * Body:
 * {
 *   "projectName": "测试项目A"
 *   // "visibility": { "scope": "self" }
 * }
 *
 * @apiSuccessExample {json} 成功响应:
 * {
 *   "code": 200,
 *   "msg": "操作成功",
 *   "data": {
 *     "id": 12,
 *     "indexImage": null,
 *     "isDelete": 0,
 *     "ProjectName": "测试项目A",
 *     "Remarks": null,
 *     "State": -1
 *   }
 * }
 *
 * @apiErrorExample {json} 失败响应:
 * {
 *   "code": 500,
 *   "msg": "请传入必要参数projectName"
 * }
 */

const { validationResult } = require('express-validator');
const { querySql, execSql } = require('../../../utils/index');
const AnalysisToken = require('../../../utils/TokenInof');
const { encodeProjectId } = require('../../../utils/projectIdCodec');
const {
  getUserRowFromReq,
  normalizeVisibility,
  validateVisibilityOrMsg,
  syncProjectUserPermission
} = require('../_permission');
const {
  CODE_SUCCESS,
  CODE_ERROR
} = require('../../../utils/Statuscode');

async function create (req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    return res.json({
      code: CODE_ERROR,
      msg: '请传入必要参数projectName',
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
    const { projectName } = req.body;

    const rawVisibility = req.body && req.body.visibility !== undefined ? req.body.visibility : null;
    let visibility = normalizeVisibility(rawVisibility || { scope: 'self' }, userRow);
    if (rawVisibility !== undefined && rawVisibility !== null) {
      const msg = validateVisibilityOrMsg(visibility);
      if (msg) {
        return res.json({
          code: CODE_ERROR,
          msg,
          data: null
        });
      }
    }

    // scope=users：先确认授权表存在（避免插入主表后再报错留下脏数据）
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

    const visibilityJson = JSON.stringify(visibility);

    const insertProjectSql = `
      INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete,CreateUserId,ProjectName, Visibility)
      VALUES (?, ?, NOW(), ?,?,?,?)
    `;
    let projectResult;
    try {
      projectResult = await execSql(insertProjectSql, [-1, account, 0, iid, projectName, visibilityJson]);
    } catch (e) {
      // 兼容老库没有 Visibility 字段
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        const legacySql = `
          INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete,CreateUserId,ProjectName)
          VALUES (?, ?, NOW(), ?,?,?)
        `;
        projectResult = await execSql(legacySql, [-1, account, 0, iid, projectName]);
      } else {
        throw e;
      }
    }
    const projectId = projectResult.insertId;

    // scope=users 时同步授权表（若未建表会报错，提示用户先执行 SQL）
    try {
      await syncProjectUserPermission(projectId, visibility);
    } catch (e) {
      // 若表不存在，给出更清晰提示
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        try {
          await execSql('UPDATE led_projects SET IsDelete = 1 WHERE Id = ?', [projectId]);
        } catch (e2) {
          // ignore
        }
        return res.json({
          code: CODE_ERROR,
          msg: '缺少 projects_user_permission 表，请先执行 sql/c_project/projects_user_permission.sql',
          data: null
        });
      }
      throw e;
    }

    const insertDataSql = `
      INSERT INTO led_projectdatas (ProjectId, ContentData)
      VALUES (?, ?)
    `;
    await execSql(insertDataSql, [projectId, '']);
    const queryProject = `SELECT * FROM led_projects WHERE id='${projectId}'`;
    const projects = await querySql(queryProject);
    if (!projects || projects.length === 0) {
      return res.json({
        code: CODE_ERROR,
        msg: '记录不存在',
        data: false
      });
    }
    const project = projects[0];
    const {Id,IndexImage,ProjectName,Remarks,State,IsDelete}=project
    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
      data: {
        id: encodeProjectId(Id),
        indexImage: IndexImage,
        isDelete: IsDelete,
        ProjectName: ProjectName,
        Remarks: Remarks,
        State:State
      }
    })
  } catch (error) { 
    console.error('❌ error:', error);
    return res.json({
      code: CODE_ERROR,
      msg: '服务器异常: ' + error.message,
      data: null,
    });
  }
}

module.exports = {
  create
}