/**
 * @name component/create
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 新增组件（封装 save，不需要传 id）
 */

/**
 * @api {post} /api/dkBi/component/create 新增组件
 * @apiName CreateComponent
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription 新增“我的组件”（IsPublic 默认 0）。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 * @apiBody {String} componentName 组件名称（必填）
 * @apiBody {String} [componentDesc] 组件描述（可选）
 * @apiBody {String|Object} [componentData] 组件内容（建议 JSON 字符串，可传对象）
 * @apiBody {String} [previewImage] 组件预览图文件名（由上传接口返回）
 * @apiBody {Object} [visibility] 可见性（scope=all/self/company/users）
 * @apiBody {String="all","self","company","users"} [visibility.scope] scope
 * @apiBody {String} [visibility.company] 企业（scope=company 必填）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 必填）
 */

const { save } = require('../save/save');

async function create(req, res) {
  // 明确为新增：清理 id，避免误更新
  if (req && req.body) {
    delete req.body.id;
  }
  return save(req, res);
}

module.exports = { create };
