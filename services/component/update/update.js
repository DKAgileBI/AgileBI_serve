/**
 * @name component/update
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 修改组件（封装 save，需要传 id）
 */

/**
 * @api {post} /api/dkBi/component/update 修改组件
 * @apiName UpdateComponent
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription 修改组件信息（创建者或超级管理员可修改）。
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 * @apiBody {Number} id 组件ID（必填）
 * @apiBody {String} componentName 组件名称（必填）
 * @apiBody {String} [componentDesc] 组件描述（可选）
 * @apiBody {String|Object} [componentData] 组件内容（可选）
 * @apiBody {String} [previewImage] 组件预览图文件名（可选）
 * @apiBody {Object} [visibility] 可见性（scope=all/self/company/users）
 * @apiBody {String="all","self","company","users"} [visibility.scope] scope
 * @apiBody {String} [visibility.company] 企业（scope=company 必填）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 必填）
 */

const { save } = require('../save/save');

async function update(req, res) {
  return save(req, res);
}

module.exports = { update };
