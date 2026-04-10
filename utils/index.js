/**
 * @name index
 * @author Mr·Fan DkPlusAI
 * @Time 2021/12/28
 * @property {module}  mysql  数据库模块
 * @property {object}  config 数据库链接对象
 * @function querySql  数据库链接开启
 * @function queryOne  查询一条sql语句
 * @function execSql   sql写入
 * @function connect   数据链接内
 * @description 数据链接封装
 **/
const fs = require('fs');
const path = require('path');
const RUN_MODE = process.env.RUN_MODE || 'dev';
function loadDbConfig(runMode) {
    const configFile = runMode === 'online' ? 'dbConfigOnl' : 'dbConfigDev';
    const localConfigPath = path.join(__dirname, '..', 'db', `${configFile}.local.js`);
    const defaultConfigPath = path.join(__dirname, '..', 'db', `${configFile}.js`);

    if (fs.existsSync(localConfigPath)) {
        return require(localConfigPath);
    }

    return require(defaultConfigPath);
}

const config = loadDbConfig(RUN_MODE);
const mysql = require('mysql'); 
const colors = require('colors');

function connect () {
    const { host, user, password, database } = config;
    return mysql.createConnection({
        host,
        user,
        password,
        database
    })
}
// 新建查询连接
function querySql (sql) {
    const conn = connect();
    return new Promise((resolve, reject) => {
        try {
            conn.query(sql, (err, res) => {
                if (err) {
                    reject(err);
                } else {

                    resolve(res);
                }
            })
        } catch (e) {
            reject(e);
        } finally {
            // 释放连接
            conn.end();
        }
    })
}
// 查询一条sql语句
function queryOne (sql) {
    return new Promise((resolve, reject) => {
        querySql(sql).then(res => {
            if (res && res.length > 0) {
                resolve(res[0]);
            } else {
                resolve(null);
            }
        }).catch(err => {
            reject(err);
        })
    })
}
// sql写入
function execSql (sql, params = []) {
    const conn = connect();
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, results) => {
            try {
                if (err) return reject(err);
                resolve(results);
            } finally {
                conn.end();
            }
        });
    });
}

/**
 * @function execTransaction
 * @description 执行多条 SQL 语句（事务控制）
 * @param {Array<{sql: string, params?: any[]}>} sqlList SQL语句数组 [{ sql, params }]
 * @returns {Promise<boolean>} 成功返回 true，否则抛出错误
 */
function execTransaction (sqlList = []) {
    const conn = connect();
    return new Promise(async (resolve, reject) => {
        conn.beginTransaction(async (err) => {
            if (err) {
                conn.end();
                return reject(err);
            }
            try {
                for (const item of sqlList) {
                    await new Promise((res, rej) => {
                        conn.query(item.sql, item.params || [], (err) => {
                            if (err) return rej(err);
                            res();
                        });
                    });
                }
                // ✅ 所有执行成功，提交事务
                conn.commit((err) => {
                    if (err) {
                        return conn.rollback(() => {
                            conn.end();
                            reject(err);
                        });
                    }
                    conn.end();
                    resolve(true);
                });
            } catch (error) {
                // ❌ 任一 SQL 出错，回滚
                conn.rollback(() => {
                    conn.end();
                    reject(error);
                });
            }
        });
    });
}

module.exports = {
    querySql,
    queryOne,
    execSql,
    execTransaction
}