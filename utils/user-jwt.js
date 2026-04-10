/**
 * @name user-jwt
 * @author Mr·Fan DkPlusAI
 * @Time 2021/12/28
 * @property {module} jwt  引入验证jsonwebtoken模块
 * @property {module} expressJwt 引入express-jwt模块
 * @property {module} PRIVATE_KEY 引入自定义的jwt密钥
 * @function jwtAuth  检验token
 * @function decode   解析token
 * @description jwt  Token 认证
 **/
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { PRIVATE_KEY } = require('./Statuscode');
const Whitelist = require('../config/jwt_Whitelist.json')

function normalizeTokenValue(token) {
    if (token === undefined || token === null) return '';
    const value = String(token).trim();
    if (!value) return '';
    if (/^Bearer\s+/i.test(value)) {
        return value.replace(/^Bearer\s+/i, '').trim();
    }
    return value;
}
// 验证token是否过期
const jwtAuth = expressJwt({
    // 设置密钥
    secret: PRIVATE_KEY,
    algorithms: ['HS256'],
    // 设置为true表示校验，false表示不校验
    credentialsRequired: true,
    // 自定义获取token的函数
    getToken: (req) => {
        if (req.headers.authorization) {
            return normalizeTokenValue(req.headers.authorization)
        } else if (req.query && req.query.token) {
            return normalizeTokenValue(req.query.token)
        }
    }
}).unless({
    path: Whitelist
})

// jwt-token解析
function decode (req) {
    const token = normalizeTokenValue(req.get('Authorization'))
    return jwt.verify(token, PRIVATE_KEY);
}

module.exports = {
    jwtAuth,
    decode
}