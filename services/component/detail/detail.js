/**
 * @name component/detail
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 组件详情
 */

/**
 * @api {get} /api/dkBi/component/detail 组件详情
 * @apiName ComponentDetail
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取组件详情（与 datasets 权限一致）：
 * - all：所有人可见
 * - self：仅创建者可见
 * - company：同企业可见（匹配 users.company）
 * - users：指定账号可见（components_user_permission）
 * - 管理员：可见所有
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 * @apiParam {Number} id 组件ID
 */

const AnalysisToken = require('../../../utils/TokenInof');
const { execSql } = require('../../../utils/index');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');

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

function isAdminUser(user) {
  const account = user && user.account ? String(user.account) : '';
  const role = user && user.role ? String(user.role) : '';
  if (account && account.toLowerCase() === 'admin') return true;
  if (role && role.toLowerCase().includes('admin')) return true;
  if (role && role.includes('管理员')) return true;
  if (role && role.includes('超级管理员')) return true;
  return false;
}

function getUserCompany(user) {
  const company = user && user.company ? String(user.company).trim() : '';
  return company || '';
}

async function detail(req, res) {
  try {
    const tokenInfo = await AnalysisToken(req);
    if (tokenInfo === 'err') {
      return res.json({ code: CODE_ERROR, msg: 'Token 无效或已过期' });
    }

    const { iid, account } = tokenInfo;
    const idRaw = req.query?.id;
    const id = Number(idRaw);
    if (!id) {
      return res.json({ code: CODE_ERROR, msg: '请传入 id', data: null });
    }

    const sql = 'SELECT * FROM led_components WHERE Id=? AND IsDelete=0';
    const rows = await execSql(sql, [id]);
    if (!rows || rows.length === 0) {
      return res.json({ code: 404, msg: '记录不存在', data: false });
    }

    const row = rows[0];

    // 权限（与 datasets 完全一致）
    const user = req.userFFK || {};
    const isAdmin = isAdminUser(user);
    if (!isAdmin) {
      const visibility = parseJson(row.Visibility) || { scope: 'self' };
      const scope = visibility && visibility.scope ? String(visibility.scope).trim() : 'self';
      if (scope === 'all') {
        // ok
      } else if (scope === 'self') {
        const ownerId = Number(row.CreateUserId);
        if (ownerId !== Number(iid)) {
          return res.json({ code: -1, msg: '无权限访问', data: false });
        }
      } else if (scope === 'company') {
        const uc = getUserCompany(user);
        const c1 = String(visibility.company === undefined || visibility.company === null ? '' : visibility.company).trim();
        const c2 = String(visibility.companyLabel === undefined || visibility.companyLabel === null ? '' : visibility.companyLabel).trim();
        if (!uc || (!c1 || c1 !== uc) && (!c2 || c2 !== uc)) {
          return res.json({ code: -1, msg: '无权限访问', data: false });
        }
      } else if (scope === 'users') {
        const acc = account ? String(account) : '';
        if (!acc) {
          return res.json({ code: -1, msg: '无权限访问', data: false });
        }
        const hit = await execSql(
          'SELECT id FROM components_user_permission WHERE componentId = ? AND userAccount = ? LIMIT 1',
          [id, acc]
        );
        if (!hit || hit.length === 0) {
          return res.json({ code: -1, msg: '无权限访问', data: false });
        }
      } else {
        return res.json({ code: -1, msg: '无权限访问', data: false });
      }
    }

    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
      data: {
        id: row.Id,
        componentName: row.ComponentName,
        componentDesc: row.ComponentDesc,
        componentData: row.ComponentData,
        previewImage: row.PreviewImage,
        isPublic: row.IsPublic,
        visibility: parseJson(row.Visibility) || { scope: 'self' },
        createUserId: row.CreateUserId,
        createUserName: row.CreateUserName,
        createTime: row.CreateTime,
        updateTime: row.UpdateTime,
      }
    });
  } catch (error) {
    return res.json({ code: CODE_ERROR, msg: '服务器异常: ' + error.message, data: null });
  }
}

module.exports = { detail };
