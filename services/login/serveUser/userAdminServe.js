/**
 * @name userAdminServe.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/15
 * @description 管理员用户管理（设置角色/启用停用/删除/新增账号）
 **/

const { execSql } = require('../../../utils/index');
const nodeConfig = require('../../../config/node.config.json');
const md5 = require('../../../utils/md5');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

const {
    CODE_ERROR,
    CODE_SUCCESS,
    PRIVATE_KEY
} = require('../../../utils/Statuscode');

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
}

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

/**
 * @api {post} /api/dkBi/sys/user/create 管理员-新增用户账号
 * @apiName AdminCreateUser
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：新增一个用户账号。<br>
 * - 密码会以 md5 存储（与系统现有逻辑保持一致）<br>
 * - enabled 默认 1（启用）
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {String} account 登录账号（字母数字，4-20位）
 * @apiParam {String} password 登录密码（>=6位）
 * @apiParam {String} [username] 展示名/昵称（不传默认同 account）
 * @apiParam {String} [phone] 手机号（可选；如数据库唯一约束冲突会报错）
 * @apiParam {String} [email] 邮箱（可选；如数据库唯一约束冲突会报错）
 * @apiParam {String} [role=普通用户] 角色（示例：普通用户/管理员/admin 等）
 * @apiParam {Number=1} [enabled] 是否启用（0停用/1启用；默认1）
 * @apiParam {String} [company] 公司名称
 * @apiParam {Number=0} [gender] 性别（0未知/1男/2女）
 * @apiParam {String} [avatar] 头像（文件名或URL，取决于你的前端约定）
 * @apiParam {String} [remark] 备注
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {Number|null} data.uid 新建用户 uid
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "创建成功",
 *   "data": {
 *     "uid": 12
 *   }
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/create
 */

async function createUser(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const {
        account,
        password,
        username,
        phone,
        email,
        role,
        enabled,
        company,
        gender,
        avatar,
        remark
    } = req.body || {};

    const passwordHash = md5(String(password));
    const sessionVersion = uuidv4();
    const userRole = isNonEmptyString(role) ? String(role).trim() : '普通用户';
    const userEnabled = typeof enabled === 'number'
        ? enabled
        : (enabled === '0' || enabled === 0 ? 0 : 1);

    const userDisplayName = isNonEmptyString(username) ? String(username).trim() : String(account).trim();
    const userGender = typeof gender === 'number' ? gender : (gender ? toNumber(gender) : 0);

    try {
        const exists = await execSql('SELECT uid FROM users WHERE account = ? LIMIT 1', [account]);
        if (exists && exists.length > 0) {
            return res.json({
                code: CODE_ERROR,
                msg: '账号已存在',
                data: null
            });
        }

        const insertSql = `INSERT INTO users (
            username, account, phone, email, password, avatar, remark, role, gender, company, sessionVersion, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const result = await execSql(insertSql, [
            userDisplayName,
            account,
            phone || null,
            email || null,
            passwordHash,
            avatar || null,
            remark || null,
            userRole,
            Number.isFinite(userGender) ? userGender : 0,
            company || null,
            sessionVersion,
            userEnabled === 1 ? 1 : 0
        ]);

        return res.json({
            code: CODE_SUCCESS,
            msg: '创建成功',
            data: {
                uid: result && result.insertId ? result.insertId : null
            }
        });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        const errMsg = (e && e.code === 'ER_DUP_ENTRY')
            ? '账号/手机号/邮箱已存在'
            : ('服务器内部错误' + mag);

        return res.json({
            code: CODE_ERROR,
            msg: errMsg,
            data: null
        });
    }
}

/**
 * @api {post} /api/dkBi/sys/user/delete 管理员-删除用户账号
 * @apiName AdminDeleteUser
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：删除指定 uid 的用户。<br>
 * - 禁止删除 admin 账号<br>
 * - 禁止删除当前登录账号
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {Number} uid 用户 uid（必填）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Boolean} data 是否成功
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "删除成功",
 *   "data": true
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/delete
 */

async function deleteUser(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const { uid } = req.body || {};
    const targetUid = toNumber(uid);
    if (!Number.isFinite(targetUid) || targetUid <= 0) {
        return res.json({ code: CODE_ERROR, msg: 'uid 参数错误', data: null });
    }

    const currentUid = req.userFFK && req.userFFK.uid ? Number(req.userFFK.uid) : NaN;

    try {
        const rows = await execSql('SELECT uid, account FROM users WHERE uid = ? LIMIT 1', [targetUid]);
        const user = rows && rows[0] ? rows[0] : null;
        if (!user) {
            return res.json({ code: CODE_ERROR, msg: '用户不存在', data: null });
        }

        if (user.account && String(user.account).toLowerCase() === 'admin') {
            return res.json({ code: CODE_ERROR, msg: '禁止删除管理员账号', data: null });
        }

        if (Number.isFinite(currentUid) && currentUid === targetUid) {
            return res.json({ code: CODE_ERROR, msg: '禁止删除当前登录账号', data: null });
        }

        const result = await execSql('DELETE FROM users WHERE uid = ?', [targetUid]);
        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
        if (affected <= 0) {
            return res.json({ code: CODE_ERROR, msg: '删除失败', data: null });
        }

        return res.json({ code: CODE_SUCCESS, msg: '删除成功', data: true });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        return res.json({
            code: CODE_ERROR,
            msg: '服务器内部错误' + mag,
            data: null
        });
    }
}

/**
 * @api {post} /api/dkBi/sys/user/setRole 管理员-设置用户角色
 * @apiName AdminSetUserRole
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：修改指定用户的角色字段 role。
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {Number} uid 用户 uid（必填）
 * @apiParam {String} role 角色（必填）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Boolean} data 是否成功
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "设置成功",
 *   "data": true
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/setRole
 */

async function setUserRole(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const { uid, role } = req.body || {};
    const targetUid = toNumber(uid);
    const newRole = String(role || '').trim();

    if (!Number.isFinite(targetUid) || targetUid <= 0) {
        return res.json({ code: CODE_ERROR, msg: 'uid 参数错误', data: null });
    }
    if (!newRole) {
        return res.json({ code: CODE_ERROR, msg: 'role 不能为空', data: null });
    }

    try {
        const result = await execSql('UPDATE users SET role = ? WHERE uid = ?', [newRole, targetUid]);
        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
        if (affected <= 0) {
            return res.json({ code: CODE_ERROR, msg: '设置角色失败（用户不存在）', data: null });
        }

        return res.json({ code: CODE_SUCCESS, msg: '设置成功', data: true });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
    }
}

/**
 * @api {post} /api/dkBi/sys/user/setEnabled 管理员-启用/停用用户
 * @apiName AdminSetUserEnabled
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：启用/停用指定 uid 用户。<br>
 * - 会同时刷新 sessionVersion，使该用户现有 token 立即失效
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {Number} uid 用户 uid（必填）
 * @apiParam {Number} enabled 是否启用（0停用/1启用）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Boolean} data 是否成功
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "设置成功",
 *   "data": true
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/setEnabled
 */

async function setUserEnabled(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const { uid, enabled } = req.body || {};
    const targetUid = toNumber(uid);
    const enabledValue = (enabled === 1 || enabled === '1') ? 1 : 0;

    if (!Number.isFinite(targetUid) || targetUid <= 0) {
        return res.json({ code: CODE_ERROR, msg: 'uid 参数错误', data: null });
    }

    try {
        const sessionVersion = uuidv4();
        const result = await execSql(
            'UPDATE users SET enabled = ?, sessionVersion = ? WHERE uid = ?',
            [enabledValue, sessionVersion, targetUid]
        );

        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
        if (affected <= 0) {
            return res.json({ code: CODE_ERROR, msg: '设置失败（用户不存在）', data: null });
        }

        return res.json({ code: CODE_SUCCESS, msg: '设置成功', data: true });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
    }
}

/**
 * @api {post} /api/dkBi/sys/user/resetPassword 管理员-重置用户密码
 * @apiName AdminResetUserPassword
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：重置指定 uid 的用户密码。<br>
 * - 密码会以 md5 存储（与系统现有逻辑保持一致）<br>
 * - 会同时刷新 sessionVersion，使该用户现有 token 立即失效
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {Number} uid 用户 uid（必填）
 * @apiParam {String} newPassword 新密码（必填，>=6位）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Boolean} data 是否成功
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "重置成功",
 *   "data": true
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/resetPassword
 */
async function resetPassword(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const { uid, newPassword } = req.body || {};
    const targetUid = toNumber(uid);
    const passwordPlain = String(newPassword || '');
    if (!Number.isFinite(targetUid) || targetUid <= 0) {
        return res.json({ code: CODE_ERROR, msg: 'uid 参数错误', data: null });
    }
    if (!passwordPlain || passwordPlain.length < 6) {
        return res.json({ code: CODE_ERROR, msg: 'newPassword 长度至少6位', data: null });
    }

    try {
        const passwordHash = md5(passwordPlain);
        const sessionVersion = uuidv4();
        const result = await execSql(
            'UPDATE users SET password = ?, sessionVersion = ? WHERE uid = ?',
            [passwordHash, sessionVersion, targetUid]
        );

        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
        if (affected <= 0) {
            return res.json({ code: CODE_ERROR, msg: '重置失败（用户不存在）', data: null });
        }

        return res.json({ code: CODE_SUCCESS, msg: '重置成功', data: true });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
    }
}

/**
 * @api {post} /api/dkBi/sys/user/list 管理员-用户列表查询
 * @apiName AdminUserList
 * @apiGroup AdminUser
 * @apiVersion 1.0.0
 * @apiDescription
 * 仅管理员可用：分页查询用户列表（不返回 password/sessionVersion）。
 *
 * 返回字段说明：
 * - uid：用户主键
 * - account：登录账号
 * - username：展示名/昵称
 * - role：角色
 * - enabled：启用状态
 * - phone/email/avatar/remark/company/gender：来自 users 表
 * - created_at/updated_at：创建/更新时间
 *
 * @apiHeader {String} Authorization 登录 token（必填）
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [pageSize=10] 每页条数（建议<=100）
 * @apiParam {String} [keyword] 关键词（匹配 account/username/email/phone）
 * @apiParam {Number} [enabled] 是否启用（0/1）
 * @apiParam {String} [role] 角色
 * @apiParam {String} [company] 公司（模糊匹配）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {Object[]} data.list 用户列表
 * @apiSuccess {Number} data.list.uid 用户ID
 * @apiSuccess {String} data.list.username 用户展示名/昵称
 * @apiSuccess {String} data.list.account 登录账号
 * @apiSuccess {String} data.list.phone 手机号（可能为 null）
 * @apiSuccess {String} data.list.email 邮箱（可能为 null）
 * @apiSuccess {String} data.list.avatar 头像（可能为 null）
 * @apiSuccess {String} data.list.remark 备注（可能为 null）
 * @apiSuccess {String} data.list.role 角色
 * @apiSuccess {Number} data.list.gender 性别（0未知/1男/2女）
 * @apiSuccess {String} data.list.company 公司名称（可能为 null）
 * @apiSuccess {Number} data.list.enabled 启用状态（0停用/1启用）
 * @apiSuccess {String} data.list.created_at 创建时间
 * @apiSuccess {String} data.list.updated_at 更新时间
 * @apiSuccess {Object} data.pagination 分页信息
 * @apiSuccess {Number} data.pagination.page 当前页码
 * @apiSuccess {Number} data.pagination.pageSize 每页条数
 * @apiSuccess {Number} data.pagination.total 总条数
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "查询成功",
 *   "data": {
 *     "list": [
 *       {
 *         "uid": 1,
 *         "username": "Mr·Fan",
 *         "account": "admin",
 *         "phone": "15832888888",
 *         "email": "1038888888@qq.com",
 *         "avatar": null,
 *         "remark": "超级管理员",
 *         "role": "超级管理员",
 *         "gender": 1,
 *         "company": "dkPlus",
 *         "enabled": 1,
 *         "created_at": "2025-04-02T06:40:10.000Z",
 *         "updated_at": "2026-01-15T08:00:00.000Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "pageSize": 10,
 *       "total": 1
 *     }
 *   }
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/user/list
 */
async function listUsers(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return res.json({ code: CODE_ERROR, msg, data: null });
    }

    const { page, pageSize, keyword, enabled, role, company } = req.body || {};
    const pageNum = Math.max(1, Number(page || 1));
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize || 10)));
    const offset = (pageNum - 1) * sizeNum;

    const whereParts = ['1=1'];
    const params = [];

    if (isNonEmptyString(keyword)) {
        const kw = `%${String(keyword).trim()}%`;
        whereParts.push('(account LIKE ? OR username LIKE ? OR email LIKE ? OR phone LIKE ?)');
        params.push(kw, kw, kw, kw);
    }

    if (enabled === 0 || enabled === 1 || enabled === '0' || enabled === '1') {
        whereParts.push('enabled = ?');
        params.push((enabled === 1 || enabled === '1') ? 1 : 0);
    }

    if (isNonEmptyString(role)) {
        whereParts.push('role = ?');
        params.push(String(role).trim());
    }

    if (isNonEmptyString(company)) {
        whereParts.push('company LIKE ?');
        params.push(`%${String(company).trim()}%`);
    }

    const whereSql = `WHERE ${whereParts.join(' AND ')}`;

    try {
        const countRows = await execSql(`SELECT COUNT(1) AS total FROM users ${whereSql}`, params);
        const total = countRows && countRows[0] && typeof countRows[0].total === 'number'
            ? countRows[0].total
            : Number(countRows && countRows[0] ? countRows[0].total : 0);

        const listSql = `SELECT
            uid, username, account, phone, email, avatar, remark, role, gender, company, enabled, created_at, updated_at
        FROM users
        ${whereSql}
        ORDER BY uid DESC
        LIMIT ? OFFSET ?`;

        const list = await execSql(listSql, [...params, sizeNum, offset]);

        return res.json({
            code: CODE_SUCCESS,
            msg: '查询成功',
            data: {
                list: list || [],
                pagination: {
                    page: pageNum,
                    pageSize: sizeNum,
                    total: Number.isFinite(total) ? total : 0
                }
            }
        });
    } catch (e) {
        let mag = '';
        if (nodeConfig.environment === 'text') {
            mag = e;
        }
        return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
    }
}

module.exports = {
    createUser,
    deleteUser,
    setUserRole,
    setUserEnabled,
    resetPassword,
    listUsers
};
