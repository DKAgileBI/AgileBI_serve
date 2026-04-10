/**
 * @name routes
 * @author Mr·Fan DkPlusAI
 * @Time 2021/12/28
 * @property {module}  mysql  数据库模块
 * @property {object}  config 数据库链接对象
 * @description 路由配置文件
 **/
const express = require('express');
/**
 * @name 接口路由
 * @author Mr·Fan DkPlusAI
 * @Time 2025/04/07
 * @property {module}  userAPI // 登录API
 * @property {module}  verifyTokenAPI  //校验token是否过期
 * @property {module}  serveMnusAPI    //获取菜单
 * @description 路由配置文件
 **/
const {
  CODE_TOKEN_EXPIRED
} = require('../utils/Statuscode');
//系统区域
const userAPI = require('./login/APIuser/userAPI');
const verifyTokenAPI = require('./login/APIverifyToken/verifyToken');
const serveMnusAPI = require('./login/serveMnus/serveMnus');
const uploadAvatarAPI = require('./login/uploadAvatar/uploadAvatar');
const emailVerifyAPI = require('./login/emailVerify/emailVerify');
const userAdminAPI = require('./login/serveUser/userAdmin');
//公共区域
const getOssInfoAPI = require('./public/oss/getOssInfo');
const getuploadFile = require('./public/uploadFile/uploadFile');
//项目区域
const projectList = require('./project/list/list');
const projectPublish = require('./project/publish/publish');
const projectDelete = require('./project/delete/delete');
const projectGetData = require('./project/getData/getData');
const projectEdite = require('./project/edit/edite');
const projectData = require('./project/edit/data');
const projectCreate = require('./project/create/create');
const projectCopy = require('./project/copy/copy');
//数据集区域
const datasetsAPI = require('./datasets/datasets');
//模板区域
const templatesAPI = require('./templates/templates');
//企业字典
const enterpriseDictAPI = require('./login/enterpriseDict/enterpriseDict');
//配置
const apiList = require('../config/apiList')
const nodeConfig = require('../config/node.config')
//组件库区域
const componentSave = require('./component/save/save');
const componentCreate = require('./component/create/create');
const componentUpdate = require('./component/update/update');
const componentDelete = require('./component/delete/delete');
const componentMyList = require('./component/list/myList');
const componentPublicList = require('./component/list/publicList');
const componentDetail = require('./component/detail/detail');
const componentPublish = require('./component/publish/publish');
const componentUploadPreview = require('./component/uploadPreview/uploadPreview');

const router = express.Router(); // 注册路由 
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
const { jwtAuth, decode } = require('../utils/user-jwt');
const ISAPI='/api'
router.use(jwtAuth); // 注入认证模块
//stse  设置
router.use(ISAPI, userAPI); // 注入登录模块
router.use(ISAPI, verifyTokenAPI); // 校验token是否过期
router.use(ISAPI, serveMnusAPI); // 获取菜单
router.use(ISAPI, uploadAvatarAPI); // 上传头像
router.use(ISAPI, emailVerifyAPI); // 邮箱验证码
router.use(ISAPI, userAdminAPI); // 管理员用户管理
//ss   公共设置
router.use(ISAPI, getOssInfoAPI); // 获取OSS配置
router.use(ISAPI, getuploadFile);// 获取上传文件
//project 项目设置
router.use(ISAPI, projectList);  //查询项目
router.use(ISAPI, projectPublish);  //变更是否发布状态
router.use(ISAPI, projectDelete);  //假删项目
router.use(ISAPI, projectGetData); //查看项目详情
router.use(ISAPI, projectEdite); //修改项目封面啥的
router.use(ISAPI, projectData);  //项目编辑详细信息
router.use(ISAPI, projectCreate);//创建项目
router.use(ISAPI, projectCopy);//复制项目为我的项目
//datasets 数据集设置
router.use(ISAPI, datasetsAPI);
//templates 模板设置
router.use(ISAPI, templatesAPI);
//enterpriseDict 企业字典设置
router.use(ISAPI, enterpriseDictAPI);
//component 组件库设置
router.use(ISAPI, componentSave);
router.use(ISAPI, componentCreate);
router.use(ISAPI, componentUpdate);
router.use(ISAPI, componentDelete);
router.use(ISAPI, componentMyList);
router.use(ISAPI, componentPublicList);
router.use(ISAPI, componentDetail);
router.use(ISAPI, componentPublish);
router.use(ISAPI, componentUploadPreview);
// 自定义统一异常处理中间件，需要放在代码最后
router.use((err, req, res, next) => {
    // 自定义用户认证失败的错误返回
    const urlWithoutParams = req.originalUrl.split('?')[0];
    const isDatasetsApi = urlWithoutParams.startsWith('/api/dkBi/datasets');
    const isTemplatesApi = urlWithoutParams.startsWith('/api/dkBi/templates');
    if (apiList.includes(urlWithoutParams) || isDatasetsApi || isTemplatesApi) {
        if (err && err.name === 'UnauthorizedError') {
            const { status = CODE_TOKEN_EXPIRED, message } = err;
            // 抛出401异常
            res.status(status).json({
                code: status,
                msg: '登录状态失效请重新登录',
                data: false
            })
        } else {
            const { output } = err || {};
            // 错误码和错误信息
            const errCode = (output && output.statusCode) || 500;
            const errMsg = (output && output.payload && output.payload.error) || err.message;
            res.status(errCode).json({
                code: errCode,
                msg: errMsg
            })
        }
    } else {
        if (nodeConfig.environment === 'text') {
            res.status(404).send('NO 404 请仔细检测接口路径')
        } else if (nodeConfig.environment === 'online') {
            res.status(404).send(req.originalUrl + '404')
        }
    }

})

module.exports = router;