/**
 * @name dbConfig
 * @author Mr·Fan DkPlusAI
 * @Time 2025/11/04
 * @property {object}  mysql  数据库出口文件
 * @property {object,host}  mysql.host   主机名称，一般是本机
 * @property {object,number}  mysql.port   数据库端口
 * @property {object,string}  mysql.user   数据库名字
 * @property {object,string}  mysql.database   数据库密码
 * @property {object,number}  mysql.connectTimeout   数据库超时设置
 * @description 数据库入口文件mysql线上环境
 **/

const mysql = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 20000)
}

module.exports = mysql