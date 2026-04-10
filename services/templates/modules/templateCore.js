/**
 * @name templateCore.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 模板核心实现文件。
 * 说明：
 * - 本文件存放模板模块核心实现
 * - 由 services/templates/templates.js 聚合导出
 * - 路由层不要直接引用本文件
 */

const nodeConfig = require('../../../config/node.config.json');
const { validationResult } = require('express-validator');
const { execSql, execTransaction } = require('../../../utils');
const { CODE_ERROR, CODE_SUCCESS } = require('../../../utils/Statuscode');
const { resolveProjectId, encodeProjectId } = require('../../../utils/projectIdCodec');
const { encodeTemplateId, resolveTemplateId } = require('../../../utils/templateIdCodec');
const fs = require('fs');
const multiparty = require('multiparty');
const path = require('path');
const moment = require('moment');
const File = require('../../../utils/File');
const { UPLOAD_PATH_LED_Image, UPLOAD_PATH_TEMPLATE_COVER } = require('../../../db/dbFileConfig');

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

function normalizeLongText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return stringifyJson(value);
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isRemoteUrl(maybeUrl) {
  if (!isNonEmptyString(maybeUrl)) return false;
  const s = String(maybeUrl).trim().toLowerCase();
  return s.startsWith('http://') || s.startsWith('https://');
}

function normalizeIndexImageToRelative(value) {
  if (!isNonEmptyString(value)) return '';
  return String(value).trim().replace(/\\/g, '/').replace(/^\//, '');
}

async function copyIndexImageToTemplateCover(indexImage, user) {
  if (!isNonEmptyString(indexImage)) return null;
  if (isRemoteUrl(indexImage)) return String(indexImage).trim();

  const baseDirs = [UPLOAD_PATH_LED_Image].filter(Boolean);
  const coverDir = UPLOAD_PATH_TEMPLATE_COVER;
  ensureDirSync(coverDir);

  const rel = normalizeIndexImageToRelative(indexImage);
  const candidates = [];

  // 1) 已经是本地绝对路径
  if (path.isAbsolute(rel)) {
    candidates.push(rel);
  }

  // 2) 传入的是相对路径（例如 image/xxx.png、aiImage/xxx.png、upload/image/xxx.png）
  for (let i = 0; i < baseDirs.length; i++) {
    candidates.push(path.join(baseDirs[i], rel));
  }

  if (rel.indexOf('upload/') === 0) {
    const trimmedRel = rel.slice('upload/'.length);
    for (let i = 0; i < baseDirs.length; i++) {
      candidates.push(path.join(baseDirs[i], trimmedRel));
    }
  }

  // 3) 仅文件名（例如 xxx.png）
  for (let i = 0; i < baseDirs.length; i++) {
    candidates.push(path.join(baseDirs[i], path.basename(rel)));
  }

  let srcPath = null;
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    try {
      if (p && fs.existsSync(p) && fs.statSync(p).isFile()) {
        srcPath = p;
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!srcPath) {
    // 找不到本地文件，回退为原值（避免封面丢失）
    return String(indexImage).trim();
  }

  const ext = path.extname(srcPath || '').toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  if (!allowed.includes(ext)) {
    return String(indexImage).trim();
  }

  const uid = user && user.uid ? String(user.uid) : 'user';
  const safeName = `template_cover_${uid}_${Date.now()}${ext}`;
  const dstPath = path.join(coverDir, safeName);

  await new Promise((resolve, reject) => {
    fs.copyFile(srcPath, dstPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 统一存相对路径：templateCover/<file>
  return `templateCover/${safeName}`;
}

/**
 * @api {post} /api/dkBi/templates/uploadCover 上传模板封面图片
 * @apiName TemplateUploadCover
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 上传模板封面图片（图片格式），返回 fileName/relativePath。保存/编辑模板时把返回值写入 `indexImage` 即可。
 *
 * @apiBody {File} object 封面图片文件（multipart/form-data；字段名支持 object / file / cover）
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 返回数据
 * @apiSuccess (200) {String} data.id 文件ID（时间戳）
 * @apiSuccess (200) {String} data.fileName 保存后的文件名
 * @apiSuccess (200) {String} data.relativePath 相对路径（templateCover/<fileName>）
 * @apiSuccess (200) {Number} data.fileSize 文件大小（字节）
 *
 * @apiSampleRequest /api/dkBi/templates/uploadCover
 */
function uploadTemplateCover(req, res) {
  try {
    const uploadDir = UPLOAD_PATH_TEMPLATE_COVER;
    ensureDirSync(uploadDir);

    const form = new multiparty.Form({
      uploadDir,
      maxFilesSize: 25 * 1024 * 1024
    });

    form.on('error', (err) => {
      res.status(500).json({
        code: CODE_ERROR,
        msg: '表单解析失败',
        data: null,
        err: err && err.message ? err.message : String(err)
      });
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(500).json({
          code: CODE_ERROR,
          msg: '文件解析失败',
          data: null,
          err: err && err.message ? err.message : String(err)
        });
      }

      const fileArray = (files && files.object) || (files && files.file) || (files && files.cover) || null;
      const fileInfo = fileArray && fileArray[0] ? fileArray[0] : null;
      if (!fileInfo) {
        return res.json({
          code: CODE_ERROR,
          msg: '请上传封面图片（表单字段名：object / file / cover）',
          data: null
        });
      }

      const fileSize = fileInfo.size;
      const uploadedPath = fileInfo.path;
      const originalFilename = fileInfo.originalFilename;

      const ext = path.extname(originalFilename || '').toLowerCase();
      const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      if (!allowed.includes(ext)) {
        return res.json({
          code: CODE_ERROR,
          msg: '仅支持上传图片格式：png/jpg/jpeg/gif/webp',
          data: null
        });
      }

      const uid = req.userFFK && req.userFFK.uid ? String(req.userFFK.uid) : 'user';
      const safeName = `template_cover_${uid}_${Date.now()}${ext}`;
      const dstPath = path.join(uploadDir, safeName);

      File.rename(uploadedPath, dstPath).then((renameErr) => {
        if (renameErr) {
          return res.status(500).json({
            code: CODE_ERROR,
            msg: '保存封面失败',
            data: null,
            err: String(renameErr)
          });
        }

        res.json({
          code: CODE_SUCCESS,
          msg: '上传成功',
          data: {
            id: moment(Date.now()).format('YYYYMMDDhhmmss'),
            fileName: safeName,
            relativePath: `templateCover/${safeName}`,
            fileSize
          }
        });
        res.end();
      });
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null,
      err: error && error.message ? error.message : String(error)
    });
  }
}

function ok(res, data, msg = '请求成功') {
  res.json({ code: CODE_SUCCESS, msg, data });
  res.end();
}

function fail(res, msg, data = null) {
  res.json({ code: CODE_ERROR, msg, data });
  res.end();
}

function isAdminUser(user) {
  const account = user && user.account ? String(user.account) : '';
  const role = user && user.role ? String(user.role) : '';
  const remark = user && user.remark ? String(user.remark) : '';
  if (account && account.toLowerCase() === 'admin') return true;

  const roleLower = role ? role.toLowerCase() : '';
  const remarkLower = remark ? remark.toLowerCase() : '';

  if (roleLower && roleLower.includes('admin')) return true;
  if (remarkLower && remarkLower.includes('admin')) return true;

  if (role && (role.includes('管理员') || role.includes('超级管理员'))) return true;
  if (remark && (remark.includes('管理员') || remark.includes('超级管理员'))) return true;
  return false;
}

function getUserCompany(user) {
  const company = user && user.company ? String(user.company).trim() : '';
  return company || '';
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

function mapTemplateRow(row) {
  if (!row) return null;
  return {
    id: encodeTemplateId(row.id),
    ownerName: row.ownerName !== undefined && row.ownerName !== null ? String(row.ownerName) : '',
    name: row.name,
    desc: row.desc,
    enabled: Boolean(row.enabled),
    visibility: parseJson(row.visibility),
    indexImage: row.indexImage !== undefined ? row.indexImage : null,
    createdAt: row.createdAt ? String(row.createdAt) : null,
    updatedAt: row.updatedAt ? String(row.updatedAt) : null
  };
}

function hasPermission(templateRow, user) {
  if (!templateRow) return false;
  if (isAdminUser(user)) return true;

  const visibility = templateRow.visibility || {};
  if (visibility.scope === 'all') return true;
  if (visibility.scope === 'self') {
    const ownerAccount = templateRow.ownerAccount ? String(templateRow.ownerAccount) : '';
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

function canManageTemplate(ownerAccount, user) {
  if (isAdminUser(user)) return true;
  const account = user && user.account ? String(user.account) : '';
  return Boolean(account && ownerAccount && account === ownerAccount);
}

async function canUsePublicTemplateByDb(templateId, templateRow, user) {
  if (!templateRow) return false;

  const visibility = templateRow.visibility || {};
  const scope = visibility && visibility.scope ? String(visibility.scope) : '';

  // 公共模板：不包含 self
  if (scope === 'self') return false;

  // 管理员：可见全部公共模板
  if (isAdminUser(user)) return true;

  const account = user && user.account ? String(user.account) : '';
  if (!account) return false;

  if (scope === 'all') return true;

  if (scope === 'company') {
    const c1 = String(visibility.company === undefined || visibility.company === null ? '' : visibility.company).trim();
    const c2 = String(visibility.companyLabel === undefined || visibility.companyLabel === null ? '' : visibility.companyLabel).trim();
    const uc = getUserCompany(user);
    return (uc && c1 === uc) || (uc && c2 === uc);
  }

  if (scope === 'users') {
    // 以授权表为准（visibility.users 可能为空/未同步）
    const rows = await execSql(
      'SELECT 1 AS ok FROM templates_user_permission WHERE templateId = ? AND userAccount = ? LIMIT 1;',
      [templateId, account]
    );
    return Boolean(rows && rows[0] && rows[0].ok);
  }

  return false;
}

function validateTemplate(body) {
  if (!body || typeof body !== 'object') return 'body 不能为空';
  if (!isNonEmptyString(body.name)) return 'name 必填';

  if (!body.visibility || typeof body.visibility !== 'object') return 'visibility 必填';
  if (!isNonEmptyString(body.visibility.scope)) return 'visibility.scope 必填';

  const scope = body.visibility.scope;
  if (!['all', 'company', 'users', 'self'].includes(scope)) return 'visibility.scope 参数错误';

  if (scope === 'company') {
    const c = body.visibility.company;
    if (c === undefined || c === null || String(c).trim().length === 0) return 'visibility.company 必填';
  }

  if (scope === 'users') {
    if (!Array.isArray(body.visibility.users) || body.visibility.users.length < 1) return '指定用户最少一个';
  }

  return null;
}

async function syncTemplateUsers(templateId, users) {
  const accounts = normalizeUserAccounts(users);
  const sqlList = [];
  sqlList.push({ sql: 'DELETE FROM templates_user_permission WHERE templateId = ?', params: [templateId] });
  for (let i = 0; i < accounts.length; i++) {
    sqlList.push({
      sql: 'INSERT INTO templates_user_permission (templateId, userAccount) VALUES (?, ?)',
      params: [templateId, accounts[i]]
    });
  }
  await execTransaction(sqlList);
  return accounts.length;
}

/**
 * @api {get} /api/dkBi/templates 获取模板分页列表（我的模板）
 * @apiName TemplatesList
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取“我的模板”分页列表。<br>
 * - 管理员：可见所有（未删除）<br>
 * - 非管理员：默认仅可见自己创建的模板（ownerAccount = 当前账号）<br>
 * - 可选：includeAuthorized=true 时，返回“我可见的全部模板”（自己创建 + all/company/users 可见）
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 *
 * @apiQuery {Number} [page=1] 页码
 * @apiQuery {Number} [pageSize=10] 每页数量（1-200）
 * @apiQuery {String} [keyword] 关键词（匹配 name/desc）
 * @apiQuery {String} [ownerName] 创建人（仅管理员生效；模糊匹配创建人名称/账号）
 * @apiQuery {String} [enabled] 是否启用（0/1/true/false）
 * @apiQuery {Boolean} [includeAuthorized=false] 是否包含“我有权限看到的”模板
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object} data 分页数据
 * @apiSuccess {Object[]} data.list 列表
 * @apiSuccess {String} data.list.ownerName 创建人名称
 */
async function listTemplates(req, res) {
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
    const account = user && user.account ? String(user.account) : '';
    const userCompany = getUserCompany(user);

    let { page, pageSize, keyword, ownerName, enabled, includeAuthorized } = req.query || {};
    page = toNumber(page);
    pageSize = toNumber(pageSize);
    const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, pageSize) : 10;
    const offset = (safePage - 1) * safePageSize;

    // 约定：“我的模板”与“我的项目”保持一致：
    // - 非管理员：只返回自己创建的（忽略 includeAuthorized 等参数）
    // - 管理员：仍可按原逻辑（但管理员本身可看全量）
    const includeAuth = isAdmin ? toBoolean(includeAuthorized, false) : false;

    const where = ['1=1'];
    const params = [];

    if (isNonEmptyString(keyword)) {
      const kw = `%${String(keyword).trim()}%`;
      where.push('(t.name LIKE ? OR t.`desc` LIKE ?)');
      params.push(kw, kw);
    }

    if (enabled !== undefined && enabled !== null && enabled !== '') {
      where.push('t.enabled = ?');
      params.push(toBoolean(enabled, true) ? 1 : 0);
    }

    // 创建人搜索：仅管理员生效（模糊匹配 ownerName/ownerAccount）
    if (isAdmin && isNonEmptyString(ownerName)) {
      const kw = `%${String(ownerName).trim()}%`;
      where.push('(u.username LIKE ? OR t.ownerAccount LIKE ?)');
      params.push(kw, kw);
    }

    if (!isAdmin) {
      if (!account) return fail(res, '当前账号异常，无法查询');

      // 非管理员强制只查自己创建的
      where.push('t.ownerAccount = ?');
      params.push(account);
    }

    const whereSql = where.join(' AND ');

    const queryList = `
      SELECT
        t.id,
        u.username AS ownerName,
        t.ownerAccount,
        t.name,
        t.\`desc\` AS \`desc\`,
        t.enabled,
        t.visibility,
        t.indexImage,
        t.createdAt,
        t.updatedAt
      FROM led_templates t
      LEFT JOIN users u ON u.account = t.ownerAccount
      WHERE t.IsDelete = 0 AND ${whereSql}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?;
    `;

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM led_templates t
      LEFT JOIN users u ON u.account = t.ownerAccount
      WHERE t.IsDelete = 0 AND ${whereSql};
    `;

    const [list, total] = await Promise.all([
      execSql(queryList, [...params, safePageSize, offset]),
      execSql(queryTotal, params)
    ]);

    return ok(res, {
      list: Array.isArray(list) ? list.map(mapTemplateRow) : [],
      page: safePage,
      pageSize: safePageSize,
      total: total && total[0] && total[0].total ? Number(total[0].total) : 0
    });
  } catch (err2) {
    console.error('❌ 模板列表查询异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {get} /api/dkBi/templates/public 获取公共模板分页列表
 * @apiName TemplatesPublicList
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiDescription
 * 获取“公共模板”分页列表（需要登录）。<br>
 * 公共模板范围：visibility.scope in (all/company/users)，不包含 self（仅自己）。<br>
 * - 管理员：可见所有公共模板<br>
 * - 非管理员：按 visibility 规则过滤（all/company/users；users=权限表 templates_user_permission）
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 */
async function listPublicTemplates(req, res) {
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
    const account = user && user.account ? String(user.account) : '';
    const userCompany = getUserCompany(user);

    let { page, pageSize, keyword, visibilityScope, company } = req.query || {};
    page = toNumber(page);
    pageSize = toNumber(pageSize);
    const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, pageSize) : 10;
    const offset = (safePage - 1) * safePageSize;

    const where = ['1=1'];
    const params = [];

    where.push("JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) IN ('all','company','users')");

    // 按需求：公共模板接口只返回“启用”的数据
    where.push('t.enabled = 1');

    if (isNonEmptyString(keyword)) {
      const kw = `%${String(keyword).trim()}%`;
      where.push('(t.name LIKE ? OR t.`desc` LIKE ?)');
      params.push(kw, kw);
    }

    // 管理员可按 visibilityScope/company 过滤
    if (isNonEmptyString(visibilityScope) && isAdmin) {
      const scope = String(visibilityScope).trim();
      if (scope === 'self') return fail(res, 'public 接口不支持 visibilityScope=self');
      where.push("JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) = ?");
      params.push(scope);
      if (scope === 'company' && isNonEmptyString(company)) {
        const cv = String(company).trim();
        where.push("(TRIM(CAST(JSON_EXTRACT(t.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.companyLabel'))) = ?)");
        params.push(cv, cv);
      }
    } else if (isAdmin && isNonEmptyString(company)) {
      const cv = String(company).trim();
      where.push("JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) = 'company'");
      where.push("(TRIM(CAST(JSON_EXTRACT(t.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.companyLabel'))) = ?)");
      params.push(cv, cv);
    }

    // 非管理员：只取“当前账号权限”的数据；管理员：可看全部公共模板（其他规则不变）
    if (!isAdmin) {
      if (!account) return fail(res, '当前账号异常，无法查询');
      where.push(`(
        JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) = 'all'
        OR (
          JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) = 'company'
          AND (TRIM(CAST(JSON_EXTRACT(t.visibility, '$.company') AS CHAR)) = ? OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.companyLabel'))) = ?)
        )
        OR (
          JSON_UNQUOTE(JSON_EXTRACT(t.visibility, '$.scope')) = 'users'
          AND EXISTS (
            SELECT 1 FROM templates_user_permission p
            WHERE p.templateId = t.id AND p.userAccount = ?
          )
        )
      )`);
      params.push(userCompany, userCompany, account);
    }

    const whereSql = where.join(' AND ');

    const queryList = `
      SELECT
        t.id,
        u.username AS ownerName,
        t.ownerAccount,
        t.name,
        t.\`desc\` AS \`desc\`,
        t.enabled,
        t.visibility,
        t.indexImage,
        t.createdAt,
        t.updatedAt
      FROM led_templates t
      LEFT JOIN users u ON u.account = t.ownerAccount
      WHERE t.IsDelete = 0 AND ${whereSql}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?;
    `;

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM led_templates t
      WHERE t.IsDelete = 0 AND ${whereSql};
    `;

    const [list, total] = await Promise.all([
      execSql(queryList, [...params, safePageSize, offset]),
      execSql(queryTotal, params)
    ]);

    return ok(res, {
      list: Array.isArray(list) ? list.map(mapTemplateRow) : [],
      page: safePage,
      pageSize: safePageSize,
      total: total && total[0] && total[0].total ? Number(total[0].total) : 0
    });
  } catch (err2) {
    console.error('❌ 公共模板列表查询异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {get} /api/dkBi/templates/:id 获取模板详情（我的模板）
 * @apiName TemplatesDetail
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiParam {String} id 模板ID（必填，加密/转义后的 token）
 * @apiDescription
 * 获取模板详情（包含 contentData）。<br>
 * 说明：该接口用于“详情直达/预览”，不校验登录 token，也不做权限/可见性校验；仅校验模板存在且未删除。
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 模板详情
 * @apiSuccess (200) {String} data.id 模板ID（加密 token）
 * @apiSuccess (200) {String} data.ownerName 创建人名称
 * @apiSuccess (200) {String} data.name 模板名称
 * @apiSuccess (200) {String} data.desc 模板描述
 * @apiSuccess (200) {Boolean} data.enabled 是否启用
 * @apiSuccess (200) {Object} data.visibility 可见性（scope: all/self/company/users）
 * @apiSuccess (200) {String} [data.indexImage] 封面图
 * @apiSuccess (200) {String} [data.createdAt] 创建时间
 * @apiSuccess (200) {String} [data.updatedAt] 更新时间
 * @apiSuccess (200) {String|Object} [data.contentData] 模板内容（JSON 字符串或对象）
 *
 * @apiExample {curl} 请求示例:
 * curl -X GET "http://127.0.0.1:3041/api/dkBi/templates/t1_xxxxxxxx"
 *
 * @apiSampleRequest /api/dkBi/templates/:id
 */
async function getTemplateDetail(req, res) {
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
    const account = user && user.account ? String(user.account) : '';

    const idRaw = req.params && req.params.id ? req.params.id : null;
    const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
    if (!id) return fail(res, 'id 参数错误');

    const sql = `
      SELECT
        t.id,
        t.ownerAccount,
        u.username AS ownerName,
        t.name,
        t.\`desc\` AS \`desc\`,
        t.enabled,
        t.visibility,
        t.indexImage,
        t.createdAt,
        t.updatedAt,
        d.contentData
      FROM led_templates t
      LEFT JOIN users u ON u.account = t.ownerAccount
      LEFT JOIN led_template_datas d ON d.templateId = t.id
      WHERE t.id = ? AND t.IsDelete = 0
      LIMIT 1;
    `;

    const rows = await execSql(sql, [id]);
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return fail(res, '模板不存在');

    // “我的模板”详情：非管理员只能查看自己创建的；管理员可看全部
    if (!isAdmin) {
      if (!account) return fail(res, '当前账号异常，无法查询');
      const ownerAccount = row.ownerAccount ? String(row.ownerAccount) : '';
      if (!ownerAccount || ownerAccount !== account) return fail(res, '无权限访问');
    }

    const base = mapTemplateRow(row);
    return ok(res, {
      ...base,
      contentData: row.contentData !== undefined ? row.contentData : null
    });
  } catch (err2) {
    console.error('❌ 模板详情查询异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {get} /api/dkBi/templates/public/:id 获取公共模板详情
 * @apiName TemplatesPublicDetail
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiParam {String} id 模板ID（加密/转义后的 token）
 * @apiDescription
 * 获取公共模板详情（包含 contentData）。<br>
 * 说明：不校验登录 token，也不做权限/可见性校验；模板的 `visibility` 仅用于“公共模板列表”是否展示。
 */
async function getPublicTemplateDetail(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  try {
    const user = req.userFFK || {};
    const idRaw = req.params && req.params.id ? req.params.id : null;
    const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
    if (!id) return fail(res, 'id 参数错误');

    const sql = `
      SELECT
        t.id,
        t.ownerAccount,
        u.username AS ownerName,
        t.name,
        t.\`desc\` AS \`desc\`,
        t.enabled,
        t.visibility,
        t.indexImage,
        t.createdAt,
        t.updatedAt,
        d.contentData
      FROM led_templates t
      LEFT JOIN users u ON u.account = t.ownerAccount
      LEFT JOIN led_template_datas d ON d.templateId = t.id
      WHERE t.id = ? AND t.IsDelete = 0
      LIMIT 1;
    `;

    const rows = await execSql(sql, [id]);
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return fail(res, '模板不存在');

    // 公共模板：仅允许访问 enabled=1 且当前账号有权限的数据（管理员可看全部启用公共模板）
    if (!row.enabled) return fail(res, '模板已停用');
    const allowed = await canUsePublicTemplateByDb(id, { ownerAccount: row.ownerAccount, visibility: parseJson(row.visibility) }, user);
    if (!allowed) return fail(res, '无权限访问');

    const base = mapTemplateRow(row);
    return ok(res, {
      ...base,
      contentData: row.contentData !== undefined ? row.contentData : null
    });
  } catch (err2) {
    console.error('❌ 公共模板详情查询异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {post} /api/dkBi/templates/copyFromProject 复制项目为我的模板
 * @apiName TemplateCopyFromProject
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 复制一个现有项目为“我的模板”。<br>
 * - 复制后的模板默认 visibility.scope=self（仅自己可见）<br>
 * - 模板内容来自 Led_Projectdatas.ContentData
 *
 * @apiParam {String} projectId 项目ID（支持加密/转义后的 token）
 * @apiParam {String} [name] 模板名称（默认：项目名 + "-模板"）
 * @apiParam {String} [desc] 模板描述（可选）
 */
async function copyFromProject(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  try {
    const user = req.userFFK || {};
    const account = user && user.account ? String(user.account) : '';
    if (!account) return fail(res, '当前账号异常，无法复制');

    // 兼容：前端可能传 projectId / id / project.id / { id: 'p1_xxx' }
    let projectIdRaw = '';
    if (req.body) {
      if (req.body.projectId !== undefined && req.body.projectId !== null) projectIdRaw = req.body.projectId;
      else if (req.body.id !== undefined && req.body.id !== null) projectIdRaw = req.body.id;
      else if (req.body.project && (req.body.project.projectId !== undefined && req.body.project.projectId !== null)) projectIdRaw = req.body.project.projectId;
      else if (req.body.project && (req.body.project.id !== undefined && req.body.project.id !== null)) projectIdRaw = req.body.project.id;
    }
    if (projectIdRaw && typeof projectIdRaw === 'object') {
      const o = projectIdRaw;
      projectIdRaw = (o.projectId ?? o.id ?? o.value ?? '');
    }

    // 常见误用：把模板ID(t1_) 当成 projectId 传进来
    const projectIdText = projectIdRaw === undefined || projectIdRaw === null ? '' : String(projectIdRaw).trim();
    if (projectIdText.toLowerCase().startsWith('t1_')) {
      return fail(res, 'projectId 传错了：看起来是模板ID(t1_)，这里需要项目ID(p1_)（请从项目列表接口返回的 id 字段取值）');
    }

    const projectId = resolveProjectId(projectIdRaw, { allowPlainNumber: true });
    if (!projectId) return fail(res, 'projectId 参数错误');

    const projSql = `
      SELECT
        p.Id AS projectId,
        p.ProjectName AS projectName,
        p.State AS state,
        p.IsDelete AS isDelete,
        p.CreateUserName AS createUserName,
        p.IndexImage AS indexImage,
        p.Remarks AS remarks,
        d.ContentData AS contentData
      FROM Led_Projects p
      LEFT JOIN Led_Projectdatas d ON p.Id = d.ProjectId
      WHERE p.Id = ? AND p.IsDelete = 0
      LIMIT 1;
    `;
    const projRows = await execSql(projSql, [projectId]);
    const proj = projRows && projRows[0] ? projRows[0] : null;
    if (!proj) return fail(res, '项目不存在');

    const isAdmin = isAdminUser(user);
    const isSelf = proj.createUserName && String(proj.createUserName) === account;
    const isPublished = Number(proj.state) === 1;
    if (!isAdmin && !(isSelf || isPublished)) return fail(res, '无权限复制该项目');

    const templateName = isNonEmptyString(req.body && req.body.name)
      ? String(req.body.name).trim()
      : `${String(proj.projectName || '未命名项目')}-模板`;

    const templateDesc = isNonEmptyString(req.body && req.body.desc)
      ? String(req.body.desc).trim()
      : (proj.remarks || '');

    const visibility = { scope: 'self' };

    let newIndexImage = proj.indexImage || null;
    try {
      const copied = await copyIndexImageToTemplateCover(proj.indexImage, user);
      newIndexImage = copied !== undefined ? copied : newIndexImage;
    } catch (e) {
      // 复制封面失败不阻断主流程，仍然使用原封面值
      console.warn('⚠️ 复制模板封面失败，将使用原封面字段:', e && e.message ? e.message : String(e));
    }

    const insertRes = await execSql(
      `
        INSERT INTO led_templates (ownerAccount, name, \`desc\`, enabled, visibility, indexImage)
        VALUES (?, ?, ?, 1, ?, ?);
      `,
      [account, templateName, templateDesc, stringifyJson(visibility), newIndexImage || null]
    );

    const templateId = insertRes && insertRes.insertId ? Number(insertRes.insertId) : 0;
    if (!templateId) return fail(res, '复制失败');

    try {
      // 写入内容表
      await execSql(
        'INSERT INTO led_template_datas (templateId, contentData) VALUES (?, ?)',
        [templateId, normalizeLongText(proj && Object.prototype.hasOwnProperty.call(proj, 'contentData') ? (proj.contentData ?? '') : '')]
      );

      // 清理权限表
      await execSql('DELETE FROM templates_user_permission WHERE templateId = ?', [templateId]);
    } catch (e) {
      // 内容写入失败时，回收主表记录（避免脏数据）
      await execSql('UPDATE led_templates SET IsDelete = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [templateId]);
      throw e;
    }

    // 返回详情（不带 contentData 也可，这里带上便于前端直接打开）
    const rows = await execSql(
      `
        SELECT
          t.id,
          t.ownerAccount,
          u.username AS ownerName,
          t.name,
          t.\`desc\` AS \`desc\`,
          t.enabled,
          t.visibility,
          t.indexImage,
          t.createdAt,
          t.updatedAt,
          d.contentData
        FROM led_templates t
        LEFT JOIN users u ON u.account = t.ownerAccount
        LEFT JOIN led_template_datas d ON d.templateId = t.id
        WHERE t.id = ? AND t.IsDelete = 0
        LIMIT 1;
      `,
      [templateId]
    );

    const row = rows && rows[0] ? rows[0] : null;
    const base = mapTemplateRow(row);
    return ok(res, { ...base, contentData: row ? row.contentData : null }, '复制成功');
  } catch (err2) {
    console.error('❌ 复制项目为模板异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {post} /api/dkBi/templates/public/toProject 引用公共模板为我的项目
 * @apiName TemplatesPublicToProject
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 将一个“公共模板”（来自公共模板列表）引用为“我的项目”（新建项目 + 写入模板 contentData）。<br>
 * 规则：
 * - 仅允许引用 `enabled=1` 的模板
 * - 非管理员：必须满足可见性权限（all/company/users；users 以 `templates_user_permission` 为准）
 * - 管理员：可引用所有启用的公共模板
 *
 * @apiBody {String} id 模板ID（必填，公共模板列表返回的 `t1_...` token）
 * @apiBody {String} [projectName] 新项目名称（可选；默认：`引用-<模板名>`）
 *
 * @apiSuccess (200) {Number} code 状态码
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 返回数据
 * @apiSuccess (200) {String} data.id 新项目ID（加密 token：`p1_...`）
 * @apiSuccess (200) {String} data.ProjectName 新项目名称
 * @apiSuccess (200) {Number} data.State 项目状态（固定 -1 未发布）
 * @apiSuccess (200) {String} [data.indexImage] 项目封面（来自模板封面）
 * @apiSuccess (200) {String} [data.Remarks] 项目备注（来自模板描述）
 *
 * @apiExample {curl} 请求示例:
 * curl -X POST "http://127.0.0.1:3041/api/dkBi/templates/public/toProject" \
 *  -H "Authorization: Bearer <token>" \
 *  -H "Content-Type: application/json" \
 *  -d "{\"id\":\"t1_xxxxxxxx\",\"projectName\":\"我的新项目\"}"
 */
async function createProjectFromPublicTemplate(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  try {
    const user = req.userFFK || {};
    const account = user && user.account ? String(user.account) : '';
    const uid = user && (user.uid || user.iid) ? Number(user.uid || user.iid) : null;
    if (!account) return fail(res, 'Token 无效或已过期');

    const idRaw = req.body && req.body.id !== undefined && req.body.id !== null ? req.body.id : null;
    const templateId = resolveTemplateId(idRaw, { allowPlainNumber: true });
    if (!templateId) return fail(res, 'id 参数错误');

    const rows = await execSql(
      `
        SELECT
          t.id,
          t.ownerAccount,
          t.name,
          t.\`desc\` AS \`desc\`,
          t.enabled,
          t.visibility,
          t.indexImage,
          d.contentData
        FROM led_templates t
        LEFT JOIN led_template_datas d ON d.templateId = t.id
        WHERE t.id = ? AND t.IsDelete = 0
        LIMIT 1;
      `,
      [templateId]
    );

    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return fail(res, '模板不存在');

    if (Number(row.enabled) !== 1) return fail(res, '模板未启用');

    const templateRow = {
      id: row.id,
      ownerAccount: row.ownerAccount,
      visibility: parseJson(row.visibility)
    };

    const allowed = await canUsePublicTemplateByDb(templateId, templateRow, user);
    if (!allowed) return fail(res, '无权限引用该模板');

    const templateName = String(row.name || '未命名模板');
    const userProjectNameRaw = req.body && Object.prototype.hasOwnProperty.call(req.body, 'projectName')
      ? req.body.projectName
      : undefined;
    const projectName = isNonEmptyString(userProjectNameRaw)
      ? String(userProjectNameRaw).trim()
      : `引用-${templateName}`;

    const remarks = row.desc !== undefined && row.desc !== null ? String(row.desc) : null;
    const indexImage = row.indexImage !== undefined && row.indexImage !== null ? row.indexImage : null;
    const contentData = row.contentData !== undefined && row.contentData !== null
      ? normalizeLongText(row.contentData)
      : '';

    let projectInsertRes;
    try {
      projectInsertRes = await execSql(
        `
          INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete, CreateUserId, ProjectName, IndexImage, Remarks)
          VALUES (?, ?, NOW(), ?, ?, ?, ?, ?);
        `,
        [-1, account, 0, uid, projectName, indexImage, remarks]
      );
    } catch (e) {
      // 兼容历史库字段缺失
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        projectInsertRes = await execSql(
          `
            INSERT INTO led_projects (State, CreateUserName, CreateTime, IsDelete, CreateUserId, ProjectName)
            VALUES (?, ?, NOW(), ?, ?, ?);
          `,
          [-1, account, 0, uid, projectName]
        );
      } else {
        throw e;
      }
    }

    const newProjectId = projectInsertRes && projectInsertRes.insertId ? Number(projectInsertRes.insertId) : 0;
    if (!newProjectId) return fail(res, '创建项目失败');

    try {
      await execSql(
        'INSERT INTO led_projectdatas (ProjectId, ContentData) VALUES (?, ?)',
        [newProjectId, contentData]
      );
    } catch (e) {
      // 内容写入失败时，回收主表记录
      try {
        await execSql('UPDATE led_projects SET IsDelete = 1 WHERE Id = ?', [newProjectId]);
      } catch (e2) {
        // ignore
      }
      throw e;
    }

    return ok(res, {
      id: encodeProjectId(newProjectId),
      ProjectName: projectName,
      State: -1,
      indexImage,
      Remarks: remarks
    }, '引用成功');
  } catch (err2) {
    console.error('❌ 公共模板引用为项目异常:', err2);
    const msg = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg);
  }
}

/**
 * @api {post} /api/dkBi/templates 新增模板
 * @apiName TemplateCreate
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 新增一个模板（默认允许普通用户创建；管理员也可创建）。<br>
 * - `visibility.scope=users` 时会同步写入授权表 `templates_user_permission`
 * - `contentData` 可选：不传也允许创建（内容表会写入 null）
 *
 * @apiBody {String} name 模板名称（必填）
 * @apiBody {String} [desc] 模板描述（可选）
 * @apiBody {Boolean|Number} [enabled=true] 是否启用（支持 true/false/1/0）
 * @apiBody {Object} visibility 可见性（必填）
 * @apiBody {String="all","self","company","users"} visibility.scope 可见范围
 * @apiBody {String} [visibility.company] 企业标识（scope=company 时必填）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 时必填，至少1个）
 * @apiBody {String} [indexImage] 封面图（可选）
 * @apiBody {String|Object} [contentData] 模板内容（可选；JSON 字符串或对象/数组）
 *
 * @apiExample {json} 请求示例:
 * {
 *   "name": "销售分析模板",
 *   "desc": "用于销售看板",
 *   "enabled": 1,
 *   "visibility": {
 *     "scope": "self"
 *   },
 *   "indexImage": null,
 *   "contentData": {"editCanvasConfig": {}}
 * }
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Object} data 返回数据
 * @apiSuccess (200) {String} data.id 模板ID（加密 token）
 *
 * @apiSampleRequest /api/dkBi/templates
 */
async function createTemplate(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const msg = validateTemplate(req.body);
  if (msg) return fail(res, msg);

  try {
    const user = req.userFFK || {};
    const ownerAccount = user && user.account ? String(user.account) : '';
    if (!ownerAccount) return fail(res, '当前账号异常，无法创建');

    const enabled = toBoolean(req.body.enabled, true);
    const contentData = req.body && Object.prototype.hasOwnProperty.call(req.body, 'contentData')
      ? normalizeLongText(req.body.contentData)
      : null;

    const insertRes = await execSql(
      `
        INSERT INTO led_templates (ownerAccount, name, \`desc\`, enabled, visibility, indexImage)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        ownerAccount,
        String(req.body.name).trim(),
        req.body.desc || '',
        enabled ? 1 : 0,
        stringifyJson(req.body.visibility),
        req.body.indexImage || null
      ]
    );

    const templateId = insertRes && insertRes.insertId ? Number(insertRes.insertId) : 0;
    if (!templateId) return fail(res, '创建失败');

    await execSql(
      'INSERT INTO led_template_datas (templateId, contentData) VALUES (?, ?)',
      [templateId, contentData]
    );

    const visibility = req.body && req.body.visibility ? req.body.visibility : {};
    if (visibility && visibility.scope === 'users') {
      await syncTemplateUsers(templateId, visibility.users);
    } else {
      await execSql('DELETE FROM templates_user_permission WHERE templateId = ?', [templateId]);
    }

    return ok(res, { id: encodeTemplateId(templateId) }, '创建成功');
  } catch (err2) {
    console.error('❌ 模板创建异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

/**
 * @api {put} /api/dkBi/templates/:id 编辑模板
 * @apiName TemplateUpdate
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} id 模板ID（加密/转义后的 token）
 * @apiDescription
 * 编辑模板基础信息与内容数据。<br>
 * 权限：仅“模板创建者”或“超级管理员”可操作。<br>
 * - `visibility.scope=users` 时会同步覆盖授权表 `templates_user_permission`。
 *
 * @apiBody {String} name 模板名称（必填）
 * @apiBody {String} [desc] 模板描述（可选）
 * @apiBody {Boolean|Number} [enabled=true] 是否启用（支持 true/false/1/0）
 * @apiBody {Object} visibility 可见性（必填）
 * @apiBody {String="all","self","company","users"} visibility.scope 可见范围
 * @apiBody {String} [visibility.company] 企业标识（scope=company 时建议传）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 时必填，至少1个）
 * @apiBody {String} [indexImage] 封面图（可选）
 * @apiBody {String|Object} [contentData] 模板内容（可选；不传则不更新内容表）
 *
 * @apiExample {json} 请求示例:
 * {
 *   "name": "销售分析模板",
 *   "desc": "季度趋势",
 *   "enabled": 1,
 *   "visibility": {
 *     "scope": "users",
 *     "users": ["admin", "Rabbit"]
 *   },
 *   "indexImage": null,
 *   "contentData": {"editCanvasConfig": {}}
 * }
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Boolean} data 更新结果
 */
async function updateTemplate(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const idRaw = req.params && req.params.id ? req.params.id : null;
  const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
  if (!id) return fail(res, 'id 参数错误');

  const msg = validateTemplate(req.body);
  if (msg) return fail(res, msg);

  try {
    const exists = await execSql('SELECT id, ownerAccount FROM led_templates WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
    if (!exists || exists.length === 0) return fail(res, '模板不存在');

    const user = req.userFFK || {};
    const ownerAccount = exists[0] && exists[0].ownerAccount ? String(exists[0].ownerAccount) : '';
    if (!canManageTemplate(ownerAccount, user)) return fail(res, '无权限操作');

    const enabled = toBoolean(req.body.enabled, true);

    const contentData = req.body && Object.prototype.hasOwnProperty.call(req.body, 'contentData')
      ? normalizeLongText(req.body.contentData)
      : undefined;

    const visibility = req.body && req.body.visibility ? req.body.visibility : {};

    const sqlList = [];
    sqlList.push({
      sql: `
        UPDATE led_templates
        SET name = ?, \`desc\` = ?, enabled = ?, visibility = ?, indexImage = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND IsDelete = 0;
      `,
      params: [
        String(req.body.name).trim(),
        req.body.desc || '',
        enabled ? 1 : 0,
        stringifyJson(req.body.visibility),
        req.body.indexImage || null,
        id
      ]
    });

    if (contentData !== undefined) {
      sqlList.push({
        sql: 'INSERT INTO led_template_datas (templateId, contentData) VALUES (?, ?) ON DUPLICATE KEY UPDATE contentData = VALUES(contentData), updatedAt = CURRENT_TIMESTAMP',
        params: [id, contentData]
      });
    }

    // 授权表同步
    sqlList.push({ sql: 'DELETE FROM templates_user_permission WHERE templateId = ?', params: [id] });
    if (visibility && visibility.scope === 'users') {
      const accounts = normalizeUserAccounts(visibility.users);
      for (let i = 0; i < accounts.length; i++) {
        sqlList.push({
          sql: 'INSERT INTO templates_user_permission (templateId, userAccount) VALUES (?, ?)',
          params: [id, accounts[i]]
        });
      }
    }

    await execTransaction(sqlList);
    return ok(res, true, '更新成功');
  } catch (err2) {
    console.error('❌ 模板更新异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

async function bindTemplateUsers(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const idRaw = req.params && req.params.id ? req.params.id : null;
  const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
  if (!id) return fail(res, 'id 参数错误');

  const accounts = normalizeUserAccounts(req.body && req.body.users);
  if (!accounts || accounts.length < 1) return fail(res, '指定用户最少一个');

  try {
    const exists = await execSql('SELECT id, ownerAccount, visibility FROM led_templates WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
    if (!exists || exists.length === 0) return fail(res, '模板不存在');

    const user = req.userFFK || {};
    const ownerAccount = exists[0] && exists[0].ownerAccount ? String(exists[0].ownerAccount) : '';
    if (!canManageTemplate(ownerAccount, user)) return fail(res, '无权限操作');

    const oldVisibility = parseJson(exists[0].visibility) || {};
    const newVisibility = { ...oldVisibility, scope: 'users', users: accounts };

    await execTransaction([
      { sql: 'UPDATE led_templates SET visibility = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0', params: [stringifyJson(newVisibility), id] },
      { sql: 'DELETE FROM templates_user_permission WHERE templateId = ?', params: [id] },
      ...accounts.map(a => ({ sql: 'INSERT INTO templates_user_permission (templateId, userAccount) VALUES (?, ?)', params: [id, a] }))
    ]);

    return ok(res, true, '保存成功');
  } catch (err2) {
    console.error('❌ 模板绑定用户异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

/**
 * @api {post} /api/dkBi/templates/enabled 启用/停用模板（组件风格）
 * @apiName TemplateEnabled
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 启用/停用模板（一个接口完成启用与停用）。<br>
 * 权限与组件模块一致：仅“模板创建者”或“超级管理员”可操作。
 *
 * @apiBody {String} id 模板ID（必填，支持加密/转义后的 token）
 * @apiBody {Boolean|Number} enabled 是否启用（支持 true/false/1/0）
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Boolean} data 更新结果
 */
async function patchTemplateEnabled(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const idRaw = req.params && req.params.id ? req.params.id : null;
  const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
  if (!id) return fail(res, 'id 参数错误');

  const enabled = req.body && Object.prototype.hasOwnProperty.call(req.body, 'enabled') ? req.body.enabled : undefined;
  if (enabled === undefined) return fail(res, 'enabled 必填');

  try {
    const exists = await execSql('SELECT id, ownerAccount FROM led_templates WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
    if (!exists || exists.length === 0) return fail(res, '模板不存在');

    const user = req.userFFK || {};
    const ownerAccount = exists[0] && exists[0].ownerAccount ? String(exists[0].ownerAccount) : '';
    if (!canManageTemplate(ownerAccount, user)) return fail(res, '无权限操作');

    const enabledBool = toBoolean(enabled, false);
    const updateRes = await execSql('UPDATE led_templates SET enabled = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;', [enabledBool ? 1 : 0, id]);
    const affected = updateRes && typeof updateRes.affectedRows === 'number' ? updateRes.affectedRows : 0;
    if (affected <= 0) return fail(res, '更新失败');

    return ok(res, true, '更新成功');
  } catch (err2) {
    console.error('❌ 模板启用状态更新异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

/**
 * @api {post} /api/dkBi/templates/delete 删除模板（组件风格）
 * @apiName TemplateDelete
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 删除模板（逻辑删除：`IsDelete=1`）。<br>
 * 权限与组件模块一致：仅“模板创建者”或“超级管理员”可操作。
 *
 * @apiBody {String} id 模板ID（必填，支持加密/转义后的 token）
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Boolean} data 删除结果
 */
async function deleteTemplate(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const idRaw = req.params && req.params.id ? req.params.id : null;
  const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
  if (!id) return fail(res, 'id 参数错误');

  try {
    const exists = await execSql('SELECT id, ownerAccount FROM led_templates WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
    if (!exists || exists.length === 0) return fail(res, '模板不存在');

    const user = req.userFFK || {};
    const ownerAccount = exists[0] && exists[0].ownerAccount ? String(exists[0].ownerAccount) : '';
    if (!canManageTemplate(ownerAccount, user)) return fail(res, '无权限操作');

    const delRes = await execSql('UPDATE led_templates SET IsDelete = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0;', [id]);
    const affected = delRes && typeof delRes.affectedRows === 'number' ? delRes.affectedRows : 0;
    if (affected <= 0) return fail(res, '删除失败');

    return ok(res, true, '删除成功');
  } catch (err2) {
    console.error('❌ 模板删除异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

// 兼容组件模块风格：POST body 传 id
async function deleteTemplateByBody(req, res) {
  const id = req.body && req.body.id !== undefined && req.body.id !== null ? req.body.id : null;
  req.params = { ...(req.params || {}), id: id };
  return deleteTemplate(req, res);
}

// 兼容组件模块风格：POST body 传 { id, enabled }
async function setTemplateEnabledByBody(req, res) {
  const id = req.body && req.body.id !== undefined && req.body.id !== null ? req.body.id : null;
  req.params = { ...(req.params || {}), id: id };
  return patchTemplateEnabled(req, res);
}

/**
 * @api {post} /api/dkBi/templates/meta 单独设置模板名称/描述/权限（组件风格）
 * @apiName TemplateSetMeta
 * @apiGroup Templates
 * @apiVersion 1.0.0
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiDescription
 * 仅更新模板基础信息：`name/desc/visibility`（不修改 enabled/indexImage/contentData）。<br>
 * 权限与组件模块一致：仅“模板创建者”或“超级管理员”可操作。<br>
 * - `visibility.scope=users` 时会同步覆盖授权表 `templates_user_permission`
 *
 * @apiBody {String} id 模板ID（必填，支持加密/转义后的 token）
 * @apiBody {String} name 模板名称（必填）
 * @apiBody {String} [desc] 模板描述（可选）
 * @apiBody {Object} visibility 可见性（必填）
 * @apiBody {String="all","self","company","users"} visibility.scope 可见范围
 * @apiBody {String} [visibility.company] 企业标识（scope=company 时必填）
 * @apiBody {String} [visibility.companyLabel] 企业名称（可选）
 * @apiBody {String[]} [visibility.users] 指定账号列表（scope=users 时必填，至少1个）
 *
 * @apiSuccess (200) {Number} code 状态码（200）
 * @apiSuccess (200) {String} msg 提示信息
 * @apiSuccess (200) {Boolean} data 更新结果
 *
 * @apiSampleRequest /api/dkBi/templates/meta
 */
async function setTemplateMetaByBody(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return fail(res, msg);
  }

  const idRaw = req.body && req.body.id !== undefined && req.body.id !== null ? req.body.id : null;
  const id = resolveTemplateId(idRaw, { allowPlainNumber: true });
  if (!id) return fail(res, 'id 参数错误');

  const msg = validateTemplate(req.body);
  if (msg) return fail(res, msg);

  try {
    const exists = await execSql('SELECT id, ownerAccount FROM led_templates WHERE id = ? AND IsDelete = 0 LIMIT 1;', [id]);
    if (!exists || exists.length === 0) return fail(res, '模板不存在');

    const user = req.userFFK || {};
    const ownerAccount = exists[0] && exists[0].ownerAccount ? String(exists[0].ownerAccount) : '';
    if (!canManageTemplate(ownerAccount, user)) return fail(res, '无权限操作');

    const visibility = req.body && req.body.visibility ? req.body.visibility : {};
    const sqlList = [];
    sqlList.push({
      sql: 'UPDATE led_templates SET name = ?, `desc` = ?, visibility = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0;',
      params: [
        String(req.body.name).trim(),
        req.body.desc || '',
        stringifyJson(visibility),
        id
      ]
    });

    // 授权表同步
    sqlList.push({ sql: 'DELETE FROM templates_user_permission WHERE templateId = ?', params: [id] });
    if (visibility && visibility.scope === 'users') {
      const accounts = normalizeUserAccounts(visibility.users);
      for (let i = 0; i < accounts.length; i++) {
        sqlList.push({
          sql: 'INSERT INTO templates_user_permission (templateId, userAccount) VALUES (?, ?)',
          params: [id, accounts[i]]
        });
      }
    }

    await execTransaction(sqlList);
    return ok(res, true, '更新成功');
  } catch (err2) {
    console.error('❌ 模板 meta 更新异常:', err2);
    const msg2 = nodeConfig.environment === 'text' ? String(err2) : '';
    return fail(res, '服务器内部错误' + msg2);
  }
}

module.exports = {
  isAdminUser,
  listTemplates,
  listPublicTemplates,
  getTemplateDetail,
  getPublicTemplateDetail,
  copyFromProject,
  createProjectFromPublicTemplate,
  createTemplate,
  updateTemplate,
  bindTemplateUsers,
  patchTemplateEnabled,
  deleteTemplate,
  deleteTemplateByBody,
  setTemplateEnabledByBody,
  uploadTemplateCover,
  setTemplateMetaByBody
};
