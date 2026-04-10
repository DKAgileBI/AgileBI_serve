/**
 * @name project/copy
 * @author Mr·Fan DkPlusAI
 * @Time 2026/02/05
 * @description 复制项目为“我的项目”（新建项目 + 拷贝内容）
 */

/**
 * @api {post} /api/dkBi/project/copy 复制项目为我的项目
 * @apiName CopyProject
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription
 * 将一个已存在的项目复制为“我的项目”（新建一条项目记录，并复制项目内容）。<br>
 * 复制后默认：
 * - `State = -1`（未发布）
 * - `CreateUserName = 当前登录账号`
 * - 复制封面/备注（若库表存在对应字段：IndexImage/Remarks）
 * - 新项目默认 `Visibility.scope = self`（仅自己可见）
 *
 * 复制权限（当前实现）：管理员 / 源项目创建者 / 或“源项目已发布且你有查看权限（按 Visibility 规则）”可复制。
 *
 * @apiHeader {String} Authorization 用户登录 Token（JWT）
 *
 * @apiBody {String} projectId 源项目ID（必填，支持加密ID）
 * @apiBody {String} [remarks] 新项目备注（可选，不传则沿用源项目）
 *
 * @apiDescription
 * 命名规则：新项目名称固定为 `复制-<源项目名称>`（忽略传入的 projectName）。<br>
 * 封面规则：新项目 `IndexImage` 固定为空（忽略传入的 indexImage）。
 *
 * @apiSuccess (Success 200) {Number} code 状态码
 * @apiSuccess (Success 200) {String} msg 提示信息
 * @apiSuccess (Success 200) {Object} data 数据
 * @apiSuccess (Success 200) {String} data.id 新项目ID（加密/转义后的 token）
 * @apiSuccess (Success 200) {String} data.ProjectName 新项目名称
 * @apiSuccess (Success 200) {String} data.indexImage 新项目封面
 * @apiSuccess (Success 200) {String} data.Remarks 新项目备注
 * @apiSuccess (Success 200) {Number} data.State 新项目状态（固定 -1）
 *
 * @apiError (Error 200) {Number} code 错误码
 * @apiError (Error 200) {String} msg 错误信息
 */

const { validationResult } = require('express-validator');
const nodeConfig = require('../../../config/node.config.json');
const { execSql } = require('../../../utils');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');
const { resolveProjectId, encodeProjectId } = require('../../../utils/projectIdCodec');
const {
  parseJsonMaybe,
  normalizeVisibility,
  canViewPublishedProject,
  syncProjectUserPermission
} = require('../_permission');

function isAdminUser(user) {
  const account = user && user.account ? String(user.account) : '';
  const role = user && user.role ? String(user.role) : '';
  if (account && account.toLowerCase() === 'admin') return true;
  if (role && role.toLowerCase().includes('admin')) return true;
  if (role && role.includes('管理员')) return true;
  if (role && role.includes('超级管理员')) return true;
  return false;
}

function ok(res, data, msg = '操作成功') {
  res.json({ code: CODE_SUCCESS, msg, data });
  res.end();
}

function fail(res, msg, data = null) {
  res.json({ code: CODE_ERROR, msg, data });
  res.end();
}

async function copy(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    return res.json({
      code: CODE_ERROR,
      msg: (err.array && err.array()[0] && err.array()[0].msg) ? err.array()[0].msg : '参数校验失败'
    });
  }

  try {
    const user = req.userFFK || {};
    const account = user && user.account ? String(user.account) : '';
    const uid = user && (user.uid || user.iid) ? Number(user.uid || user.iid) : null;
    const role = user && user.role ? String(user.role) : null;
    if (!account) return fail(res, 'Token 无效或已过期');

    const projectId = resolveProjectId(req.body.projectId);
    if (!projectId) return fail(res, 'projectId 参数错误');

    const sourceRows = await execSql(
      `
        SELECT
          p.Id AS id,
          p.ProjectName AS projectName,
          p.State AS state,
          p.IsDelete AS isDelete,
          p.CreateUserName AS createUserName,
          p.IndexImage AS indexImage,
          p.Remarks AS remarks,
          p.Visibility AS visibility,
          d.ContentData AS contentData
        FROM Led_Projects p
        INNER JOIN Led_Projectdatas d ON p.Id = d.ProjectId
        WHERE p.Id = ? AND p.IsDelete = 0
        LIMIT 1;
      `,
      [projectId]
    );

    const source = sourceRows && sourceRows[0] ? sourceRows[0] : null;
    if (!source) return fail(res, '项目不存在');

    const admin = isAdminUser(user);
    const isOwner = source.createUserName && String(source.createUserName) === account;
    const isPublished = Number(source.state) !== -1;

    // 发布项目：还需要满足“可见性”权限（all/company/users/self）
    if (!admin && !isOwner && isPublished) {
      const sourceProjectRow = {
        Id: source.id,
        CreateUserName: source.createUserName,
        Visibility: source.visibility
      };
      const canView = await canViewPublishedProject(sourceProjectRow, user);
      if (!canView) return fail(res, '无权限复制该项目');
    }

    // 复制权限：管理员/创建者/已发布(且具备可见性权限)可复制
    if (!admin && !(isOwner || isPublished)) return fail(res, '无权限复制该项目');

    const sourceName = String(source.projectName || '未命名项目');
    const newName = `复制-${sourceName}`;

    const newRemarks = (req.body.remarks && String(req.body.remarks).trim())
      ? String(req.body.remarks).trim()
      : (source.remarks || null);

    const newIndexImage = null;

    // 复制后默认：未发布（State=-1），归属当前用户
    // 注意：线上/历史库表字段可能不一致，这里做一次“列缺失降级”兼容。
    const newVisibility = { scope: 'self' };
    const newVisibilityJson = JSON.stringify(newVisibility);

    let projectInsertRes;
    try {
      projectInsertRes = await execSql(
        `
          INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete, CreateUserId, ProjectName, IndexImage, Remarks, Visibility)
          VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?);
        `,
        [-1, account, 0, uid, newName, newIndexImage, newRemarks, newVisibilityJson]
      );
    } catch (e) {
      // 若库表缺少 IndexImage/Remarks 等字段，则降级为最小插入（与 create 接口一致）
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        projectInsertRes = await execSql(
          `
            INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete, CreateUserId, ProjectName)
            VALUES (?, ?, NOW(), ?, ?, ?);
          `,
          [-1, account, 0, uid, newName]
        );
      } else {
        throw e;
      }
    }

    const newProjectId = projectInsertRes && projectInsertRes.insertId ? Number(projectInsertRes.insertId) : 0;
    if (!newProjectId) return fail(res, '复制失败');

    try {
      await execSql(
        'INSERT INTO led_projectdatas (ProjectId, ContentData) VALUES (?, ?)',
        [newProjectId, source.contentData || '']
      );

      // 新项目：默认 self，清空授权表
      try {
        await syncProjectUserPermission(newProjectId, newVisibility);
      } catch (e) {
        // ignore：如果没建表，不影响复制核心流程
      }
    } catch (e) {
      // 内容写入失败时，回收主表记录（避免脏数据）
      try {
        await execSql('UPDATE led_projects SET IsDelete = 1 WHERE Id = ?', [newProjectId]);
      } catch (e2) {
        // ignore
      }
      throw e;
    }

    return ok(res, {
      id: encodeProjectId(newProjectId),
      indexImage: newIndexImage,
      isDelete: 0,
      ProjectName: newName,
      Remarks: newRemarks,
      State: -1
    }, '复制成功');
  } catch (error) {
    console.error('❌ 项目复制异常:', error);
    const msg = nodeConfig.environment === 'text' ? String(error) : '';
    return fail(res, '服务器异常: ' + (error && error.message ? error.message : msg));
  }
}

module.exports = {
  copy
};
