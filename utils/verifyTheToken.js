/**
 * @name verifyToken.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/02
 * @description verifyToken  验证token是否合法
 **/
const { querySql, execSql } = require('./index');
const nodeConfig = require('../config/node.config.json')
const jwt = require('jsonwebtoken');
const {
  PRIVATE_KEY,
  CODE_ERROR,
  CODE_SUCCESS,
  CODE_TOKEN_EXPIRED
} = require('./Statuscode');

function normalizeTokenValue(token) {
  if (token === undefined || token === null) return '';
  const value = String(token).trim();
  if (!value) return '';
  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+/i, '').trim();
  }
  return value;
}

function verifyTokenPublic (req, res, next) { 
  const isTokeHeader = normalizeTokenValue(req.headers['authorization'])
  if (isTokeHeader === undefined || isTokeHeader === null || isTokeHeader === '') {
    return res.status(200).json({
      code: CODE_TOKEN_EXPIRED,
      msg: 'token无效或已过期',
      data: false
    })
  } else { 
    jwt.verify(isTokeHeader, PRIVATE_KEY, (err, decode) => {
      if (err) {
        return res.status(200).json({
          code: CODE_TOKEN_EXPIRED,
          msg: 'token无效或已过期',
          data: false
        })
      }
      const IsToken = jwt.decode(isTokeHeader)
      const username = IsToken.username ? IsToken.username : ''
      let TokenSessionVersion=IsToken.sessionVersion?IsToken.sessionVersion:''
      const query = 'select * from users where account = ?';
      execSql(query, [username]).then(user => { 
        if (!user || user.length === 0) {
          return res.status(200).json({
            code: CODE_ERROR,
            msg: '用户不存在',
            data: false
          });
        }

        // 若库里存在 enabled 字段，则未启用用户禁止使用 token
        if (user[0] && Object.prototype.hasOwnProperty.call(user[0], 'enabled')) {
          const enabled = Number(user[0].enabled);
          if (enabled !== 1) {
            return res.status(200).json({
              code: CODE_TOKEN_EXPIRED,
              msg: '账号未启用，请联系管理员',
              data: false
            })
          }
        }
        const { sessionVersion } = user[0]
        if (TokenSessionVersion===sessionVersion) {
          req.userFFK = user[0];
          next();
        } else {
          res.json({
            code: CODE_TOKEN_EXPIRED,
            msg: '登录状态失效请重新登录',
            data: false
          })
          res.end()
        }
      }).catch((err) => {
            let mag = ''
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
    })
  }
}

module.exports = verifyTokenPublic;