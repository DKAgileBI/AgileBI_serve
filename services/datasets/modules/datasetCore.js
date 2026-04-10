/**
 * @name datasetCore.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 数据集核心实现文件。
 * 说明：
 * - 本文件存放数据集模块核心实现
 * - 由 services/datasets/datasets.js 聚合导出
 * - 路由层不要直接引用本文件
 */

const nodeConfig = require('../../../config/node.config.json');
const { validationResult } = require('express-validator');
const { execSql, execTransaction } = require('../../../utils');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
}

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function toBoolean(v, defaultValue = false) {
    if (v === undefined || v === null || v === '') return defaultValue;
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return defaultValue;
}

function stringifyJson(value) {
    try {
        return JSON.stringify(value === undefined ? null : value);
    } catch (e) {
        return JSON.stringify(null);
    }
}

function parseJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    const text = String(value);
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function ok(res, data, msg = '请求成功') {
    res.json({
        code: CODE_SUCCESS,
        msg,
        data
    });
    res.end();
}

function fail(res, msg, data = null) {
    res.json({
        code: CODE_ERROR,
        msg,
        data
    });
    res.end();
}

function isAdminUser(user) {
    const account = user && user.account ? String(user.account) : '';
    const role = user && user.role ? String(user.role) : '';
    if (account && account.toLowerCase() === 'admin') return true;
    if (role && role.toLowerCase().includes('admin')) return true;
    if (role && role.includes('管理员')) return true;
    if (role && role.includes('超级管理员')) return true;
    return false;
}

function mapDatasetRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        ownerName: row.ownerName !== undefined && row.ownerName !== null ? String(row.ownerName) : '',
        name: row.name,
        desc: row.desc,
        enabled: Boolean(row.enabled),
        visibility: parseJson(row.visibility),
        requestGlobalConfig: parseJson(row.requestGlobalConfig),
        request: parseJson(row.request),
        createdAt: row.createdAt ? String(row.createdAt) : null,
        updatedAt: row.updatedAt ? String(row.updatedAt) : null
    };
}

function validateDataset(body) {
    if (!body || typeof body !== 'object') return 'body 不能为空';

    if (!isNonEmptyString(body.name)) return 'name 必填';
    if (!body.visibility || typeof body.visibility !== 'object') return 'visibility 必填';
    if (!isNonEmptyString(body.visibility.scope)) return 'visibility.scope 必填';

    const scope = body.visibility.scope;
    if (!['all', 'company', 'users', 'self'].includes(scope)) return 'visibility.scope 必填';

    if (scope === 'company') {
        const c = body.visibility.company;
        if (c === undefined || c === null || String(c).trim().length === 0) return 'visibility.company 必填';
        // companyLabel 可选：用于保存企业名称（字典 label）
        if (Object.prototype.hasOwnProperty.call(body.visibility, 'companyLabel')) {
            const label = body.visibility.companyLabel;
            if (label !== undefined && label !== null && String(label).trim().length === 0) return 'visibility.companyLabel 不能为空';
        }
    }

    if (scope === 'users') {
        if (!Array.isArray(body.visibility.users) || body.visibility.users.length < 1) return '指定用户最少一个';
    }

    if (!body.request || typeof body.request !== 'object') return 'request 必填';
    if (!isNonEmptyString(body.request.requestUrl)) return 'request.requestUrl 必填';

    if (body.request.requestContentType === 'sql') {
        const sql = body.request.requestSQLContent && body.request.requestSQLContent.sql;
        if (!isNonEmptyString(sql)) return 'request.requestSQLContent.sql 必填';
    }

    return null;
}

function normalizeUserAccounts(users) {
    const list = Array.isArray(users) ? users : [];
    const uniq = new Set();
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (!s) continue;
        uniq.add(s);
    }
    return Array.from(uniq);
}

async function syncDatasetUsers(datasetId, users) {
    const accounts = normalizeUserAccounts(users);
    const sqlList = [];

    // 不保留历史：先硬删再插入
    sqlList.push({
        sql: 'DELETE FROM datasets_user_permission WHERE datasetId = ?',
        params: [datasetId]
    });

    for (let i = 0; i < accounts.length; i++) {
        sqlList.push({
            sql: 'INSERT INTO datasets_user_permission (datasetId, userAccount) VALUES (?, ?)',
            params: [datasetId, accounts[i]]
        });
    }

    await execTransaction(sqlList);
    return accounts.length;
}

function getUserCompany(user) {
    const company = user && user.company ? String(user.company).trim() : '';
    return company || '';
}

function hasPermission(dataset, user) {
    if (!dataset) return false;
    if (isAdminUser(user)) return true;

    const visibility = dataset.visibility || {};
    if (visibility.scope === 'all') return true;
    if (visibility.scope === 'self') {
        const ownerAccount = dataset.ownerAccount ? String(dataset.ownerAccount) : '';
        const account = user && user.account ? String(user.account) : '';
        return ownerAccount && account && ownerAccount === account;
    }
    if (visibility.scope === 'company') {
        const c1 = String(visibility.company === undefined || visibility.company === null ? '' : visibility.company).trim();
        const c2 = String(visibility.companyLabel === undefined || visibility.companyLabel === null ? '' : visibility.companyLabel).trim();
        const uc = getUserCompany(user);
        return (uc && c1 === uc) || (uc && c2 === uc);
    }
    if (visibility.scope === 'users') {
        const users = Array.isArray(visibility.users) ? visibility.users : [];
        return users.includes(String(user && user.account ? user.account : ''));
    }
    return false;
}

function canManageDataset(ownerAccount, user) {
    if (isAdminUser(user)) return true;
    const account = user && user.account ? String(user.account) : '';
    return Boolean(account && ownerAccount && account === ownerAccount);
}

/**
 * @api {get} /api/dkBi/datasets 获取数据集分页列表
 * @apiName DatasetsList
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取“我的数据集”分页列表。<br>
 * - 管理员：可见所有（未删除）<br>
 * - 非管理员：仅可见自己创建的数据集（ownerAccount = 当前账号）<br>
 * 注：共享/授权的数据集请走“公共数据集”接口。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 *
 * @apiQuery {Number} [page=1] 页码
 * @apiQuery {Number} [pageSize=10] 每页数量（1-200）
 * @apiQuery {String} [keyword] 关键词（匹配 name/desc）
 * @apiQuery {String} [ownerName] 创建人（仅管理员生效；模糊匹配创建人名称/账号）
 * @apiQuery {String} [enabled] 是否启用（0/1/true/false）
 * @apiQuery {String} [visibilityScope] 可见性 scope（all/self/company/users）
 * @apiQuery {String} [company] 公司（用于筛选 scope=company 的数据集）
 * @apiQuery {Boolean} [includeAuthorized=false] 是否包含“我有权限看到的”数据集（自己创建 + all/company/users 可见）
 *
 * @apiSuccess {Number} code 状态码（200 表示成功）
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 分页数据
 * @apiSuccess {Object[]} data.list 列表
 * @apiSuccess {String} data.list.ownerName 创建人名称
 * @apiSuccess {Number} data.page 页码
 * @apiSuccess {Number} data.pageSize 每页数量
 * @apiSuccess {Number} data.total 总数
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "请求成功",
 *   "data": {
 *     "list": [],
 *     "page": 1,
 *     "pageSize": 10,
 *     "total": 0
 *   }
 * }
 */
async function listDatasets(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    try {
        const user = req.userFFK || {};
        const isAdmin = isAdminUser(user);
        const account = user.account ? String(user.account) : '';
        const userCompany = getUserCompany(user);

        let { page, pageSize, keyword, ownerName, enabled, visibilityScope, company } = req.query || {};

        // 可选：是否查询“自己可见的全部数据集”（自己创建 + 公共可见 + 授权可见）
        // 兼容多个参数名，避免前端改动频繁
        // 但“我的数据集”与“我的项目”保持一致：非管理员强制仅返回自己创建的数据集
        const includeAuthorizedRaw = toBoolean(
            (req.query && (req.query.includeAuthorized ?? req.query.visibleAll ?? req.query.allVisible)),
            false
        );
        const includeAuthorized = isAdmin ? includeAuthorizedRaw : false;

        page = toNumber(page);
        pageSize = toNumber(pageSize);
        const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
        const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, pageSize) : 10;
        const offset = (safePage - 1) * safePageSize;

        const where = ['1=1'];
        const params = [];

        if (isNonEmptyString(keyword)) {
            const kw = `%${String(keyword).trim()}%`;
            where.push('(datasets.name LIKE ? OR datasets.`desc` LIKE ?)');
            params.push(kw, kw);
        }

        if (enabled !== undefined && enabled !== null && enabled !== '') {
            where.push('datasets.enabled = ?');
            params.push(toBoolean(enabled, true) ? 1 : 0);
        }

        // 创建人搜索：仅管理员生效（模糊匹配 ownerName/ownerAccount）
        if (isAdmin && isNonEmptyString(ownerName)) {
            const kw = `%${String(ownerName).trim()}%`;
            where.push('(users.username LIKE ? OR datasets.ownerAccount LIKE ?)');
            params.push(kw, kw);
        }

        if (isNonEmptyString(visibilityScope)) {
            where.push("JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = ?");
            params.push(String(visibilityScope).trim());
            if (String(visibilityScope).trim() === 'company' && isNonEmptyString(company)) {
                where.push("(TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)");
                const cv = String(company).trim();
                params.push(cv, cv);
            }
        } else if (isNonEmptyString(company)) {
            where.push("JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'company'");
            where.push("(TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)");
            const cv = String(company).trim();
            params.push(cv, cv);
        }

        // “我的数据集”：非管理员仅可见自己创建的数据集
        // 公共/共享数据集请走 /dkBi/datasets/public
        if (!isAdmin) {
            if (!account) return fail(res, '当前账号异常，无法查询');

            if (includeAuthorized) {
                where.push(`(
                    datasets.ownerAccount = ?
                    OR JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'all'
                    OR (
                        JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'company'
                        AND (TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)
                    )
                    OR (
                        JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'users'
                        AND EXISTS (
                            SELECT 1 FROM datasets_user_permission p
                            WHERE p.datasetId = datasets.id AND p.userAccount = ?
                        )
                    )
                )`);
                params.push(account, userCompany, userCompany, account);
            } else {
                where.push('datasets.ownerAccount = ?');
                params.push(account);
            }
        }

        const whereSql = where.join(' AND ');

        const queryList = `
            SELECT
                datasets.id,
                users.username AS ownerName,
                datasets.name,
                datasets.\`desc\` AS \`desc\`,
                datasets.enabled,
                datasets.visibility,
                datasets.requestGlobalConfig,
                datasets.request,
                datasets.createdAt,
                datasets.updatedAt
            FROM datasets
            LEFT JOIN users ON users.account = datasets.ownerAccount
            WHERE datasets.IsDelete = 0 AND ${whereSql}
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
        `;
        const queryTotal = `
            SELECT COUNT(*) AS total
            FROM datasets
            LEFT JOIN users ON users.account = datasets.ownerAccount
            WHERE datasets.IsDelete = 0 AND ${whereSql};
        `;

        const [list, total] = await Promise.all([
            execSql(queryList, [...params, safePageSize, offset]),
            execSql(queryTotal, params)
        ]);

        const data = {
            list: Array.isArray(list) ? list.map(mapDatasetRow) : [],
            page: safePage,
            pageSize: safePageSize,
            total: total && total[0] && total[0].total ? Number(total[0].total) : 0
        };

        return ok(res, data);
    } catch (err) {
        console.error('❌ 数据集列表查询异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {get} /api/dkBi/datasets/public 获取公共数据集分页列表
 * @apiName DatasetsPublicList
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取“公共数据集”分页列表（需要登录）。<br>
 * 公共数据集范围：不包含 self（仅自己）。<br>
 * - 管理员：可见所有公共数据集<br>
 * - 非管理员：按 visibility 规则过滤（all / company=同企业 / users=权限表绑定）
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 *
 * @apiQuery {Number} [page=1] 页码
 * @apiQuery {Number} [pageSize=10] 每页数量（1-200）
 * @apiQuery {String} [keyword] 关键词（匹配 name/desc）
 * @apiQuery {String} [enabled] 是否启用（0/1/true/false）
 * @apiQuery {String} [visibilityScope] 可见性 scope（管理员可用；非管理员只会返回已授权数据集）
 * @apiQuery {String} [company] 公司（管理员可用；非管理员不生效）
 *
 * @apiSuccess {String} data.list.ownerName 创建人名称
 */
async function listPublicDatasets(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    try {
        const user = req.userFFK || {};
        const isAdmin = isAdminUser(user);
        const account = user.account ? String(user.account) : '';
        const userCompany = getUserCompany(user);

        let { page, pageSize, keyword, enabled, visibilityScope, company } = req.query || {};
        page = toNumber(page);
        pageSize = toNumber(pageSize);
        const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
        const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, pageSize) : 10;
        const offset = (safePage - 1) * safePageSize;

        const where = ['1=1'];
        const params = [];

        // 公共数据集：只允许 all/company/users（不包含 self）
        where.push("JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) IN ('all','company','users')");

        // 按需求：公共数据集接口只返回“启用”的数据（管理员同样只看启用）
        where.push('datasets.enabled = 1');

        // 非管理员：按 scope 规则过滤（all/company/users）
        if (!isAdmin) {
            if (!account) return fail(res, '当前账号异常，无法查询');
            where.push(`(
                JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'all'
                OR (
                    JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'company'
                    AND (TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)
                )
                OR (
                    JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'users'
                    AND EXISTS (
                        SELECT 1 FROM datasets_user_permission p
                        WHERE p.datasetId = datasets.id AND p.userAccount = ?
                    )
                )
            )`);
            // userCompany 为空时 company 分支自然匹配不到，只会剩 all/users
            params.push(userCompany, userCompany, account);
        }

        if (isNonEmptyString(keyword)) {
            const kw = `%${String(keyword).trim()}%`;
            where.push('(datasets.name LIKE ? OR datasets.`desc` LIKE ?)');
            params.push(kw, kw);
        }

        // enabled 参数对 public 接口不生效（统一只返回 enabled=1）
        void enabled;

        // 额外筛选：管理员可按 visibilityScope/company 过滤
        if (isNonEmptyString(visibilityScope)) {
            const scope = String(visibilityScope).trim();
            if (scope === 'self') return fail(res, 'public 接口不支持 visibilityScope=self');
            if (isAdmin) {
                where.push("JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = ?");
                params.push(scope);
                if (scope === 'company' && isNonEmptyString(company)) {
                    where.push("(TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)");
                    const cv = String(company).trim();
                    params.push(cv, cv);
                }
            }
        } else if (isAdmin && isNonEmptyString(company)) {
            where.push("JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.scope')) = 'company'");
            where.push("(TRIM(CAST(JSON_EXTRACT(datasets.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(datasets.visibility, '$.companyLabel'))) = ?)");
            const cv = String(company).trim();
            params.push(cv, cv);
        }

        const whereSql = where.join(' AND ');
        const queryList = `
            SELECT
                datasets.id,
                users.username AS ownerName,
                datasets.name,
                datasets.\`desc\` AS \`desc\`,
                datasets.enabled,
                datasets.visibility,
                datasets.requestGlobalConfig,
                datasets.request,
                datasets.createdAt,
                datasets.updatedAt
            FROM datasets
            LEFT JOIN users ON users.account = datasets.ownerAccount
            WHERE datasets.IsDelete = 0 AND ${whereSql}
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
        `;
        const queryTotal = `SELECT COUNT(*) AS total FROM datasets WHERE datasets.IsDelete = 0 AND ${whereSql};`;

        const [list, total] = await Promise.all([
            execSql(queryList, [...params, safePageSize, offset]),
            execSql(queryTotal, params)
        ]);

        const data = {
            list: Array.isArray(list) ? list.map(mapDatasetRow) : [],
            page: safePage,
            pageSize: safePageSize,
            total: total && total[0] && total[0].total ? Number(total[0].total) : 0
        };

        return ok(res, data);
    } catch (err) {
        console.error('❌ 公共数据集列表查询异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {get} /api/dkBi/datasets/public/:id 获取公共数据集详情
 * @apiName DatasetsPublicDetail
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取公共数据集详情（需要登录）。<br>
 * 仅允许访问 scope=all/company/users 的数据集；scope=self 的数据集不会在该接口返回。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 */
async function getPublicDatasetDetail(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    try {
        const id = req.params && req.params.id ? req.params.id : null;
        if (!id) return fail(res, 'id 必填');

        const sql = `
            SELECT
                datasets.id,
                datasets.ownerAccount,
                users.username AS ownerName,
                datasets.name,
                datasets.\`desc\` AS \`desc\`,
                datasets.enabled,
                datasets.visibility,
                datasets.requestGlobalConfig,
                datasets.request,
                datasets.createdAt,
                datasets.updatedAt
            FROM datasets
            LEFT JOIN users ON users.account = datasets.ownerAccount
            WHERE datasets.id = ? AND datasets.IsDelete = 0 AND datasets.enabled = 1
            LIMIT 1;
        `;
        const rows = await execSql(sql, [id]);
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        if (!dataset) return fail(res, '数据集不存在');

        const visibility = dataset && dataset.visibility ? dataset.visibility : {};
        if (visibility.scope === 'self') return fail(res, '无权限访问');

        const user = req.userFFK || {};
        const isAdmin = isAdminUser(user);
        if (!isAdmin) {
            // 非管理员：按 visibility 规则判断是否可见
            if (!hasPermission({ ...dataset, ownerAccount: rows && rows[0] ? rows[0].ownerAccount : '' }, user)) return fail(res, '无权限访问');
        }

        return ok(res, dataset);
    } catch (err) {
        console.error('❌ 公共数据集详情查询异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {get} /api/dkBi/datasets/:id 获取数据集详情
 * @apiName DatasetsDetail
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取数据集详情（结构与前端契约一致，request/requestGlobalConfig 原样返回）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 数据集详情
 */
async function getDatasetDetail(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    try {
        const id = req.params && req.params.id ? req.params.id : null;
        if (!id) return fail(res, 'id 必填');

        const sql = `
            SELECT
                datasets.id,
                datasets.ownerAccount,
                users.username AS ownerName,
                datasets.name,
                datasets.\`desc\` AS \`desc\`,
                datasets.enabled,
                datasets.visibility,
                datasets.requestGlobalConfig,
                datasets.request,
                datasets.createdAt,
                datasets.updatedAt
            FROM datasets
            LEFT JOIN users ON users.account = datasets.ownerAccount
            WHERE datasets.id = ? AND datasets.IsDelete = 0
            LIMIT 1;
        `;
        const rows = await execSql(sql, [id]);
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        if (!dataset) return fail(res, '数据集不存在');

        const user = req.userFFK || {};
        const isAdmin = isAdminUser(user);
        if (!isAdmin) {
            const account = user && user.account ? String(user.account) : '';
            const ownerAccount = rows && rows[0] && rows[0].ownerAccount ? String(rows[0].ownerAccount) : '';
            if (!account) return fail(res, '无权限访问');

            // “我的数据集”详情与“我的项目”保持一致：非管理员仅允许访问自己创建的数据集
            const includeAuthorizedRaw = toBoolean(
                (req.query && (req.query.includeAuthorized ?? req.query.visibleAll ?? req.query.allVisible)),
                false
            );
            const includeAuthorized = isAdmin ? includeAuthorizedRaw : false;

            if (!includeAuthorized) {
                // 默认：“我的数据集”详情仅允许访问自己创建的数据集
                if (!ownerAccount || account !== ownerAccount) return fail(res, '无权限访问');
            } else {
                // 扩展模式：允许访问“自己可见”的数据集
                const visibility = dataset && dataset.visibility ? dataset.visibility : {};
                if (visibility.scope === 'users') {
                    const hit = await execSql(
                        'SELECT id FROM datasets_user_permission WHERE datasetId = ? AND userAccount = ? LIMIT 1',
                        [id, account]
                    );
                    if (!hit || hit.length === 0) return fail(res, '无权限访问');
                } else {
                    if (!hasPermission({ ...dataset, ownerAccount }, user)) return fail(res, '无权限访问');
                }
            }
        }

        return ok(res, dataset);
    } catch (err) {
        console.error('❌ 数据集详情查询异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {post} /api/dkBi/datasets 新增数据集
 * @apiName DatasetsCreate
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 新增一个数据集（需要登录）。<br>
 * 后端会按前端字段原样存储 visibility/requestGlobalConfig/request。
 * 当 visibility.scope = users 时，会同步写入 datasets_user_permission（用于权限过滤）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 *
 * @apiParam {String} name 名称（必填）
 * @apiParam {String} [desc] 描述
 * @apiParam {Boolean} [enabled=true] 是否启用
 * @apiParam {Object} visibility 可见性（必填）
 * @apiParam {String="all","self","company","users"} visibility.scope scope（必填）
 * @apiParam {String} [visibility.company] 公司（scope=company 必填）
 * @apiParam {String[]} [visibility.users] 用户列表（scope=users 必填，至少 1 个）
 * @apiParam {Object} requestGlobalConfig 全局请求配置（字段结构与前端一致）
 * @apiParam {Object} request 请求配置（必填，字段结构与前端一致）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 新建后的数据集
 */
async function createDataset(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    const msg = validateDataset(req.body);
    if (msg) return fail(res, msg);

    try {
        const user = req.userFFK || {};
        const ownerAccount = user && user.account ? String(user.account) : '';
        const enabled = toBoolean(req.body.enabled, true);
        const insertSql = `
            INSERT INTO datasets (ownerAccount, name, \`desc\`, enabled, visibility, requestGlobalConfig, request)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        const insertRes = await execSql(insertSql, [
            ownerAccount,
            String(req.body.name).trim(),
            req.body.desc || '',
            enabled ? 1 : 0,
            stringifyJson(req.body.visibility),
            stringifyJson(req.body.requestGlobalConfig),
            stringifyJson(req.body.request)
        ]);

        const insertId = insertRes && insertRes.insertId ? insertRes.insertId : null;
        if (!insertId) return fail(res, '创建失败');

        // scope=users：同步写入权限表；其他 scope：清理
        const visibility = req.body && req.body.visibility ? req.body.visibility : {};
        if (visibility && visibility.scope === 'users') {
            await syncDatasetUsers(insertId, visibility.users);
        } else {
            await execSql('DELETE FROM datasets_user_permission WHERE datasetId = ?', [insertId]);
        }

        const rows = await execSql(
            `SELECT id, name, \`desc\` AS \`desc\`, enabled, visibility, requestGlobalConfig, request, createdAt, updatedAt FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;`,
            [insertId]
        );
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        return ok(res, dataset, '创建成功');
    } catch (err) {
        console.error('❌ 数据集创建异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {put} /api/dkBi/datasets/:id 编辑数据集（全量）
 * @apiName DatasetsUpdate
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 全量更新数据集（管理员或创建者可操作）。
 * 当 visibility.scope = users 时，会覆盖式同步 datasets_user_permission（不保留历史）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 *
 * @apiParam {String} name 名称（必填）
 * @apiParam {String} [desc] 描述
 * @apiParam {Boolean} enabled 是否启用
 * @apiParam {Object} visibility 可见性（必填）
 * @apiParam {Object} requestGlobalConfig 全局请求配置
 * @apiParam {Object} request 请求配置（必填）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 更新后的数据集
 */
async function updateDataset(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    const id = req.params && req.params.id ? req.params.id : null;
    if (!id) return fail(res, 'id 必填');

    const msg = validateDataset(req.body);
    if (msg) return fail(res, msg);

    try {
        const existsRows = await execSql('SELECT id, ownerAccount FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
        if (!existsRows || existsRows.length === 0) return fail(res, '数据集不存在');

        const user = req.userFFK || {};
        const ownerAccount = existsRows[0] && existsRows[0].ownerAccount ? String(existsRows[0].ownerAccount) : '';
        if (!canManageDataset(ownerAccount, user)) return fail(res, '无权限操作');

        const enabled = toBoolean(req.body.enabled, true);
        const visibility = req.body && req.body.visibility ? req.body.visibility : {};

        const sqlList = [];
        sqlList.push({
            sql: `
                UPDATE datasets
                SET name = ?, \`desc\` = ?, enabled = ?, visibility = ?, requestGlobalConfig = ?, request = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?;
            `,
            params: [
                String(req.body.name).trim(),
                req.body.desc || '',
                enabled ? 1 : 0,
                stringifyJson(req.body.visibility),
                stringifyJson(req.body.requestGlobalConfig),
                stringifyJson(req.body.request),
                id
            ]
        });

        // 权限表同步
        sqlList.push({
            sql: 'DELETE FROM datasets_user_permission WHERE datasetId = ?',
            params: [id]
        });
        if (visibility && visibility.scope === 'users') {
            const accounts = normalizeUserAccounts(visibility.users);
            for (let i = 0; i < accounts.length; i++) {
                sqlList.push({
                    sql: 'INSERT INTO datasets_user_permission (datasetId, userAccount) VALUES (?, ?)',
                    params: [id, accounts[i]]
                });
            }
        }

        await execTransaction(sqlList);

        const rows = await execSql(
            `SELECT id, name, \`desc\` AS \`desc\`, enabled, visibility, requestGlobalConfig, request, createdAt, updatedAt FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;`,
            [id]
        );
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        return ok(res, dataset, '更新成功');
    } catch (err) {
        console.error('❌ 数据集更新异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {put} /api/dkBi/datasets/:id/users 绑定指定用户（后端内部/可选）
 * @apiName DatasetsBindUsers
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 后端内部接口（可选）：用于直接覆盖绑定“指定用户可见”的用户列表（仅管理员）。<br>
 * 前端正常使用时无需调用该接口：在新增/编辑接口里，当 visibility.scope = users 时，后端会自动同步写入权限表 datasets_user_permission。<br>
 * - 会更新 datasets.visibility.scope 为 users，并同步更新权限表 datasets_user_permission
 * - 不保留历史：覆盖式保存
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 * @apiParam {String[]} users 用户账号数组（至少 1 个）
 */
async function bindDatasetUsers(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    const id = req.params && req.params.id ? req.params.id : null;
    if (!id) return fail(res, 'id 必填');

    const accounts = normalizeUserAccounts(req.body && req.body.users);
    if (!accounts || accounts.length < 1) return fail(res, '指定用户最少一个');

    try {
        const existsRows = await execSql('SELECT id, ownerAccount, visibility FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
        if (!existsRows || existsRows.length === 0) return fail(res, '数据集不存在');

        const user = req.userFFK || {};
        const ownerAccount = existsRows[0] && existsRows[0].ownerAccount ? String(existsRows[0].ownerAccount) : '';
        if (!canManageDataset(ownerAccount, user)) return fail(res, '无权限操作');

        const oldVisibility = parseJson(existsRows[0].visibility) || {};
        const newVisibility = {
            ...oldVisibility,
            scope: 'users',
            users: accounts
        };

        await execTransaction([
            {
                sql: 'UPDATE datasets SET visibility = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0',
                params: [stringifyJson(newVisibility), id]
            },
            {
                sql: 'DELETE FROM datasets_user_permission WHERE datasetId = ?',
                params: [id]
            },
            ...accounts.map(a => ({
                sql: 'INSERT INTO datasets_user_permission (datasetId, userAccount) VALUES (?, ?)',
                params: [id, a]
            }))
        ]);

        const rows = await execSql(
            `SELECT id, name, \`desc\` AS \`desc\`, enabled, visibility, requestGlobalConfig, request, createdAt, updatedAt FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;`,
            [id]
        );
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        return ok(res, dataset, '保存成功');
    } catch (err) {
        console.error('❌ 数据集绑定用户异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {patch} /api/dkBi/datasets/:id/enabled 启用/停用数据集
 * @apiName DatasetsPatchEnabled
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 启用/停用数据集（管理员或创建者可操作）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 * @apiParam {Boolean} enabled 是否启用
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 更新后的数据集
 */
async function patchDatasetEnabled(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    const id = req.params && req.params.id ? req.params.id : null;
    if (!id) return fail(res, 'id 必填');

    const enabled = req.body && Object.prototype.hasOwnProperty.call(req.body, 'enabled')
        ? req.body.enabled
        : undefined;
    if (enabled === undefined) return fail(res, 'enabled 必填');

    try {
        const existsRows = await execSql('SELECT id, ownerAccount FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
        if (!existsRows || existsRows.length === 0) return fail(res, '数据集不存在');

        const user = req.userFFK || {};
        const ownerAccount = existsRows[0] && existsRows[0].ownerAccount ? String(existsRows[0].ownerAccount) : '';
        if (!canManageDataset(ownerAccount, user)) return fail(res, '无权限操作');

        const enabledBool = toBoolean(enabled, false);
        const updateRes = await execSql(
            'UPDATE datasets SET enabled = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;',
            [enabledBool ? 1 : 0, id]
        );
        const affected = updateRes && typeof updateRes.affectedRows === 'number' ? updateRes.affectedRows : 0;
        if (affected <= 0) return fail(res, '更新失败');

        const rows = await execSql(
            `SELECT id, name, \`desc\` AS \`desc\`, enabled, visibility, requestGlobalConfig, request, createdAt, updatedAt FROM datasets WHERE id = ? LIMIT 1;`,
            [id]
        );
        const dataset = rows && rows[0] ? mapDatasetRow(rows[0]) : null;
        return ok(res, dataset, '更新成功');
    } catch (err) {
        console.error('❌ 数据集启用状态更新异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

/**
 * @api {delete} /api/dkBi/datasets/:id 删除数据集
 * @apiName DatasetsDelete
 * @apiGroup Datasets
 * @apiVersion 1.0.0
 * @apiDescription
 * 删除数据集（假删，设置 IsDelete=1；管理员或创建者可操作）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 数据集ID
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Boolean} data 是否成功
 */
async function deleteDataset(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const msg = (err.array && err.array()[0] && err.array()[0].msg)
            ? err.array()[0].msg
            : '参数校验失败';
        return fail(res, msg);
    }

    const id = req.params && req.params.id ? req.params.id : null;
    if (!id) return fail(res, 'id 必填');

    try {
        const existsRows = await execSql('SELECT id, ownerAccount FROM datasets WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
        if (!existsRows || existsRows.length === 0) return fail(res, '数据集不存在');

        const user = req.userFFK || {};
        const ownerAccount = existsRows[0] && existsRows[0].ownerAccount ? String(existsRows[0].ownerAccount) : '';
        if (!canManageDataset(ownerAccount, user)) return fail(res, '无权限操作');

        const delRes = await execSql('UPDATE datasets SET IsDelete = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0;', [id]);
        const affected = delRes && typeof delRes.affectedRows === 'number' ? delRes.affectedRows : 0;
        if (affected <= 0) return fail(res, '删除失败');

        return ok(res, true, '删除成功');
    } catch (err) {
        console.error('❌ 数据集删除异常:', err);
        const msg = nodeConfig.environment === 'text' ? String(err) : '';
        return fail(res, '服务器内部错误' + msg);
    }
}

module.exports = {
    isAdminUser,
    listDatasets,
    listPublicDatasets,
    getDatasetDetail,
    getPublicDatasetDetail,
    createDataset,
    updateDataset,
    bindDatasetUsers,
    patchDatasetEnabled,
    deleteDataset
};
