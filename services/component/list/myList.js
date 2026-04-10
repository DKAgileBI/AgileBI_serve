/**
 * @name component/list/my
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 我的组件列表
 */

/**
 * @api {get} /api/dkBi/component/myList 我的组件分页列表
 * @apiName MyComponentList
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription 获取当前登录用户创建的组件分页列表（IsPublic=0/1 均可，只按 CreateUserId 过滤）。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 *
 * @apiQuery {Number} [page=1] 页码
 * @apiQuery {Number} [pageSize=10] 每页数量（1-200）
 * @apiQuery {String} [keyword] 关键词（按组件名 ComponentName 模糊匹配）
 * @apiQuery {String} [componentType] 类型（精确匹配 ComponentType，例如：柱状图/下拉选择器/组合控件）
 * @apiQuery {String} [ownerName] 创建人（仅管理员生效；模糊匹配创建人账号 CreateUserName）
 *
 * @apiSuccess (200) {Number} code 状态码
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 分页数据
 * @apiSuccess (200) {Object[]} data.list 列表
 * @apiSuccess (200) {Number} data.page 页码
 * @apiSuccess (200) {Number} data.pageSize 每页数量
 * @apiSuccess (200) {Number} data.total 总数
 */

const AnalysisToken = require('../../../utils/TokenInof');
const { execSql } = require('../../../utils/index');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function isAdminToken(tokenInfo) {
  if (!tokenInfo) return false;
  const account = tokenInfo.account ? String(tokenInfo.account) : '';
  const role = tokenInfo.role ? String(tokenInfo.role) : '';
  if (account && account.toLowerCase() === 'admin') return true;
  if (role && role.toLowerCase().includes('admin')) return true;
  if (role && role.includes('管理员')) return true;
  if (role && role.includes('超级管理员')) return true;
  return false;
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

function deepPickStringByKey(root, keyName) {
  if (!root || (typeof root !== 'object' && !Array.isArray(root))) return null;

  const queue = [root];
  const visited = new Set();
  let budget = 5000;

  while (queue.length > 0 && budget-- > 0) {
    const cur = queue.shift();
    if (!cur || typeof cur !== 'object') continue;
    if (visited.has(cur)) continue;
    visited.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur) queue.push(item);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(cur, keyName)) {
      const v = cur[keyName];
      if (v !== null && v !== undefined) {
        const s = String(v).trim();
        if (s) return s;
      }
    }

    for (const k of Object.keys(cur)) {
      queue.push(cur[k]);
    }
  }

  return null;
}

function pickComponentType(componentData) {
  const obj = parseJson(componentData);
  if (!obj || typeof obj !== 'object') return null;

  // 组合组件：优先判断（你的示例里 isComposite=true 且有 components 数组）
  // 命中则直接返回“组合控件”作为类型
  if (obj.isComposite === true || Array.isArray(obj.components)) {
    return '组合控件';
  }

  // 0) 业务约定：类型在 component.chartConfig.title
  const chartTitle = obj && obj.component && obj.component.chartConfig && obj.component.chartConfig.title;
  if (chartTitle !== null && chartTitle !== undefined) {
    const s = String(chartTitle).trim();
    if (s) return s;
  }

  // 1) 最优先：任意层级的 componentType
  const deepComponentType = deepPickStringByKey(obj, 'componentType');
  if (deepComponentType) return deepComponentType;

  // 2) 兼容少量 snake_case
  const deepComponentType2 = deepPickStringByKey(obj, 'component_type');
  if (deepComponentType2) return deepComponentType2;

  const candidates = [
    obj.componentType,
    obj.type,
    obj.widgetType,
    obj.controlType,
    obj.component && obj.component.type,
    obj.component && obj.component.componentType,
    obj.config && obj.config.type,
    obj.config && obj.config.componentType,
  ];

  for (const v of candidates) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }

  // 3) 最后兜底：任意层级的 type（可能会更“泛”，放最后）
  const deepType = deepPickStringByKey(obj, 'type');
  if (deepType) return deepType;
  return null;
}

async function myList(req, res) {
  try {
    const tokenInfo = await AnalysisToken(req);
    if (tokenInfo === 'err') {
      return res.json({ code: CODE_ERROR, msg: 'Token 无效或已过期' });
    }

    const { iid } = tokenInfo;
    const isAdmin = isAdminToken(tokenInfo);

    let { page, pageSize, keyword, componentType, ownerName } = req.query || {};
    page = toNumber(page);
    pageSize = toNumber(pageSize);
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, Math.floor(pageSize)) : 10;
    const offset = (safePage - 1) * safePageSize;

    const where = ['IsDelete=0'];
    const params = [];
    if (!isAdmin) {
      where.push('CreateUserId=?');
      params.push(iid);
    }

    // 创建人搜索：仅管理员生效
    if (isAdmin && ownerName !== undefined && ownerName !== null && String(ownerName).trim() !== '') {
      where.push('CreateUserName LIKE ?');
      params.push(`%${String(ownerName).trim()}%`);
    }
    if (keyword !== undefined && keyword !== null && String(keyword).trim() !== '') {
      where.push('ComponentName LIKE ?');
      params.push(`%${String(keyword).trim()}%`);
    }
    if (componentType !== undefined && componentType !== null && String(componentType).trim() !== '') {
      const ct = String(componentType).trim();
      // 兼容历史数据：ComponentType 为空时，从 ComponentData(JSON) 推导后参与筛选
      where.push(`(
        ComponentType = ?
        OR (
          (ComponentType IS NULL OR ComponentType = '')
          AND JSON_VALID(ComponentData)
          AND (
            JSON_EXTRACT(CAST(ComponentData AS JSON), '$.isComposite') = true
            OR (
              JSON_TYPE(JSON_EXTRACT(CAST(ComponentData AS JSON), '$.components')) = 'ARRAY'
              AND JSON_LENGTH(JSON_EXTRACT(CAST(ComponentData AS JSON), '$.components')) > 0
            )
            OR JSON_UNQUOTE(JSON_EXTRACT(CAST(ComponentData AS JSON), '$.component.chartConfig.title')) = ?
          )
        )
      )`);
      params.push(ct, ct);
    }

    const countSql = `SELECT COUNT(1) AS total FROM led_components WHERE ${where.join(' AND ')}`;
    const countRows = await execSql(countSql, params);
    const total = countRows && countRows[0] && countRows[0].total !== undefined && countRows[0].total !== null
      ? Number(countRows[0].total)
      : 0;

    const sql = `
      SELECT
        Id AS id,
        ComponentName AS componentName,
        ComponentDesc AS componentDesc,
        ComponentType AS componentType,
        ComponentData AS componentData,
        PreviewImage AS previewImage,
        IsPublic AS isPublic,
        Visibility AS visibility,
        CreateUserId AS createUserId,
        CreateUserName AS createUserName,
        DATE_FORMAT(CreateTime, '%Y-%m-%d %H:%i:%s') AS createTime,
        DATE_FORMAT(UpdateTime, '%Y-%m-%d %H:%i:%s') AS updateTime
      FROM led_components
      WHERE ${where.join(' AND ')}
      ORDER BY IFNULL(UpdateTime, CreateTime) DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await execSql(sql, [...params, safePageSize, offset]);

    const list = (rows || []).map((r) => {
      const finalType = r.componentType ? String(r.componentType) : pickComponentType(r.componentData);
      const { componentData, ...rest } = r;
      return {
        ...rest,
        componentType: finalType,
      };
    });

    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
      data: {
        list,
        page: safePage,
        pageSize: safePageSize,
        total,
      }
    });
  } catch (error) {
    return res.json({ code: CODE_ERROR, msg: '服务器异常: ' + error.message, data: null });
  }
}

module.exports = { myList };
