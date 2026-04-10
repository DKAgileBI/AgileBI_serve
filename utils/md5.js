/**
 * @name md5
 * @author Mr·Fan DkPlusAI
 * @Time 2021/12/28
 * @property {module} crypto  引入crypto加密模块
 * @description MD5加密
 **/

const crypto = require('crypto');

function md5 (s) {
    return crypto.createHash('md5').update('' + s).digest('hex');
}
module.exports = md5;