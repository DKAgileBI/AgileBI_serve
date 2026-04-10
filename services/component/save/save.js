/**
 * @name component/save
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 保存组件（新增/更新）
 */

/**
 * @api {post} /api/dkBi/component/save 保存组件（新增/更新）
 * @apiName SaveComponent
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription
 * 保存“我的组件”。若传 `id` 则更新；不传则新增。
 * - 组件类型 `ComponentType` 由服务端根据 `componentData` 自动推导并写入数据库。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 *
 * @apiBody {String} componentName 组件名称（必填）
 * @apiBody {String} [componentDesc] 组件描述（可选）
 * @apiBody {String|Object} [componentData] 组件内容（建议 JSON 字符串，可传对象）
 * @apiBody {String} [previewImage] 组件预览图文件名（由上传接口返回）
 * @apiBody {Object} [visibility] 可见性（与数据集一致：scope=all/self/company/users）
 * @apiBody {String="all","self","company","users"} [visibility.scope] scope
 * @apiBody {String} [visibility.company] 企业（scope=company 必填）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 必填，至少 1 个）
 * @apiBody {Number} [id] 组件ID（传则更新）
 *
 * @apiSuccess (200) {Number} code 状态码
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 返回数据
 * @apiSuccess (200) {Number} data.id 组件ID
 */

const { validationResult } = require('express-validator');
const AnalysisToken = require('../../../utils/TokenInof');
const { execSql, execTransaction } = require('../../../utils/index');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function stringifyJson(value) {
  try {
    return JSON.stringify(value === undefined ? null : value);
  } catch (e) {
    return JSON.stringify(null);
  }
}

function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  const text = String(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function deriveComponentType(componentData) {
  const obj = parseJson(componentData);
  if (!obj || typeof obj !== 'object') return null;

  // 组合组件
  if (obj.isComposite === true || Array.isArray(obj.components)) {
    return '组合控件';
  }

  // 普通组件：类型取 component.chartConfig.title
  const title = obj && obj.component && obj.component.chartConfig && obj.component.chartConfig.title;
  if (title !== null && title !== undefined) {
    const s = String(title).trim();
    if (s) return s;
  }

  return null;
}

function normalizeUserAccounts(users) {
  const list = Array.isArray(users) ? users : [];
  const uniq = new Set();
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    uniq.add(s);
  }
  return Array.from(uniq);
}

function validateVisibility(visibility) {
  if (!visibility || typeof visibility !== 'object') return 'visibility 必填';
  if (!isNonEmptyString(visibility.scope)) return 'visibility.scope 必填';
  const scope = String(visibility.scope).trim();
  if (!['all', 'company', 'users', 'self'].includes(scope)) return 'visibility.scope 必须为 all/self/company/users';
  if (scope === 'company') {
    const c = visibility.company;
    if (c === undefined || c === null || String(c).trim().length === 0) return 'visibility.company 必填';
    if (Object.prototype.hasOwnProperty.call(visibility, 'companyLabel')) {
      const label = visibility.companyLabel;
      if (label !== undefined && label !== null && String(label).trim().length === 0) return 'visibility.companyLabel 不能为空';
    }
  }
  if (scope === 'users') {
    if (!Array.isArray(visibility.users) || visibility.users.length < 1) return '指定用户最少一个';
  }
  return null;
}

async function syncComponentUsers(componentId, users) {
  const accounts = normalizeUserAccounts(users);
  const sqlList = [];
  sqlList.push({
    sql: 'DELETE FROM components_user_permission WHERE componentId = ?',
    params: [componentId]
  });
  for (let i = 0; i < accounts.length; i++) {
    sqlList.push({
      sql: 'INSERT INTO components_user_permission (componentId, userAccount) VALUES (?, ?)',
      params: [componentId, accounts[i]]
    });
  }
  await execTransaction(sqlList);
  return accounts.length;
}

async function save(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const firstMsg = (err.array && err.array()[0] && err.array()[0].msg) ? err.array()[0].msg : '参数错误';
    return res.json({ code: CODE_ERROR, msg: firstMsg });
  }

  try {
    const tokenInfo = await AnalysisToken(req);
    if (tokenInfo === 'err') {
      return res.json({ code: CODE_ERROR, msg: 'Token 无效或已过期' });
    }

    const { role, account, iid } = tokenInfo;
    const idRaw = req.body?.id ?? null;
    const id = (idRaw === null || idRaw === undefined || String(idRaw).trim() === '') ? null : Number(idRaw);

    const componentName = String(req.body.componentName || '').trim();
    const componentDesc = (req.body.componentDesc === undefined || req.body.componentDesc === null) ? null : String(req.body.componentDesc);
    const previewImage = (req.body.previewImage === undefined || req.body.previewImage === null) ? null : String(req.body.previewImage);

    const hasComponentData = req.body && Object.prototype.hasOwnProperty.call(req.body, 'componentData');
    const componentDataBody = req.body.componentData;
    const componentData = (componentDataBody === undefined || componentDataBody === null)
      ? null
      : (typeof componentDataBody === 'string' ? componentDataBody : JSON.stringify(componentDataBody));

    if (!componentName) {
      return res.json({ code: CODE_ERROR, msg: 'componentName 不能为空' });
    }

    // 可见性：与 datasets.visibility 一致
    const visibilityBody = req.body && Object.prototype.hasOwnProperty.call(req.body, 'visibility')
      ? req.body.visibility
      : undefined;

    if (!id) {
      const visibility = visibilityBody === undefined || visibilityBody === null
        ? { scope: 'self' }
        : (typeof visibilityBody === 'string' ? parseJson(visibilityBody) : visibilityBody);

      const visibilityErr = validateVisibility(visibility);
      if (visibilityErr) {
        return res.json({ code: CODE_ERROR, msg: visibilityErr, data: null });
      }

      const componentType = deriveComponentType(componentData);
      const insertSql = `
        INSERT INTO led_components
          (ComponentName, ComponentDesc, ComponentType, ComponentData, PreviewImage, IsPublic, IsDelete, Visibility, CreateUserId, CreateUserName, CreateTime)
        VALUES
          (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, NOW())
      `;
      const r = await execSql(insertSql, [componentName, componentDesc, componentType, componentData, previewImage, stringifyJson(visibility), iid, account]);

      const insertId = r && r.insertId ? r.insertId : null;
      if (insertId) {
        if (visibility && visibility.scope === 'users') {
          await syncComponentUsers(insertId, visibility.users);
        } else {
          await execSql('DELETE FROM components_user_permission WHERE componentId = ?', [insertId]);
        }
      }
      return res.json({
        code: CODE_SUCCESS,
        msg: '操作成功',
        data: { id: insertId }
      });
    }

    // 更新：校验权限（创建者或超级管理员）
    const querySql = 'SELECT * FROM led_components WHERE Id = ? AND IsDelete = 0';
    const rows = await execSql(querySql, [id]);
    if (!rows || rows.length === 0) {
      return res.json({ code: 404, msg: '记录不存在', data: false });
    }

    const row = rows[0];
    const ownerId = Number(row.CreateUserId);
    if (role !== '超级管理员' && ownerId !== Number(iid)) {
      return res.json({ code: -1, msg: '无权修改他人组件', data: false });
    }

    const finalComponentData = hasComponentData ? componentData : row.ComponentData;
    const componentType = deriveComponentType(finalComponentData);

    const oldVisibility = parseJson(row.Visibility) || { scope: 'self' };
    const newVisibility = visibilityBody === undefined
      ? oldVisibility
      : (typeof visibilityBody === 'string' ? (parseJson(visibilityBody) || oldVisibility) : visibilityBody);

    const visibilityErr = validateVisibility(newVisibility);
    if (visibilityErr) {
      return res.json({ code: CODE_ERROR, msg: visibilityErr, data: null });
    }

    const sqlList = [];
    sqlList.push({
      sql: `
        UPDATE led_components
        SET ComponentName=?, ComponentDesc=?, ComponentType=?, ComponentData=?, PreviewImage=?, Visibility=?,
            UpdateUserId=?, UpdateUserName=?, UpdateTime=NOW()
        WHERE Id=?
      `,
      params: [componentName, componentDesc, componentType, finalComponentData, previewImage, stringifyJson(newVisibility), iid, account, id]
    });

    // 权限表同步
    sqlList.push({
      sql: 'DELETE FROM components_user_permission WHERE componentId = ?',
      params: [id]
    });
    if (newVisibility && newVisibility.scope === 'users') {
      const accounts = normalizeUserAccounts(newVisibility.users);
      for (let i = 0; i < accounts.length; i++) {
        sqlList.push({
          sql: 'INSERT INTO components_user_permission (componentId, userAccount) VALUES (?, ?)',
          params: [id, accounts[i]]
        });
      }
    }

    await execTransaction(sqlList);

    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
      data: { id }
    });
  } catch (error) {
    return res.json({
      code: CODE_ERROR,
      msg: '服务器异常: ' + error.message,
      data: null,
    });
  }
}

module.exports = { save };
