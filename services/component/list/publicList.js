/**
 * @name component/list/public
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 公共组件列表
 */

/**
 * @api {get} /api/dkBi/component/publicList 公共组件分页列表
 * @apiName PublicComponentList
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取共享组件列表（与 datasets/public 一致）：<br>
 * - 共享范围：visibility.scope in (all/company/users)，不包含 self（仅自己）<br>
 * - 管理员：可见所有共享组件<br>
 * - 非管理员：按 visibility 规则过滤（all/company/users；users=权限表 components_user_permission）
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 *
 * @apiQuery {Number} [page=1] 页码
 * @apiQuery {Number} [pageSize=10] 每页数量（1-200）
 * @apiQuery {String} [keyword] 关键词（按组件名 ComponentName 模糊匹配）
 * @apiQuery {String} [componentType] 类型（精确匹配 ComponentType，例如：柱状图/下拉选择器/组合控件）
 *
 * @apiSuccess (200) {Number} code 状态码
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 分页数据
 * @apiSuccess (200) {Object[]} data.list 列表
 * @apiSuccess (200) {Number} data.page 页码
 * @apiSuccess (200) {Number} data.pageSize 每页数量
 * @apiSuccess (200) {Number} data.total 总数
 */

const { execSql } = require('../../../utils/index');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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

async function publicList(req, res) {
  try {
    const user = req.userFFK || {};
    const isAdmin = isAdminUser(user);
    const account = user && user.account ? String(user.account) : '';
    const userCompany = getUserCompany(user);

    let { page, pageSize, keyword, componentType } = req.query || {};
    page = toNumber(page);
    pageSize = toNumber(pageSize);
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, Math.floor(pageSize)) : 10;
    const offset = (safePage - 1) * safePageSize;

    const where = ['IsDelete=0'];
    const params = [];

    // 公共组件：只允许 all/company/users（不包含 self）
    where.push("JSON_UNQUOTE(JSON_EXTRACT(Visibility, '$.scope')) IN ('all','company','users')");

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

    if (!isAdmin) {
      where.push(`(
        JSON_UNQUOTE(JSON_EXTRACT(Visibility, '$.scope')) = 'all'
        OR (
          JSON_UNQUOTE(JSON_EXTRACT(Visibility, '$.scope')) = 'company'
          AND (TRIM(CAST(JSON_EXTRACT(Visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(Visibility, '$.companyLabel'))) = ?)
        )
        OR (
          JSON_UNQUOTE(JSON_EXTRACT(Visibility, '$.scope')) = 'users'
          AND EXISTS (
            SELECT 1 FROM components_user_permission p
            WHERE p.componentId = led_components.Id AND p.userAccount = ?
          )
        )
      )`);
      params.push(userCompany, userCompany, account);
    }

    const countSql = `
      SELECT COUNT(1) AS total
      FROM led_components
      WHERE ${where.join(' AND ')}
    `;
    const countRows = await execSql(countSql, params);
    const total = countRows && countRows[0] && countRows[0].total !== undefined && countRows[0].total !== null
      ? Number(countRows[0].total)
      : 0;

    const sql = `
      SELECT
        Id AS id,
        ComponentName AS componentName,
        ComponentDesc AS componentDesc,
        PreviewImage AS previewImage,
        IsPublic AS isPublic,
        Visibility AS visibility,
        ComponentType AS componentType,
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
    return res.json({
      code: CODE_SUCCESS,
      msg: '操作成功',
      data: {
        list: rows || [],
        page: safePage,
        pageSize: safePageSize,
        total,
      }
    });
  } catch (error) {
    return res.json({ code: CODE_ERROR, msg: '服务器异常: ' + error.message, data: null });
  }
}

module.exports = { publicList };
