/**
 * @name app
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/24
 * @description 项目服务启动入口，负责初始化 Express、中间件、跨域与路由。
 **/
const path = require('path');
const express = require("express");
const os = require("os"); // 引入系统模块
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const orginList = require('./config/Crossdomain');


const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const port = 3041;

// ====================== 中间件 ======================
app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cors());

// ====================== 跨域处理 ======================
app.all("*", function (req, res, next) {
    if (orginList.includes(req.headers.origin)) {
        res.header("Access-Control-Allow-Origin", req.headers.origin);
    } else {
        res.header("Access-Control-Allow-Origin", process.env.CORS_FALLBACK_ORIGIN || '*');
    }
    res.header("Access-Control-Allow-Headers", "content-type, Authorization");
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() === 'options') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// ====================== 路由入口 ======================
app.use('/', routes);

// ====================== 获取本机IP函数 ======================
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}
const RUN_MODE = process.env.RUN_MODE || 'dev';
const NODE_ENV = process.env.NODE_ENV || 'development';
// ====================== 启动服务 ======================
const server = app.listen(port, '0.0.0.0', function () {
    const localIP = getLocalIP();
    console.log(`✅ Server started successfully!`);
    console.log(`🚀 当前运行模式: ${RUN_MODE}`);
    console.log(`🧱 NODE_ENV: ${NODE_ENV}`);
    console.log(`📍 Local:   http://127.0.0.1:${port}/`);
    console.log(`🌐 Network: http://${localIP}:${port}/`);
});
