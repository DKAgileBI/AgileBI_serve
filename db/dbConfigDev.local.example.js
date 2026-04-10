/**
 * 本地开发数据库配置模板（不会提交到 Git）
 * 使用方法：复制本文件为 dbConfigDev.local.js，并填写你的数据库信息。
 */

const mysql = {
    host: '127.0.0.1',
    port: 3306,
    user: '',
    password: '',
    database: '',
    connectTimeout: 20000
}

module.exports = mysql