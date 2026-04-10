/**
 * @name serveUser.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/02
 * @description userServe  用户模块
 **/

/**
 * @api {post} /api/login 用户登录
 * @apiGroup User
 * @apiDescription 用于用户登录接口
 *
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 *
 * @apiError {String} msg 错误信息
 * @apiErrorExample {json} error-example
 * {
 *   "code": "1",
 *   "msg": "用户名不存在"
 * }
 *
 * @apiSuccess {Number} code 状态码，200 表示成功
 * @apiSuccess {String} msg 成功消息
 * @apiSuccess {Object} data 返回的数据
 * @apiSuccess {String} data.token 登录成功后返回的 token
 * @apiSuccess {Object} data.userData 用户的详细信息
 * @apiSuccess {Number} data.userData.id 用户 ID
 * @apiSuccess {String} data.userData.username 用户名
 * @apiSuccess {String} data.userData.phone 手机号
 * @apiSuccess {String} data.userData.email 邮箱
 * @apiSuccess {String} data.userData.remark 用户备注
 * @apiSuccess {Number} data.userData.gender 用户性别（1 表示男，2 表示女）
 * @apiSuccess {String} data.userData.company 公司名称
 * @apiSuccess {String} data.userData.created 用户创建时间
 * @apiSuccess {String} data.userData.updated_at 用户更新时间
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "登录成功",
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzQ0MDA4ODU3LCJleHAiOjE3NDQwOTUyNTd9.9Xmvrxubc3TH5JBodL-5dLH0t_8uJTEuyRFVCZKdbBE",
 *     "userData": {
 *       "id": 1,
 *       "username": "mr·Fan",
 *       "phone": "15832888888",
 *       "email": "1038888888@qq.com",
 *       "remark": "超级管理员",
 *       "gender": 1,
 *       "company": "dkPlus",
 *       "created": "2025-04-02T06:40:10.000Z",
 *       "updated_at": "2025-04-02T06:40:10.000Z"
 *     }
 *   }
 * }
 * @apiSampleRequest /api/dkBi/sys/login
 * @apiDescription 作者：FanKai  
 * 更新时间： 2025/04/02
 */

const { querySql, execSql, execTransaction } = require('../../../utils/index');
const nodeConfig = require('../../../config/node.config.json')
const md5 = require('../../../utils/md5');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const boom = require('boom');
const { body, validationResult } = require('express-validator');
const {
    CODE_ERROR,
    CODE_SUCCESS,
    PRIVATE_KEY,
    JWT_EXPIRED
} = require('../../../utils/Statuscode');


function login (req, res, next) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const mistake = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '请传入必要参数,username,password';
        res.json({
            code: CODE_ERROR,
            msg: mistake,
        })
        res.end()
    } else {
            let { username, password } = req.body;
            password = md5(password);
            const query = 'select * from users where account = ? and password = ?';
            execSql(query, [username, password]).then(user => {
            if (!user || user.length === 0) {
                res.json({
                    code: CODE_ERROR,
                    msg: '用户名或密码错误',
                    data: null
                })
            } else {
                // 若库里存在 enabled 字段，则未启用用户禁止登录
                if (user[0] && Object.prototype.hasOwnProperty.call(user[0], 'enabled')) {
                    const enabled = Number(user[0].enabled);
                    if (enabled !== 1) {
                        res.json({
                            code: CODE_ERROR,
                            msg: '账号未启用，请联系管理员',
                            data: null
                        })
                        return res.end()
                    }
                }
                const sessionVersion = uuidv4();
                const querySessionVersion = `UPDATE users SET sessionVersion = ? WHERE account = ?`
                const SessionVersionParams = [sessionVersion, username];
                execSql(querySessionVersion, SessionVersionParams).then(() => {
                    const {
                        uid, phone, email, account,
                        remark, gender, company, role,
                        created_at, updated_at, avatar
                    } = user[0]
                    // 登录成功， 签发一个token并返回给前端
                    const token = jwt.sign(
                        // payload：签发的 token 里面要包含的一些数据。
                        { username, sessionVersion,company,role,iid:uid },
                        // 私钥
                        PRIVATE_KEY,
                        // 设置过期时间
                        { expiresIn: JWT_EXPIRED }
                    )
                    
                    let userData = {
                        id: uid,
                        username: user[0].username,
                        accout: account,
                        phone: phone,
                        email: email,
                        remark: remark,
                        gender: gender,
                        company: company,
                        role: role,
                        created: created_at,
                        updated_at: updated_at,
                        avatar: avatar,
                    };
                    res.json({
                        code: CODE_SUCCESS,
                        msg: '登录成功',
                        data: {
                            token: {
                                tokenValue: token,
                                tokenName:'Authorization'
                            },
                        userinfo:userData
                        }
                    })
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
                });
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
    };
}

/**
 * @api {post} /api/dkBi/sys/register 用户注册
 * @apiName Register
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription
 * 注册新用户。<br>
 * - 服务端固定写入角色：普通用户（不接受前端传 role）<br>
 * - 新注册用户默认 enabled=0（未启用），需要管理员启用后才能登录<br>
 * - 注册前需要先调用 /api/dkBi/sys/email/sendCode 发送邮箱验证码<br>
 * - 注册成功不返回 token
 *
 * @apiParam {String} username 登录账号（只能字母数字）
 * @apiParam {String} password 密码
 * @apiParam {String} email 邮箱
 * @apiParam {String} emailCode 邮箱验证码（6位数字）
 * @apiParam {String} [nickname] 昵称/展示名（不传则与账号相同）
 * @apiParam {String} [phone] 手机号
 * @apiParam {String} [company] 公司名称
 * @apiParam {Number} [gender] 性别（0未知/1男/2女）
 * @apiParam {String} [avatar] 头像URL
 * @apiParam {String} [remark] 备注
 *
 * @apiExample {curl} 请求示例:
 * curl -X POST "http://127.0.0.1:3041/api/dkBi/sys/register" \
 *   -H "Content-Type: application/json" \
 *   -d "{\"username\":\"test001\",\"password\":\"abc123\",\"email\":\"test001@example.com\",\"emailCode\":\"123456\",\"nickname\":\"测试用户\"}"
 *
 * @apiSuccess {Number} code 状态码，200 表示成功
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object|null} data 注册接口成功时 data 固定为 null
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "注册成功，等待启用",
 *   "data": null
 * }
 *
 * @apiError {Number} code 错误码
 * @apiError {String} msg 错误信息
 * @apiError {Object|null} data 固定为 null
 * @apiErrorExample {json} 失败响应示例（用户名不合法）:
 * {
 *   "code": -1,
 *   "msg": "用户名只能包含字母和数字",
 *   "data": null
 * }
 * @apiErrorExample {json} 失败响应示例（账号已存在）:
 * {
 *   "code": -1,
 *   "msg": "账号已存在",
 *   "data": null
 * }
 *
 * @apiSampleRequest /api/dkBi/sys/register
 * @apiDescription 作者：FanKai  
 * 更新时间：2026-01-09
 */
async function register (req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        return res.json({
            code: CODE_ERROR,
            msg: (err.array && err.array()[0] && err.array()[0].msg)
                ? err.array()[0].msg
                : '请传入必要参数,username,password',
            data: null
        })
    }

    const {
        username,
        password,
        nickname,
        phone,
        email,
        emailCode,
        company,
        gender,
        avatar,
        remark
    } = req.body || {}

    const account = username;
    const userDisplayName = nickname || username;
    const passwordHash = md5(password);
    const sessionVersion = uuidv4();
    const userRole = '普通用户';

    const companyValue = company === undefined || company === null ? '' : String(company).trim();
    if (!companyValue) {
        return res.json({
            code: CODE_ERROR,
            msg: 'company 必填',
            data: null
        })
    }

    const codeHash = md5(String(emailCode) + PRIVATE_KEY);

    try {
        // 1) 校验邮箱验证码（只接受未使用的最新一条）
        const verifySql = `SELECT id, expire_at FROM email_code
            WHERE email = ? AND code_hash = ? AND used = 0
            ORDER BY created_at DESC LIMIT 1`;
        const codeRows = await execSql(verifySql, [email, codeHash]);
        const codeRow = codeRows && codeRows[0];
        if (!codeRow) {
            return res.json({
                code: CODE_ERROR,
                msg: '邮箱验证码错误或已失效',
                data: null
            })
        }
        const expireAt = new Date(codeRow.expire_at).getTime();
        if (Date.now() > expireAt) {
            return res.json({
                code: CODE_ERROR,
                msg: '邮箱验证码已过期，请重新获取',
                data: null
            })
        }

        // 2) 校验账号/邮箱是否存在
        const accountRows = await execSql('SELECT uid FROM users WHERE account = ? LIMIT 1', [account]);
        if (accountRows && accountRows.length > 0) {
            return res.json({
                code: CODE_ERROR,
                msg: '账号已存在',
                data: null
            })
        }
        const emailRows = await execSql('SELECT uid FROM users WHERE email = ? LIMIT 1', [email]);
        if (emailRows && emailRows.length > 0) {
            return res.json({
                code: CODE_ERROR,
                msg: '邮箱已存在',
                data: null
            })
        }

        // 3) 事务：标记验证码已使用 + 创建用户（避免注册失败也消耗验证码）
        const insertSql = `INSERT INTO users (
            username, account, phone, email, password, avatar, remark, role, gender, company, sessionVersion, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        const insertParams = [
            userDisplayName,
            account,
            phone || null,
            email || null,
            passwordHash,
            avatar || null,
            remark || null,
            userRole,
            typeof gender === 'number' ? gender : (gender ? Number(gender) : 0),
            companyValue,
            sessionVersion,
            0
        ]

        await execTransaction([
            { sql: 'UPDATE email_code SET used = 1 WHERE id = ? AND used = 0', params: [codeRow.id] },
            { sql: insertSql, params: insertParams }
        ])

        return res.json({
            code: CODE_SUCCESS,
            msg: '注册成功，等待启用',
            data: null
        })
    } catch (e) {
        let mag = ''
        if (nodeConfig.environment === 'text') {
            mag = e
        }

        if (e && e.code === 'ER_BAD_FIELD_ERROR') {
            return res.json({
                code: CODE_ERROR,
                msg: '数据库字段缺失，请先执行 users/email_code 表升级 SQL',
                data: null
            })
        }

        const errMsg = (e && e.code === 'ER_DUP_ENTRY')
            ? '账号/手机号/邮箱已存在'
            : ('服务器内部错误' + mag)

        return res.json({
            code: CODE_ERROR,
            msg: errMsg,
            data: null
        })
    }
}

/**
 * @api {get} /api/outLogin 用户退出登录
 * @apiName Logout
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription
 * 用户主动退出登录，系统将更新数据库中当前账号的 `sessionVersion` 字段，
 * 使原 JWT token 立即失效。<br>
 * 前端可在退出后清除本地缓存的 token。
 *
 * ---
 *
 * @apiHeader {String} Authorization 登录令牌（格式：`Bearer <token>`）
 *
 * @apiExample {curl} 请求示例:
 * curl -X GET "https://api.dkbi.com/api/outLogin" \
 *      -H "Authorization: Bearer <token>"
 *
 * @apiSuccess (200) {Number} code 状态码（200 表示成功）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object|null} data 响应数据（此接口返回 null）
 *
 * @apiSuccessExample {json} 成功响应示例:
 * HTTP/1.1 200 OK
 * {
 *   "code": 200,
 *   "msg": "退出成功",
 *   "data": null
 * }
 *
 * @apiError (500) {Number} code 状态码（500 表示服务器错误）
 * @apiError (500) {String} msg 错误信息
 * @apiError (500) {Object|null} data 错误时返回 null
 *
 * @apiErrorExample {json} 失败响应示例:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": 500,
 *   "msg": "服务器内部错误: connect ECONNREFUSED ::1:3306",
 *   "data": null
 * }
 *
 * @apiSampleRequest /api/outLogin
 * @apiPermission user
 * @apiDescription 作者：FanKai  
 * 更新时间：2025-04-02
 */
function logout (req, res) {
    const {account}=req.userFFK
    const sessionVersion = uuidv4();
    const querySessionVersion = `UPDATE users SET sessionVersion = ? WHERE account = ?`
    const usernameParams = [sessionVersion, account];
    execSql(querySessionVersion, usernameParams).then(() => {
         res.json({
            code: CODE_SUCCESS,
            msg: '退出成功',
            data: null
        })
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
    });
}
module.exports = {
    login,
    logout,
    register
}