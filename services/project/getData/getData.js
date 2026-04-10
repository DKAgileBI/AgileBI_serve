/**
 * @name getData/getData
 * @author Mr·Fan DkPlusAI
 * @Time 2025/10/22
 * @description 查询项目详情
 **/
/**
 * @api {get} /api/dkBi/project/getData 获取项目详情
 * @apiName GetProjectData
 * @apiGroup Project
 * @apiVersion 1.0.0
 * @apiDescription
 * 查询指定项目的详细信息（包含项目主表与项目数据表联合查询）。<br>
 * - 若项目未发布（`State = -1`），仅在编辑或新增模式（`type=edit|add`）下可访问；未登录时也可访问，但仍要求使用服务端下发的加密 `projectId`；<br>
 * - 若项目已发布（`State != -1`），无论是否预览模式，均按项目 `Visibility.scope`（`all/self/company/users`）进行可见性判断；<br>
 *   - `scope=all`：允许未登录访问；
 *   - `scope=self/company/users`：需登录且满足权限；
 * - 已删除项目（`IsDelete=1`）不会返回。
 *
 * 安全说明：未登录访问时，仅支持加密 projectId（避免通过数字枚举猜中项目）；未发布项目在 `type=edit|add` 时同样遵循该限制。
 *
 * @apiHeader {String} Authorization 用户 Token（可选）
 *
 * @apiQuery {String} projectId 项目ID（必填，推荐传加密ID：来自项目列表返回的 id）
 * @apiQuery {String} [type] 查询模式，可选值：
 * - `edit`：编辑模式（允许访问未发布项目）<br>
 * - `add`：新增模式（允许访问未发布项目）<br>
 * - `preview`：预览模式（已发布项目仍按 Visibility 判断访问权限）<br>
 * - 其他值或未传：仅能访问已发布项目
 *
 * @apiExample {curl} 请求示例:
 * curl -X GET "https://api.dkbi.com/api/dkBi/project/getData?projectId=<加密ID>&type=edit" \
 *      -H "Authorization: Bearer <token>"
 *
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 项目详情数据对象
 * @apiSuccess (200) {String} data.content 项目内容（JSON字符串）
 * @apiSuccess (200) {String} data.createTime 创建时间
 * @apiSuccess (200) {String} data.createUserName 创建人
 * @apiSuccess (200) {String} data.id 项目ID（加密/转义后的 token）
 * @apiSuccess (200) {String} data.indexImage 项目封面图
 * @apiSuccess (200) {Number} data.isDelete 是否删除（0=否，1=是）
 * @apiSuccess (200) {String} data.projectName 项目名称
 * @apiSuccess (200) {String} data.remarks 项目备注
 * @apiSuccess (200) {Number} data.state 项目状态（-1=未发布，1=已发布）
 *
 * @apiSuccessExample {json} 成功响应示例:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "查询成功",
 *   "data": {
 *     "content": "{ \"editCanvasConfig\": {...} }",
 *     "createTime": "2025-10-30T12:00:00.000Z",
 *     "createUserName": "管理员",
 *     "id": "p1_xxxxxxxx",
 *     "indexImage": "https://example.com/cover.jpg",
 *     "isDelete": 0,
 *     "projectName": "销售分析看板",
 *     "remarks": "季度销售趋势",
 *     "state": 1
 *   }
 * }
 *
 * @apiErrorExample {json} 参数缺失:
 * HTTP/1.1 400 Bad Request
 * {
 *   "code": 500,
 *   "msg": "请传入必要参数projectId",
 *   "data": null
 * }
 *
 * @apiErrorExample {json} 未发布但非编辑模式:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": 500,
 *   "msg": "该项目未发布，无法查看",
 *   "data": null
 * }
 *
 * @apiErrorExample {json} 未找到项目:
 * HTTP/1.1 404 Not Found
 * {
 *   "code": 500,
 *   "msg": "未查询到当前模板",
 *   "data": null
 * }
 *
 * @apiErrorExample {json} 服务异常:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "服务器内部错误: connect ECONNREFUSED ::1:3306",
 *   "data": null
 * }
 *
 * @apiSampleRequest /api/dkBi/project/getData
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-10-22
 */

const { execSql } = require('../../../utils/index');
const jwt = require('jsonwebtoken');
const nodeConfig = require('../../../config/node.config.json');
const { PRIVATE_KEY } = require('../../../utils/Statuscode');
const { resolveProjectId, encodeProjectId } = require('../../../utils/projectIdCodec');
const {
  parseJsonMaybe,
  extractTokenFromReq,
  getUserRowFromReq,
  isAdminUser,
  normalizeVisibility,
  canViewPublishedProject
} = require('../_permission');
const {
  validationResult
} = require('express-validator');
const {
    CODE_ERROR,
    CODE_SUCCESS,
} = require('../../../utils/Statuscode');

function getData (req,res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const mistake = '请传入必要参数projectId';
    res.json({
      code: CODE_ERROR,
      msg: mistake,
    })
    res.end()
  } else {
    const { projectId: projectIdRaw } = req.query
    const isType = req.query.type
    // 未登录访问时：要求 projectId 必须是服务端下发的加密 token，禁止纯数字枚举
    // 注意：系统其它接口通常传的是“原始 token 字符串”（不带 Bearer），这里兼容两种
    const token = extractTokenFromReq(req);
    let hasValidToken = false;
    if (token) {
      try {
        jwt.verify(token, PRIVATE_KEY);
        hasValidToken = true;
      } catch (e) {
        hasValidToken = false;
      }
    }

    const allowPlainNumber = hasValidToken;
    const projectId = resolveProjectId(projectIdRaw, { allowPlainNumber });
    if (!projectId) {
      const msg = allowPlainNumber
        ? 'projectId 参数错误'
        : 'projectId 参数错误（未登录访问仅支持加密ID）';
      return res.json({
        code: CODE_ERROR,
        msg,
        data: null
      })
    }

    const query = `
      SELECT
        p.Id,
        p.ProjectName,
        p.State,
        p.CreateTime,
        p.CreateUserName,
        p.CreateUserId,
        p.IsDelete,
        p.IndexImage,
        p.Remarks,
        p.Visibility,
        d.ProjectId,
        d.ContentData
      FROM Led_Projects p
      LEFT JOIN Led_Projectdatas d
        ON p.Id = d.ProjectId
      WHERE p.Id = ? AND p.IsDelete = 0
      LIMIT 1;
      `;

    execSql(query, [projectId]).then(async (dataInof) => {
      if (!dataInof || dataInof.length === 0) {
        res.json({
          code: CODE_ERROR,
          msg: '未查询到当前模板',
          data: null
        })
      } else { 
        const row = dataInof[0];
        const {
          ContentData, CreateTime, CreateUserName,
          ProjectId, IndexImage, IsDelete, ProjectName,
          Remarks, State
        } = row

        // 权限：未发布项目（State=-1）仅在 edit/add 模式开放；未登录时允许基于加密 projectId 访问
        // 已发布项目按 Visibility(scope) 控制：all/self/company/users + projects_user_permission
        let userRow = null;
        if (hasValidToken) {
          try {
            userRow = await getUserRowFromReq(req);
          } catch (e) {
            userRow = null;
          }
        }

        const admin = isAdminUser(userRow);
        const ownerAccount = CreateUserName ? String(CreateUserName) : '';
        const currentAccount = userRow && userRow.account ? String(userRow.account) : '';
        const isOwner = !!(ownerAccount && currentAccount && ownerAccount === currentAccount);

        if (Number(State) === -1) {
          if (!(isType === 'add' || isType === 'edit')) {
            return res.json({
              code: CODE_ERROR,
              msg: '该项目未发布，无法查看',
              data: null
            })
          }
          if (userRow && !admin && !isOwner) {
            // 草稿：允许 company/users 定向授权用户在编辑模式查看（不开放 scope=all 的草稿匿名/全员可见）
            const visibility = normalizeVisibility(parseJsonMaybe(row.Visibility, { scope: 'self' }) || { scope: 'self' }, userRow);
            const scope = String(visibility.scope || 'self');
            if (scope === 'users' || scope === 'company') {
              const canView = await canViewPublishedProject(row, userRow);
              if (!canView) {
                return res.json({
                  code: CODE_ERROR,
                  msg: '无权限查看该未发布项目',
                  data: null
                })
              }
            } else {
              return res.json({
                code: CODE_ERROR,
                msg: '无权限查看该未发布项目',
                data: null
              })
            }
          }
        } else {
          const visibility = normalizeVisibility(parseJsonMaybe(row.Visibility, { scope: 'self' }) || { scope: 'self' }, userRow);
          // 未登录时：仅允许 Visibility.scope=all 的已发布项目
          if (!userRow && String(visibility.scope) !== 'all') {
            return res.json({
              code: CODE_ERROR,
              msg: '该项目需要登录后查看',
              data: null
            })
          }

          const canView = await canViewPublishedProject(row, userRow);
          if (!canView) {
            return res.json({
              code: CODE_ERROR,
              msg: '无权限查看该项目',
              data: null
            })
          }
        }

        const resJson={
            code: CODE_SUCCESS,
            msg: '查询成功',
            data: {
              content: ContentData || '',
              createTime: CreateTime,
              createUserName: CreateUserName,
              id: encodeProjectId(ProjectId),
              indexImage: IndexImage,
              isDelete: IsDelete,
              projectName: ProjectName,
              remarks: Remarks,
              state: State
            }
          }
        return res.json(resJson)
      }
    }).catch((err) => {
      let mag = ''
      console.log("err", err)
      if (nodeConfig.environment === 'text') {
          mag = err
      }
      res.json({
          code: CODE_ERROR,
          msg: '服务器内部错误' + mag,
          data: null
      })
      res.end()
    })
  }
}

module.exports = {
  getData
}