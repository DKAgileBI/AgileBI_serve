const { execSql, querySql, execTransaction } = require('../../utils');
const AnalysisToken = require('../../utils/TokenInof');
const jwt = require('jsonwebtoken');

function parseJsonMaybe(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return fallback;
  const s = val.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch (e) {
    return fallback;
  }
}

function isNonEmptyString(v) {
  return v !== undefined && v !== null && String(v).trim().length > 0;
}

function isAdminUser(user) {
  if (!user) return false;
  const account = user.account ? String(user.account) : '';
  const role = user.role ? String(user.role) : '';
  if (account && account.toLowerCase() === 'admin') return true;
  if (role && role.toLowerCase().includes('admin')) return true;
  if (role && role.includes('管理员')) return true;
  if (role && role.includes('超级管理员')) return true;
  return false;
}

function normalizeTokenValue(token) {
  if (token === undefined || token === null) return '';
  const value = String(token).trim();
  if (!value) return '';
  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+/i, '').trim();
  }
  return value;
}

function extractTokenFromReq(req) {
  if (!req || typeof req !== 'object') return '';

  const headerToken = normalizeTokenValue(
    (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) ||
    (typeof req.get === 'function' ? req.get('Authorization') : '') ||
    (req.headers && (req.headers['x-access-token'] || req.headers['token']))
  );
  if (headerToken) return headerToken;

  const queryToken = normalizeTokenValue(req.query && req.query.token);
  if (queryToken) return queryToken;

  const cookieToken = normalizeTokenValue(
    req.cookies && (req.cookies.Authorization || req.cookies.authorization || req.cookies.token)
  );
  if (cookieToken) return cookieToken;

  return '';
}

async function getUserRowFromReq(req) {
  if (req && req.userFFK) return req.userFFK;

  const token = extractTokenFromReq(req);
  if (token) {
    const decoded = jwt.decode(token);
    if (decoded) {
      const iid = decoded.iid;
      const username = decoded.username;
      if (iid !== undefined && iid !== null && String(iid).trim() !== '') {
        const rows = await execSql('SELECT * FROM users WHERE uid = ? LIMIT 1', [iid]);
        if (rows && rows[0]) return rows[0];
      }
      if (username !== undefined && username !== null && String(username).trim() !== '') {
        const rows = await execSql('SELECT * FROM users WHERE account = ? LIMIT 1', [String(username)]);
        if (rows && rows[0]) return rows[0];
      }
    }
  }

  const tokenInfo = await AnalysisToken(req);
  if (tokenInfo === 'err') return null;
  const account = tokenInfo && tokenInfo.account ? String(tokenInfo.account) : '';
  if (!account) return null;
  const rows = await execSql('SELECT * FROM users WHERE account = ? LIMIT 1', [account]);
  return rows && rows[0] ? rows[0] : null;
}

function normalizeVisibility(input, userRow) {
  const v = input && typeof input === 'object' ? { ...input } : {};
  const scope = isNonEmptyString(v.scope) ? String(v.scope).trim() : 'self';
  if (!['all', 'self', 'company', 'users'].includes(scope)) {
    return { scope: 'self' };
  }

  if (scope === 'company') {
    if (!isNonEmptyString(v.company) && userRow && isNonEmptyString(userRow.company)) {
      v.company = userRow.company;
    }
  }

  if (scope === 'users') {
    const users = Array.isArray(v.users) ? v.users : [];
    v.users = users
      .map(u => (u === undefined || u === null ? '' : String(u)).trim())
      .filter(Boolean);
  }

  return {
    scope,
    ...(v.company !== undefined ? { company: v.company } : {}),
    ...(v.companyLabel !== undefined ? { companyLabel: v.companyLabel } : {}),
    ...(v.users !== undefined ? { users: v.users } : {})
  };
}

function validateVisibilityOrMsg(visibility) {
  if (!visibility || typeof visibility !== 'object') return 'visibility 必填';
  if (!isNonEmptyString(visibility.scope)) return 'visibility.scope 必填';
  const scope = String(visibility.scope).trim();
  if (!['all', 'self', 'company', 'users'].includes(scope)) return 'visibility.scope 不合法';

  if (scope === 'company') {
    const c = visibility.company;
    const label = visibility.companyLabel;
    if (!isNonEmptyString(c) && !isNonEmptyString(label)) return 'visibility.company 必填';
  }
  if (scope === 'users') {
    if (!Array.isArray(visibility.users) || visibility.users.length < 1) return 'visibility.users 最少一个';
  }
  return null;
}

async function syncProjectUserPermission(projectId, visibility) {
  const scope = visibility && visibility.scope ? String(visibility.scope) : 'self';
  const users = scope === 'users' && Array.isArray(visibility.users) ? visibility.users : [];

  const deleteSql = 'DELETE FROM projects_user_permission WHERE projectId = ?';
  const sqlList = [{ sql: deleteSql, params: [projectId] }];

  if (scope === 'users') {
    const uniqAccounts = Array.from(new Set(users.map(u => String(u).trim()).filter(Boolean)));
    uniqAccounts.forEach((acc) => {
      sqlList.push({
        sql: 'INSERT INTO projects_user_permission (projectId, userAccount) VALUES (?, ?) ON DUPLICATE KEY UPDATE userAccount = VALUES(userAccount)',
        params: [projectId, acc]
      });
    });
  }

  await execTransaction(sqlList);
}

async function canViewPublishedProject(projectRow, userRow) {
  if (!projectRow) return false;
  if (isAdminUser(userRow)) return true;

  const owner = projectRow.CreateUserName ? String(projectRow.CreateUserName) : '';
  const account = userRow && userRow.account ? String(userRow.account) : '';
  if (owner && account && owner === account) return true;

  const visibility = normalizeVisibility(parseJsonMaybe(projectRow.Visibility, { scope: 'self' }) || { scope: 'self' }, userRow);
  const scope = String(visibility.scope || 'self');
  if (scope === 'all') return true;
  if (!userRow) return false;

  if (scope === 'self') return false;

  if (scope === 'company') {
    const c1 = isNonEmptyString(userRow.company) ? String(userRow.company).trim() : '';
    const c2 = isNonEmptyString(visibility.company) ? String(visibility.company).trim() : '';
    const c3 = isNonEmptyString(visibility.companyLabel) ? String(visibility.companyLabel).trim() : '';
    if (!c1) return false;
    return c1 === c2 || c1 === c3;
  }

  if (scope === 'users') {
    const acc = userRow.account ? String(userRow.account) : '';
    if (!acc) return false;
    try {
      const rows = await execSql(
        'SELECT 1 AS ok FROM projects_user_permission WHERE projectId = ? AND userAccount = ? LIMIT 1',
        [Number(projectRow.Id || projectRow.id), acc]
      );
      return !!(rows && rows[0] && rows[0].ok === 1);
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') return false;
      throw e;
    }
  }

  return false;
}

module.exports = {
  parseJsonMaybe,
  isAdminUser,
  normalizeTokenValue,
  extractTokenFromReq,
  getUserRowFromReq,
  normalizeVisibility,
  validateVisibilityOrMsg,
  syncProjectUserPermission,
  canViewPublishedProject
};
