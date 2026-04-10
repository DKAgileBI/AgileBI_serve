/**
 * @name component/delete
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/26
 * @description 删除组件（逻辑删除）
 */

/**
 * @api {post} /api/dkBi/component/delete 删除组件（逻辑删除）
 * @apiName DeleteComponent
 * @apiGroup Component
 * @apiVersion 1.0.0
 * @apiDescription
 * 逻辑删除组件：将 `IsDelete` 置为 1。
 * - 创建者或超级管理员可删除
 *
 * @apiHeader {String} Authorization 用户登录 JWT Token
 * @apiBody {Number} id 组件ID
 */

const { validationResult } = require('express-validator');
const AnalysisToken = require('../../../utils/TokenInof');
const { execSql } = require('../../../utils/index');
const { CODE_SUCCESS, CODE_ERROR } = require('../../../utils/Statuscode');

async function del(req, res) {
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
    const id = Number(req.body.id);

    const rows = await execSql('SELECT * FROM led_components WHERE Id=? AND IsDelete=0', [id]);
    if (!rows || rows.length === 0) {
      return res.json({ code: 404, msg: '记录不存在', data: false });
    }

    const row = rows[0];
    const ownerId = Number(row.CreateUserId);
    if (role !== '超级管理员' && ownerId !== Number(iid)) {
      return res.json({ code: -1, msg: '无权删除他人组件', data: false });
    }

    const sql = `
      UPDATE led_components
      SET IsDelete=1, UpdateUserId=?, UpdateUserName=?, UpdateTime=NOW()
      WHERE Id=?
    `;
    await execSql(sql, [iid, account, id]);

    return res.json({ code: CODE_SUCCESS, msg: '操作成功', data: true });
  } catch (error) {
    return res.json({ code: CODE_ERROR, msg: '服务器异常: ' + error.message, data: null });
  }
}

module.exports = { del };
