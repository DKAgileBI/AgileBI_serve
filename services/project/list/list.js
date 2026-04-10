/**
 * @name project/list.js
 * @description 获取项目列表（管理员可看全部；普通用户默认看我的；全部项目=我的+有权限的已发布项目）
 */

/**
 * @api {get} /api/dkBi/project/list 获取项目列表
 * @apiName ProjectList
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取项目分页列表。<br>
 * 安全说明：返回的 `id` 为服务端加密/转义后的项目标识（非数据库自增数字），用于防止通过数字枚举猜测项目详情。
 *
 * @apiHeader {String} Authorization 用户登录 Token（JWT）
 * @apiQuery {Number} pageNum 页码
 * @apiQuery {Number} pageSize 每页数量
 * @apiQuery {String} [id] 列表模式：
 * - `all`：全部项目
 *   - 管理员：返回全部未删除项目
 *   - 非管理员：返回“我创建的 + 我有权限看的已发布项目（Visibility=all/company/users）”
 * - 其他/不传：仅看“我的项目”（创建者=当前账号）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示
 * @apiSuccess {Number} count 总数
 * @apiSuccess {Object[]} data 列表
 * @apiSuccess {String} data.id 加密后的项目ID（用于详情等接口传参）
 */

const { execSql } = require('../../../utils/index');
const nodeConfig = require('../../../config/node.config.json');
const { validationResult } = require('express-validator');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');
const { encodeProjectId } = require('../../../utils/projectIdCodec');
const { getUserRowFromReq, isAdminUser } = require('../_permission');
async function projectList (req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    return res.json({
      code: CODE_ERROR,
      msg: '请传入必要参数,pageNum,pageSize',
    });
  }
  try {
    let { pageNum, pageSize, id } = req.query;
    pageNum = parseInt(pageNum) || 1;
    pageSize = parseInt(pageSize) || 10;
    // 约定：不传=我的项目；id=all=全部项目（管理员=全量；非管理员=我的+有权限的已发布）
    id = id || 'mine';

    const userRow = await getUserRowFromReq(req);
    if (!userRow) {
      return res.json({
        code: CODE_ERROR,
        msg: 'Token 无效或已过期',
      });
    }
    const account = userRow.account;
    const offset = (pageNum - 1) * pageSize;
    const isAdmin = isAdminUser(userRow);
    // ----------------- SQL 构建 -----------------
    const where = ['IsDelete = 0'];
    const params = [];

    if (id !== 'all') {
      // 我的项目
      where.push('CreateUserName = ?');
      params.push(account);
    } else if (!isAdmin) {
      // 非管理员：全部项目=我的+有权限的已发布项目
      // 已发布项目按 Visibility.scope(all/company/users) 判断是否可见
      const userCompany = userRow && userRow.company ? String(userRow.company).trim() : '';

      // 注意：历史数据/升级过程中 Visibility 可能为 NULL，这里用 COALESCE 兜底为 self
      const vExpr = "COALESCE(Visibility, JSON_OBJECT('scope','self'))";
      const condAll = `JSON_UNQUOTE(JSON_EXTRACT(${vExpr}, '$.scope')) = 'all'`;
      const condUsers = `(
        JSON_UNQUOTE(JSON_EXTRACT(${vExpr}, '$.scope')) = 'users'
        AND EXISTS (
          SELECT 1 FROM projects_user_permission pup
          WHERE pup.projectId = Led_Projects.Id
            AND pup.userAccount = ?
          LIMIT 1
        )
      )`;
      const condCompany = userCompany
        ? `(
            JSON_UNQUOTE(JSON_EXTRACT(${vExpr}, '$.scope')) = 'company'
            AND (
              TRIM(CAST(JSON_EXTRACT(${vExpr}, '$.company') AS CHAR)) = ?
              OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(${vExpr}, '$.companyLabel'))) = ?
            )
          )`
        : null;

      // 说明：scope=self 不算“公共可见”，创建者可见已经由 CreateUserName 命中
      const publishedVisibleConds = [condAll, condUsers];
      if (condCompany) {
        publishedVisibleConds.push(condCompany);
      }

      // 草稿/未发布（State=-1）：仅允许“被定向授权”的用户查看（users/company）；不允许 scope=all 草稿被他人看到
      const draftVisibleConds = [condUsers];
      if (condCompany) draftVisibleConds.push(condCompany);

      where.push(`(
        CreateUserName = ?
        OR (
          (
            State <> -1
            AND (
              ${publishedVisibleConds.join('\n              OR ')}
            )
          )
          OR (
            State = -1
            AND (
              ${draftVisibleConds.join('\n              OR ')}
            )
          )
        )
      )`);

      // ✅ 参数顺序必须与 where 子句中问号出现顺序一致
      // 1) CreateUserName
      // 2) 已发布: condUsers
      // 3) 已发布: condCompany（若启用，2个占位符）
      // 4) 未发布: condUsers（注意：condUsers 在草稿条件中会再出现一次）
      // 5) 未发布: condCompany（若启用，2个占位符；同样会再出现一次）
      params.push(account);
      params.push(account);
      if (condCompany) params.push(userCompany, userCompany);
      params.push(account);
      if (condCompany) params.push(userCompany, userCompany);
    } else {
      // 管理员 id=all：全量（仅过滤 IsDelete）
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const listSql = `
      SELECT *
      FROM Led_Projects
      ${whereSql}
      ORDER BY Id DESC
      LIMIT ? OFFSET ?;
    `;
    const totalSql = `
      SELECT COUNT(*) AS total
      FROM Led_Projects
      ${whereSql};
    `;

    const listParams = [...params, pageSize, offset];
    const totalParams = [...params];

    const [list, total] = await Promise.all([
      execSql(listSql, listParams),
      execSql(totalSql, totalParams),
    ]);
    const hiddenFields = ['CreateUserName'];
    const toLowerFirst = str => str.charAt(0).toLowerCase() + str.slice(1);
    const filteredList = list.map(item => {
      const newItem = {};
      for (let key in item) {
        if (!hiddenFields.includes(key)) {
          newItem[toLowerFirst(key)] = item[key];
        }
      }

      // ✅ 对外返回加密/转义后的 id，避免通过数字枚举蒙对详情
      newItem.id = encodeProjectId(item.Id);

      const isSelf = item.CreateUserName === account;

      // 🚀 未来可以在这里接入自定义权限（比如从项目权限表读取）
      // const customPerm = await getCustomPermissions(account, item.Id);
      // customPerm = { canEdit: true, canDelete: false, canPublish: false }

      // 当前逻辑 + 预留点
      const basePerm = {
        canPublish: isAdmin || isSelf,
        canDelete: isAdmin || isSelf,
        canEdit: isAdmin || isSelf,
      };

      // ✅ 将自定义权限与基础权限合并（未来扩展点）
      // 如果以后有 customPerm，就覆盖默认逻辑
      const mergedPerm = {
        ...basePerm,
        // ...(customPerm || {})
      };

      newItem.permissions = mergedPerm;
      return newItem;
    });

    return res.json({
      code: CODE_SUCCESS,
      msg: '请求成功',
      count: total[0]?.total || 0,
      data: filteredList,
    });
  } catch (err) {
    console.error('❌ 项目列表查询异常:', err);
    const msg = nodeConfig.environment === 'text' ? err : '';
    return res.json({
      code: CODE_ERROR,
      msg: '服务器内部错误' + msg,
      data: null,
    });
  }
}

module.exports = { projectList };
