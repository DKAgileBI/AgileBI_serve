/**
 * @name Statuscode
 * @author Mr·Fan DkPlusAI
 * @Time 2021/12/28
 * @property {object}  mysql  数据库出口文件
 * @description 项目中间件
 **/

module.exports = {
    CODE_ERROR: -1, // 请求响应失败code码
    CODE_SUCCESS: 200, // 请求响应成功code码
    CODE_TOKEN_EXPIRED: 401, // 授权失败
    PRIVATE_KEY: 'jackchen', // 自定义jwt加密的私钥
    JWT_EXPIRED: 60 * 60 * 24, // 过期时间24小时
}