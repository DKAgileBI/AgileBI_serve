/**
 * @name emailVerify.js
 * @author Mr·Fan DkPlusAI
 * @Time 2026/01/09
 * @description 邮箱验证码（注册用）
 */

/**
 * @api {post} /api/dkBi/sys/email/sendCode 发送邮箱验证码
 * @apiName SendEmailCode
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription
 * 发送注册邮箱验证码（注册前可用）。
 *
 * @apiBody {String} email 邮箱
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} msg 提示信息
 * @apiSuccess {Object|null} data 成功时固定为 null
 *
 * @apiSuccessExample {json} 成功响应示例:
 * {
 *   "code": 200,
 *   "msg": "验证码已发送",
 *   "data": null
 * }
 */

const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const { execSql } = require('../../../utils/index');
const md5 = require('../../../utils/md5');
const nodeConfig = require('../../../config/node.config.json');
const { CODE_ERROR, CODE_SUCCESS, PRIVATE_KEY } = require('../../../utils/Statuscode');
let mailConfig = null;
try {
    mailConfig = require('../../../config/mail.config.json');
} catch (e) {
    mailConfig = null;
}

function getTransporter() {
    const cfgSmtp = (mailConfig && mailConfig.smtp) ? mailConfig.smtp : {};
    const host = process.env.SMTP_HOST || cfgSmtp.host;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : (cfgSmtp.port || 465);
    const secure = process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : (typeof cfgSmtp.secure === 'boolean' ? cfgSmtp.secure : (port === 465));
    const user = process.env.SMTP_USER || cfgSmtp.user;
    const pass = process.env.SMTP_PASS || cfgSmtp.pass;

    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function renderTemplate(template, vars) {
    if (!template) return '';
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    });
}

async function sendEmailCode(req, res) {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        return res.json({
            code: CODE_ERROR,
            msg: (err.array && err.array()[0] && err.array()[0].msg) ? err.array()[0].msg : '邮箱参数错误',
            data: null
        })
    }

    const { email } = req.body || {};

    const transporter = getTransporter();
    if (!transporter) {
        return res.json({
            code: CODE_ERROR,
            msg: '邮件服务未配置（请设置 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS）',
            data: null
        })
    }

    try {
        // 1分钟内限频（按邮箱）
        const freqSql = 'SELECT created_at FROM email_code WHERE email = ? ORDER BY created_at DESC LIMIT 1';
        const lastRows = await execSql(freqSql, [email]);
        if (lastRows && lastRows[0] && lastRows[0].created_at) {
            const lastTime = new Date(lastRows[0].created_at).getTime();
            if (Date.now() - lastTime < 60 * 1000) {
                return res.json({
                    code: CODE_ERROR,
                    msg: '发送过于频繁，请稍后再试',
                    data: null
                })
            }
        }

        const code = generateCode();
        const codeHash = md5(code + PRIVATE_KEY);
        const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟

        const insertSql = 'INSERT INTO email_code (email, code_hash, expire_at, used) VALUES (?, ?, ?, 0)';
        await execSql(insertSql, [email, codeHash, expireAt]);

        const cfgMail = (mailConfig && mailConfig.mail) ? mailConfig.mail : {};
        const cfgSmtp = (mailConfig && mailConfig.smtp) ? mailConfig.smtp : {};
        const from = process.env.SMTP_FROM || cfgSmtp.from || process.env.SMTP_USER || cfgSmtp.user;
        const subject = process.env.MAIL_SUBJECT || cfgMail.subject || '注册验证码';

        const minutes = 10;
        const vars = {
            code,
            minutes,
            brand: cfgMail.brand || 'AgileBI',
            site: cfgMail.site || ''
        };

        const tpl = cfgMail.template || {};
        const text = tpl.text ? renderTemplate(tpl.text, vars) : `你的验证码是：${code}，${minutes}分钟内有效。`;
        const html = tpl.html ? renderTemplate(tpl.html, vars) : undefined;

        await transporter.sendMail({
            from,
            to: email,
            subject,
            text,
            html
        });

        return res.json({
            code: CODE_SUCCESS,
            msg: '验证码已发送',
            data: null
        })
    } catch (e) {
        if (nodeConfig.environment === 'text') {
            console.log('sendEmailCode err', e);
        }
        return res.json({
            code: CODE_ERROR,
            msg: '发送失败，请稍后再试',
            data: null
        })
    }
}

module.exports = {
    sendEmailCode,
};
