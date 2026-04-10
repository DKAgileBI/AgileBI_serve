/**
 * @name TokenInof
 * @author Mr·Fan DkPlusAI
 * @Time 2025/11/03
 * @property {module} AnalysisToken  解析token
 * @description 解析token
 **/

const jwt = require('jsonwebtoken');

const { querySql } = require('./index');
async function AnalysisToken (req) { 
  const token = req.headers['authorization'];
  const decoded = jwt.decode(token);
  if (!decoded) {
    return 'err'
  }
  const { iid } = decoded;
  const sql = `
    SELECT * FROM users
    WHERE uid = '${iid}'
    LIMIT 1;
  `;
  const result = await querySql(sql);
  const{username,account,role}=result[0]

  return {
    iid,
    username,
    account,
    role
  }
}

module.exports = AnalysisToken;