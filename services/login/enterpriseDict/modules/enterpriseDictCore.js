/**
 * @name enterpriseDictCore.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/13
 * @description 通用字典核心实现文件。
 * 说明：
 * - 本文件存放企业字典模块核心实现
 * - 由 services/login/enterpriseDict/enterpriseDictServe.js 聚合导出
 * - 路由层不要直接引用本文件
 **/

const { execSql, execTransaction } = require('../../../../utils/index');
const nodeConfig = require('../../../../config/node.config.json');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

const {
  CODE_ERROR,
  CODE_SUCCESS
} = require('../../../../utils/Statuscode');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function generateDictKey() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
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

function getUserCompany(req) {
  const user = req.userFFK || {};
  const company = user.company ? String(user.company) : '';
  return company && company.trim() ? company.trim() : 'dk';
}

function parseDictData(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch (e) {
    return null;
  }
}

function toItemEnabled(v) {
  if (v === 0 || v === '0' || v === false || v === 'false') return 0;
  return 1;
}

function pickItemFields(item) {
  const isObj = item && typeof item === 'object';
  const itemLabel = isObj ? (item.label || item.name || item.title || null) : String(item);
  const rawValue = isObj ? (item.value !== undefined ? item.value : (item.id !== undefined ? item.id : (item.key !== undefined ? item.key : null))) : item;
  const itemValue = rawValue === null || rawValue === undefined ? null : String(rawValue);
  const itemKey = isObj ? (item.key || item.value || item.id || null) : null;
  const remarkRaw = isObj ? (item.remark !== undefined ? item.remark : (item.desc !== undefined ? item.desc : (item.description !== undefined ? item.description : null))) : null;
  const remark = remarkRaw === null || remarkRaw === undefined ? null : String(remarkRaw);
  const sort = isObj ? (Number(item.sort !== undefined ? item.sort : (item.order !== undefined ? item.order : 0)) || 0) : 0;
  const enabled = isObj ? toItemEnabled(item.enabled) : 1;
  return {
    itemKey: itemKey === null || itemKey === undefined ? null : String(itemKey),
    itemLabel: itemLabel === null || itemLabel === undefined ? null : String(itemLabel),
    itemValue,
    remark,
    sort,
    enabled
  };
}

function mapDictRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    dictName: row.dictName,
    dictKey: row.dictKey,
    keyName: row.keyName || null,
    dictType: row.dictKey,
    desc: row.desc,
    remark: row.remark,
    dictData: parseDictData(row.dictData),
    company: row.company,
    enabled: (row.enabled === 1 || row.enabled === '1' || row.enabled === true || row.enabled === 'true') ? 1 : 0,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null
  };
}

/**
 * @api {post} /api/dkBi/sys/dict/create 新增通用字典
 * @apiName EnterpriseDictCreate
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 新增通用字典（管理员）。<br>
 * - dictKey 为后端生成的唯一标识（前端不允许传）<br>
 * - 字典项数组 dictData 会写入 enterprise_dict_items（子表）<br>
 * - dictData 必须是数组
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {String} dictName 字典名称（必填）
 * @apiParam {String} [keyName] 业务标识（可读可控；用于按 keyName 查询）
 * @apiParam {String} [desc] 描述
 * @apiParam {String} [remark] 备注
 * @apiParam {Array} dictData 字典项数组（必填，数组元素为对象）。
 * - 数组元素可带 `remark`（例如 `[{"label":"德开","value":"1","remark":"备注"}]`），会写入子表字段 `enterprise_dict_items.remark`
 * @apiParam {Number=1} [enabled] 是否启用（0/1）
 * @apiParam {String} [company] 企业标识（管理员可传；普通用户忽略，默认取当前用户 company）
 */
async function createDict(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return res.json({ code: CODE_ERROR, msg, data: null });
  }

  const { dictName, desc, remark, dictData } = req.body || {};
  const keyName = req.body && req.body.keyName !== undefined && req.body.keyName !== null
    ? String(req.body.keyName).trim()
    : '';

  // 强制：前端不允许传 dictKey/dictType，必须后端生成
  if (req.body && (req.body.dictKey !== undefined && req.body.dictKey !== null && String(req.body.dictKey).trim() !== '')) {
    return res.json({ code: CODE_ERROR, msg: 'dictKey 不允许传，必须后端生成', data: null });
  }
  if (req.body && (req.body.dictType !== undefined && req.body.dictType !== null && String(req.body.dictType).trim() !== '')) {
    return res.json({ code: CODE_ERROR, msg: 'dictType 不允许传，必须后端生成', data: null });
  }
  const enabled = typeof (req.body && req.body.enabled) === 'number'
    ? req.body.enabled
    : ((req.body && (req.body.enabled === '0' || req.body.enabled === 0 || req.body.enabled === false || req.body.enabled === 'false')) ? 0 : 1);

  const user = req.userFFK || {};
  const admin = isAdminUser(user);
  const company = admin && isNonEmptyString(req.body && req.body.company)
    ? String(req.body.company).trim()
    : getUserCompany(req);

  if (!isNonEmptyString(dictName)) {
    return res.json({ code: CODE_ERROR, msg: 'dictName 必填', data: null });
  }
  if (dictData === undefined || dictData === null) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必填', data: null });
  }

  const dictDataObj = parseDictData(dictData);
  if (dictDataObj === null) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必须是合法 JSON', data: null });
  }
  if (!Array.isArray(dictDataObj)) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必须是数组', data: null });
  }

  try {
    // 后端生成 company 内唯一 dictKey
    let realDictKey = '';
    for (let i = 0; i < 5; i++) {
      const genKey = generateDictKey();
      const hit = await execSql(
        'SELECT id FROM enterprise_dict WHERE dictKey = ? LIMIT 1',
        [genKey]
      );
      if (!hit || hit.length === 0) {
        realDictKey = genKey;
        break;
      }
    }
    if (!isNonEmptyString(realDictKey)) {
      realDictKey = generateDictKey();
    }

    const exists = await execSql(
      'SELECT id, IsDelete FROM enterprise_dict WHERE dictKey = ? LIMIT 1',
      [realDictKey]
    );
    if (exists && exists.length > 0) {
      if (exists[0] && (exists[0].IsDelete === 1 || exists[0].IsDelete === '1')) {
        return res.json({ code: CODE_ERROR, msg: 'dictKey 已存在(已删除)，请在数据库恢复或重新创建', data: null });
      }
      return res.json({ code: CODE_ERROR, msg: 'dictKey 已存在', data: null });
    }

    if (keyName) {
      const keyNameHit = await execSql('SELECT id, IsDelete FROM enterprise_dict WHERE keyName = ? LIMIT 1', [keyName]);
      if (keyNameHit && keyNameHit[0]) {
        const isDel = keyNameHit[0].IsDelete === 1 || keyNameHit[0].IsDelete === '1';
        return res.json({ code: CODE_ERROR, msg: isDel ? 'keyName 已存在(已删除)，请在数据库恢复或更换 keyName' : 'keyName 已存在', data: null });
      }
    }

    const insertSql = `
      INSERT INTO enterprise_dict (dictName, dictKey, keyName, \`desc\`, remark, dictData, company, enabled, IsDelete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);
    `;

    const result = await execSql(insertSql, [
      String(dictName).trim(),
      realDictKey,
      keyName || null,
      desc || '',
      remark || '',
      JSON.stringify(dictDataObj),
      company,
      enabled === 1 ? 1 : 0
    ]);

    const insertId = result && result.insertId ? result.insertId : null;

    const itemSqlList = [];
    for (let i = 0; i < dictDataObj.length; i++) {
      const item = dictDataObj[i];
      const fields = pickItemFields(item);
      itemSqlList.push({
        sql: 'INSERT INTO enterprise_dict_items (dictId, keyName, itemKey, itemLabel, itemValue, remark, itemData, sort, enabled, IsDelete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
        params: [
          insertId,
          keyName || null,
          fields.itemKey,
          fields.itemLabel,
          fields.itemValue,
          fields.remark,
          JSON.stringify(item),
          fields.sort,
          fields.enabled
        ]
      });
    }

    if (itemSqlList.length > 0) {
      try {
        await execTransaction(itemSqlList);
      } catch (e) {
        // 字典项写入失败：回滚不了 insertId，只能将主表假删
        await execSql('UPDATE enterprise_dict SET IsDelete = 1 WHERE id = ?', [insertId]);
        throw e;
      }
    }
    const rows = await execSql(
      'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE id = ? LIMIT 1',
      [insertId]
    );

    return res.json({
      code: CODE_SUCCESS,
      msg: '创建成功',
      data: rows && rows[0] ? mapDictRow(rows[0]) : null
    });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    const errMsg = (e && e.code === 'ER_DUP_ENTRY') ? 'dictKey 已存在' : ('服务器内部错误' + mag);
    return res.json({ code: CODE_ERROR, msg: errMsg, data: null });
  }
}

/**
 * @api {post} /api/dkBi/sys/dict/update 修改通用字典
 * @apiName EnterpriseDictUpdate
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 修改通用字典（管理员）。<br>
 * - 会重建 enterprise_dict_items 的字典项数组（先假删旧项，再插入新数组）<br>
 * - dictData 必须是数组
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {Number} dictId 字典ID（必填）
 * @apiParam {String} dictName 字典名称（必填）
 * @apiParam {String} [keyName] 业务标识（可读可控；用于按 keyName 查询）
 * @apiParam {String} [desc] 描述
 * @apiParam {String} [remark] 备注
 * @apiParam {Array} dictData 字典项数组（必填，数组元素为对象）。
 * - 数组元素可带 `remark`（例如 `[{"label":"德开","value":"1","remark":"备注"}]`），会写入子表字段 `enterprise_dict_items.remark`
 * @apiParam {Number=1} [enabled] 是否启用（0/1）
 * @apiParam {String} [company] 企业标识（管理员可传；不传则保持原 company）
 */
async function updateDict(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return res.json({ code: CODE_ERROR, msg, data: null });
  }

  const { dictId, dictName, desc, remark, dictData } = req.body || {};
  const keyName = req.body && req.body.keyName !== undefined && req.body.keyName !== null
    ? String(req.body.keyName).trim()
    : '';

  // 强制：更新时也不允许传 dictKey/dictType（dictKey 一旦生成不允许修改）
  if (req.body && (req.body.dictKey !== undefined && req.body.dictKey !== null && String(req.body.dictKey).trim() !== '')) {
    return res.json({ code: CODE_ERROR, msg: 'dictKey 不允许传，必须后端生成且不可修改', data: null });
  }
  if (req.body && (req.body.dictType !== undefined && req.body.dictType !== null && String(req.body.dictType).trim() !== '')) {
    return res.json({ code: CODE_ERROR, msg: 'dictType 不允许传，必须后端生成且不可修改', data: null });
  }
  const id = toNumber(dictId);
  if (!Number.isFinite(id) || id <= 0) {
    return res.json({ code: CODE_ERROR, msg: 'dictId 参数错误', data: null });
  }
  if (!isNonEmptyString(dictName)) {
    return res.json({ code: CODE_ERROR, msg: 'dictName 必填', data: null });
  }
  if (dictData === undefined || dictData === null) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必填', data: null });
  }

  const dictDataObj = parseDictData(dictData);
  if (dictDataObj === null) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必须是合法 JSON', data: null });
  }
  if (!Array.isArray(dictDataObj)) {
    return res.json({ code: CODE_ERROR, msg: 'dictData 必须是数组', data: null });
  }

  const enabled = typeof (req.body && req.body.enabled) === 'number'
    ? req.body.enabled
    : ((req.body && (req.body.enabled === '0' || req.body.enabled === 0 || req.body.enabled === false || req.body.enabled === 'false')) ? 0 : 1);

  const user = req.userFFK || {};
  const admin = isAdminUser(user);

  try {
    const rows = await execSql(
      'SELECT id, company, dictKey FROM enterprise_dict WHERE id = ? AND IsDelete = 0 LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.json({ code: CODE_ERROR, msg: '字典不存在', data: null });
    }

    const oldCompany = rows[0].company ? String(rows[0].company) : 'dk';
    const oldDictKey = rows[0].dictKey ? String(rows[0].dictKey) : '';
    const company = admin && isNonEmptyString(req.body && req.body.company)
      ? String(req.body.company).trim()
      : oldCompany;

    const realDictKey = oldDictKey;
    if (!isNonEmptyString(realDictKey)) {
      return res.json({ code: CODE_ERROR, msg: 'dictKey 为空，无法更新', data: null });
    }

    const exists = await execSql(
      'SELECT id FROM enterprise_dict WHERE company = ? AND dictKey = ? AND IsDelete = 0 AND id <> ? LIMIT 1',
      [company, realDictKey, id]
    );
    if (exists && exists.length > 0) {
      return res.json({ code: CODE_ERROR, msg: 'dictType 已存在', data: null });
    }

    if (keyName) {
      const keyNameHit = await execSql('SELECT id, IsDelete FROM enterprise_dict WHERE keyName = ? AND id <> ? LIMIT 1', [keyName, id]);
      if (keyNameHit && keyNameHit[0]) {
        const isDel = keyNameHit[0].IsDelete === 1 || keyNameHit[0].IsDelete === '1';
        return res.json({ code: CODE_ERROR, msg: isDel ? 'keyName 已存在(已删除)，请在数据库恢复或更换 keyName' : 'keyName 已存在', data: null });
      }
    }

    const sqlList = [];
    sqlList.push({
      sql: `
        UPDATE enterprise_dict
        SET dictName = ?, dictKey = ?, keyName = ?, \`desc\` = ?, remark = ?, dictData = ?, company = ?, enabled = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND IsDelete = 0;
      `,
      params: [
        String(dictName).trim(),
        realDictKey,
        keyName || null,
        desc || '',
        remark || '',
        JSON.stringify(dictDataObj),
        company,
        enabled === 1 ? 1 : 0,
        id
      ]
    });

    // 不保留历史：先硬删旧项，再插入新数组
    sqlList.push({
      sql: 'DELETE FROM enterprise_dict_items WHERE dictId = ?',
      params: [id]
    });

    for (let i = 0; i < dictDataObj.length; i++) {
      const item = dictDataObj[i];
      const fields = pickItemFields(item);
      sqlList.push({
        sql: 'INSERT INTO enterprise_dict_items (dictId, keyName, itemKey, itemLabel, itemValue, remark, itemData, sort, enabled, IsDelete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
        params: [
          id,
          keyName || null,
          fields.itemKey,
          fields.itemLabel,
          fields.itemValue,
          fields.remark,
          JSON.stringify(item),
          fields.sort,
          fields.enabled
        ]
      });
    }

    await execTransaction(sqlList);

    const afterRows = await execSql(
      'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE id = ? LIMIT 1',
      [id]
    );

    // 返回时 dictData 用 items 子表组装（管理员返回全部，普通用户返回 enabled=1）
    const itemWhere = isAdminUser(req.userFFK || {})
      ? 'dictId = ? AND IsDelete = 0'
      : 'dictId = ? AND IsDelete = 0 AND enabled = 1';
    const items = await execSql(
      `SELECT itemData FROM enterprise_dict_items WHERE ${itemWhere} ORDER BY sort DESC, id ASC`,
      [id]
    );
    const dictRow = afterRows && afterRows[0] ? mapDictRow(afterRows[0]) : null;
    if (dictRow) {
      dictRow.dictData = Array.isArray(items) ? items.map(r => parseDictData(r.itemData)).filter(v => v !== null) : [];
    }

    return res.json({
      code: CODE_SUCCESS,
      msg: '更新成功',
      data: dictRow
    });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
  }
}

/**
 * @api {post} /api/dkBi/sys/dict/delete 删除通用字典（假删）
 * @apiName EnterpriseDictDelete
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 删除字典（假删：主表 IsDelete=1；子表 enterprise_dict_items 同步 IsDelete=1，管理员）。
 *
 * @apiHeader {String} Authorization 登录 Token（必填）
 * @apiParam {Number} dictId 字典ID（必填）
 */
async function deleteDict(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return res.json({ code: CODE_ERROR, msg, data: null });
  }

  const { dictId } = req.body || {};
  const id = toNumber(dictId);
  if (!Number.isFinite(id) || id <= 0) {
    return res.json({ code: CODE_ERROR, msg: 'dictId 参数错误', data: null });
  }

  try {
    await execTransaction([
      {
        sql: 'UPDATE enterprise_dict SET IsDelete = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND IsDelete = 0',
        params: [id]
      },
      {
        sql: 'UPDATE enterprise_dict_items SET IsDelete = 1, updatedAt = CURRENT_TIMESTAMP WHERE dictId = ? AND IsDelete = 0',
        params: [id]
      }
    ]);

    return res.json({ code: CODE_SUCCESS, msg: '删除成功', data: true });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
  }
}

/**
 * @api {get} /api/dkBi/sys/dict/getData 获取字典（按ID/类型）
 * @apiName EnterpriseDictGetData
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 获取字典详情（默认只查未删除）。<br>
 * - 公开接口：不需要 token<br>
 * - 可选：携带管理员 token（Authorization）可查询到禁用数据<br>
 * - 支持按 dictId 查询，也支持按 dictKey 查询<br>
 * - 支持按 keyName 查询（业务标识，可读可控）<br>
 * - 不带 token 时仅返回 enabled=1 且未删除的数据（主表/子表）
 * @apiQuery {Number} [dictId] 字典ID
 * @apiQuery {String} [dictKey] 字典标识（后端生成的唯一值）
 * @apiQuery {String} [keyName] 业务标识（可读可控）
 */
async function getDictData(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return res.json({ code: CODE_ERROR, msg, data: null });
  }

  try {
    const user = req.userFFK || {};
    const admin = isAdminUser(user);
    const dictId = req.query && req.query.dictId ? req.query.dictId : null;
    const dictKey = req.query && req.query.dictKey ? String(req.query.dictKey).trim() : '';
    const keyName = req.query && req.query.keyName ? String(req.query.keyName).trim() : '';
    const realDictKey = dictKey;

    let rows = [];
    if (dictId !== undefined && dictId !== null && String(dictId) !== '') {
      const id = toNumber(dictId);
      if (!Number.isFinite(id) || id <= 0) {
        return res.json({ code: CODE_ERROR, msg: 'dictId 参数错误', data: null });
      }

      const sql = admin
        ? 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE id = ? AND IsDelete = 0 LIMIT 1'
        : 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE id = ? AND IsDelete = 0 AND enabled = 1 LIMIT 1';
      rows = await execSql(sql, [id]);
    } else {
      if (realDictKey) {
        // dictKey 为后端生成的唯一值：直接定位
        const sql = admin
          ? 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE dictKey = ? AND IsDelete = 0 LIMIT 1'
          : 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE dictKey = ? AND IsDelete = 0 AND enabled = 1 LIMIT 1';
        rows = await execSql(sql, [realDictKey]);
      } else if (keyName) {
        const sql = admin
          ? 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE keyName = ? AND IsDelete = 0 LIMIT 1'
          : 'SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, dictData, company, enabled, createdAt, updatedAt FROM enterprise_dict WHERE keyName = ? AND IsDelete = 0 AND enabled = 1 LIMIT 1';
        rows = await execSql(sql, [keyName]);
      } else {
        return res.json({ code: CODE_ERROR, msg: 'dictId 或 dictKey 或 keyName 必填', data: null });
      }
    }

    if (!rows || rows.length === 0) {
      return res.json({ code: CODE_ERROR, msg: '未查询到当前字典', data: null });
    }

    const dictRow = mapDictRow(rows[0]);
    const itemSql = admin
      ? 'SELECT itemData FROM enterprise_dict_items WHERE dictId = ? AND IsDelete = 0 ORDER BY sort DESC, id ASC'
      : 'SELECT itemData FROM enterprise_dict_items WHERE dictId = ? AND IsDelete = 0 AND enabled = 1 ORDER BY sort DESC, id ASC';
    const items = await execSql(itemSql, [dictRow.id]);
    dictRow.dictData = Array.isArray(items) ? items.map(r => parseDictData(r.itemData)).filter(v => v !== null) : [];

    return res.json({ code: CODE_SUCCESS, msg: '查询成功', data: dictRow });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
  }
}

/**
 * @api {get} /api/dkBi/sys/dict/items 获取字典项数组（按 keyName）
 * @apiName EnterpriseDictItemsByKeyName
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 获取某个字典的“字典项数组”。<br>
 * - 公开接口：不需要 token<br>
 * - 可选：携带管理员 token（Authorization）可查询到禁用数据<br>
 * - 按 keyName 查询：优先从 enterprise_dict_items.keyName 直接查；若历史数据未回填，会回退为先查主表再按 dictId 查
 *
 * @apiQuery {String} keyName 业务标识（必填）
 */
async function getDictItems(req, res) {
  const keyName = req.query && req.query.keyName ? String(req.query.keyName).trim() : '';
  if (!keyName) {
    return res.json({ code: CODE_ERROR, msg: 'keyName 必填', data: null });
  }

  try {
    const user = req.userFFK || {};
    const admin = isAdminUser(user);

    const itemSqlDirect = admin
      ? 'SELECT itemData FROM enterprise_dict_items WHERE keyName = ? AND IsDelete = 0 ORDER BY sort DESC, id ASC'
      : 'SELECT itemData FROM enterprise_dict_items WHERE keyName = ? AND IsDelete = 0 AND enabled = 1 ORDER BY sort DESC, id ASC';
    const directRows = await execSql(itemSqlDirect, [keyName]);

    let arr = Array.isArray(directRows)
      ? directRows.map(r => parseDictData(r.itemData)).filter(v => v !== null)
      : [];

    // 若历史数据未回填，尝试回退：先定位字典，再按 dictId 查 items
    if (arr.length === 0) {
      const dictSql = admin
        ? 'SELECT id FROM enterprise_dict WHERE keyName = ? AND IsDelete = 0 LIMIT 1'
        : 'SELECT id FROM enterprise_dict WHERE keyName = ? AND IsDelete = 0 AND enabled = 1 LIMIT 1';
      const dictRows = await execSql(dictSql, [keyName]);
      const dictId = dictRows && dictRows[0] ? Number(dictRows[0].id) : NaN;
      if (Number.isFinite(dictId) && dictId > 0) {
        const itemSql = admin
          ? 'SELECT itemData FROM enterprise_dict_items WHERE dictId = ? AND IsDelete = 0 ORDER BY sort DESC, id ASC'
          : 'SELECT itemData FROM enterprise_dict_items WHERE dictId = ? AND IsDelete = 0 AND enabled = 1 ORDER BY sort DESC, id ASC';
        const rows = await execSql(itemSql, [dictId]);
        arr = Array.isArray(rows) ? rows.map(r => parseDictData(r.itemData)).filter(v => v !== null) : [];
      }
    }

    return res.json({ code: CODE_SUCCESS, msg: '查询成功', data: arr });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
  }
}

/**
 * @api {get} /api/dkBi/sys/dict/list 字典列表（分页）
 * @apiName EnterpriseDictList
 * @apiGroup EnterpriseDict
 * @apiVersion 1.0.0
 * @apiDescription 公开接口：字典列表分页查询（不需要 token）。<br>
 * - 不带 token 时仅返回 enabled=1 且未删除的数据<br>
 * - 可选：携带管理员 token（Authorization）可查询到禁用数据
 *
 * @apiQuery {Number=1} [page] 页码（从1开始）
 * @apiQuery {Number=10} [pageSize] 每页数量（最大200）
 * @apiQuery {String} [keyword] 关键词（匹配 dictName/dictKey/keyName/desc/remark）
 */
async function listDict(req, res) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const msg = (err.array && err.array()[0] && err.array()[0].msg)
      ? err.array()[0].msg
      : '参数校验失败';
    return res.json({ code: CODE_ERROR, msg, data: null });
  }

  const page = req.query && req.query.page ? toNumber(req.query.page) : 1;
  const pageSize = req.query && req.query.pageSize ? toNumber(req.query.pageSize) : 10;
  const keyword = req.query && req.query.keyword ? String(req.query.keyword).trim() : '';

  const realPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const realPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 200) : 10;
  const offset = (realPage - 1) * realPageSize;

  try {
    const user = req.userFFK || {};
    const admin = isAdminUser(user);

    const whereList = ['IsDelete = 0'];
    if (!admin) {
      whereList.push('enabled = 1');
    }
    const params = [];

    if (keyword) {
      whereList.push('(dictName LIKE ? OR dictKey LIKE ? OR keyName LIKE ? OR `desc` LIKE ? OR remark LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const whereSql = whereList.length > 0 ? `WHERE ${whereList.join(' AND ')}` : '';

    const countRows = await execSql(
      `SELECT COUNT(1) AS total FROM enterprise_dict ${whereSql}`,
      params
    );
    const total = countRows && countRows[0] && countRows[0].total !== undefined
      ? Number(countRows[0].total)
      : 0;

    const listRows = await execSql(
      `SELECT id, dictName, dictKey, keyName, \`desc\` AS \`desc\`, remark, company, enabled, createdAt, updatedAt
       FROM enterprise_dict ${whereSql}
       ORDER BY id DESC
       LIMIT ?, ?`,
      params.concat([offset, realPageSize])
    );

    const list = Array.isArray(listRows)
      ? listRows.map(r => ({
        id: r.id,
        dictName: r.dictName,
        dictKey: r.dictKey,
        keyName: r.keyName || null,
        desc: r.desc,
        remark: r.remark,
        company: r.company,
        enabled: (r.enabled === 1 || r.enabled === '1' || r.enabled === true || r.enabled === 'true') ? 1 : 0,
        createdAt: r.createdAt || null,
        updatedAt: r.updatedAt || null
      }))
      : [];

    return res.json({
      code: CODE_SUCCESS,
      msg: '查询成功',
      data: {
        page: realPage,
        pageSize: realPageSize,
        total,
        list
      }
    });
  } catch (e) {
    let mag = '';
    if (nodeConfig.environment === 'text') {
      mag = e;
    }
    return res.json({ code: CODE_ERROR, msg: '服务器内部错误' + mag, data: null });
  }
}

module.exports = {
  createDict,
  updateDict,
  deleteDict,
  getDictData,
  getDictItems,
  listDict
};
