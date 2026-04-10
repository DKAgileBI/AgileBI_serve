/**
 * @name projectIdCodec
 * @author Mr·Fan DkPlusAI
 * @Time 2026/02/05
 * @description
 * 项目ID 编码/解码：用于对外返回“不可猜测”的 projectId，防止通过数字枚举猜中详情。
 *
 * 设计目标：
 * - 数据库仍然使用原始自增 Id，不改表、不迁移历史数据
 * - 对外仅暴露带签名的 token（可逆：服务端可解码）
 */

const crypto = require('crypto');
const { PRIVATE_KEY } = require('./Statuscode');

const PREFIX = 'p1_';

function base64urlEncode(input) {
  const b64 = Buffer.from(String(input), 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(input) {
  const text = String(input || '');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(padLen);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signId(id) {
  return crypto
    .createHmac('sha256', String(PRIVATE_KEY || ''))
    .update(`project:${String(id)}`)
    .digest('hex')
    .slice(0, 16);
}

function isEncodedProjectId(value) {
  return typeof value === 'string' && value.toLowerCase().startsWith(PREFIX);
}

function encodeProjectId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return '';
  const sig = signId(n);
  return PREFIX + base64urlEncode(`${n}.${sig}`);
}

function decodeProjectId(token) {
  if (!isEncodedProjectId(token)) return null;
  const rawToken = String(token);
  const raw = base64urlDecode(rawToken.slice(PREFIX.length));
  const parts = String(raw).split('.');
  if (parts.length !== 2) return null;
  const id = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(id) || id <= 0) return null;
  if (sig !== signId(id)) return null;
  return id;
}

function safeDecodeURIComponentOnce(input) {
  if (input === null || input === undefined) return '';
  const s = String(input);
  if (!s.includes('%')) return s;
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

/**
 * @description 将外部传入的 projectId（数字或加密 token）解析为数据库真实 Id。
 * @param {any} value
 * @param {object} [options]
 * @param {boolean} [options.allowPlainNumber=true] 是否允许纯数字
 */
function resolveProjectId(value, options = {}) {
  const { allowPlainNumber = true } = options;
  if (value === undefined || value === null) return null;

  const str = safeDecodeURIComponentOnce(String(value).trim());
  if (!str) return null;

  if (isEncodedProjectId(str)) return decodeProjectId(str);

  // 兼容：有些场景会把 token 再编码一次
  const str2 = safeDecodeURIComponentOnce(str);
  if (str2 && isEncodedProjectId(str2)) return decodeProjectId(str2);

  if (!allowPlainNumber) return null;

  const n = Number(str);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

module.exports = {
  encodeProjectId,
  decodeProjectId,
  resolveProjectId,
  isEncodedProjectId,
};
