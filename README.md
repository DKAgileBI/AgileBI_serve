<div align="center">

# DK AgileBI 服务端

一套面向 BI 看板、数据资产管理场景的一体化 Node.js 服务端，AI 能力请联系作者获取商业版。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14.17.1-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Original Author](https://img.shields.io/badge/Original%20Author-Mr%C2%B7Fan-0F766E?style=for-the-badge)](https://github.com/isMrFan)

[快速开始](#快速开始) • [目录结构](#目录结构) • [后端设计](#后端设计) • [赞助支持](#赞助支持) • [相关文档](#相关文档) • [特别鸣谢](#特别鸣谢)

</div>

---

## ✨ 特性

- 🧱 围绕 BI 业务资产构建，覆盖项目、数据集、组件、模板等核心模块。
- 🔐 统一账号、鉴权、可见性和权限边界，支持多种数据可见范围控制。
- 🤖 AI 能力为商业版提供，开源版不包含相关实现。
- 🧩 如需 AI 模块、专用场景或增强能力，请联系作者获取商业版方案。
- 📚 提供 apidoc 文档输出和详细的后端说明文档，便于联调和维护。
- 🛠 代码结构按路由、服务、SQL、配置、工具分层，适合持续演进。

---

## 🪂 项目简介

DK AgileBI 服务端不是一个只提供 CRUD 的接口仓库，而是一套围绕 数据资产、项目协作 和 智能分析 设计的后端底座。

它承接了 BI 平台中的核心后端职责，包括：

- 用户与权限
- 项目与数据集
- 组件与模板
- 文件上传与企业字典
- 商业版 AI 能力接入说明

整体定位可以概括为三层：

| 层级 | 作用 |
| --- | --- |
| 业务底座 | 承接项目、数据集、组件、模板等 BI 核心资产 |
| 协作中台 | 统一处理权限、菜单、上传、审核与可见性流转 |
| 商业版扩展层 | AI 能力仅在商业版提供，可联系作者获取 |

---

## 🏛 原始标识

为便于衍生项目、二次开发项目和分发版本识别来源，当前仓库明确保留以下原创标识：

- 原始作者：Mr·Fan
- 官方主页：<https://github.com/isMrFan>
- 官方仓库：<https://github.com/DKAgileBI/AgileBI_serve>
- 品牌 / 商标标识：DK-PLUS
- 原始说明文件：`README.md`、`NOTICE`、`LICENSE`、`header.md`

你可以基于本项目继续使用、修改和扩展，但请保留以上原创信息以及许可证文件，避免移除原始来源标识后再次分发。

补充说明：`DK-PLUS` 作为当前项目展示中的品牌标识，用于识别原始来源与官方分发版本。

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 准备数据库

- 按运行环境配置数据库连接信息。
- 相关文件主要位于 `db/` 和 `config/` 目录。
- 首次初始化数据库时，建议按 `sql/run_all.sql` 顺序导入。

### 启动开发环境

```bash
npm run nod:dev
```

### 启动线上模式

```bash
npm run nod:online
```

### 生成接口文档

```bash
npm run apidoc
```

默认服务端口为 `3041`。

---

## 🧭 当前能力范围

### 基础业务

- 用户与认证：登录、JWT 校验、管理员用户管理、邮箱验证、头像上传。
- BI 资产管理：项目、数据集、组件、模板的创建、编辑、公开、复制与授权。
- 企业级可见性控制：支持 `all`、`self`、`company`、`users` 多种可见范围。
- 文件能力：普通文件上传、OSS 配置读取。

### AI 能力

- 当前开源版不包含 AI 模块。
- 如需 AI 用户侧能力、管理侧能力或专用场景能力，请联系作者获取商业版。
- 联系邮箱：dk-plus-ui@foxmail.com

---

## 🏗 目录结构

```text
.
├─ app.js
├─ routes/
├─ services/
├─ sql/
├─ config/
├─ utils/
├─ public/MrFan/
├─ scripts/
└─ upload/
```

| 目录 | 作用 |
| --- | --- |
| `routes/` | 路由注册、参数校验、权限入口 |
| `services/` | 业务实现、响应组装 |
| `sql/` | 数据库初始化与增量脚本 |
| `config/` | 运行配置、白名单、字典 |
| `utils/` | 通用工具、状态码、JWT、文件处理 |
| `public/MrFan/` | apidoc 生成后的可视化文档 |

AI 模块不包含在当前开源仓库中。

如需完整 AI 模块与配套方案，请联系作者邮箱：dk-plus-ui@foxmail.com

---

## 🧠 后端设计

当前服务端按 路由层 + 服务层 + SQL/配置层 + 工具层 拆分，核心目标是让每一层只承担自己最清晰的职责。

### 分层职责

- 路由层：负责入口收口、参数校验和鉴权接入。
- 服务层：负责真实业务逻辑、跨表编排和响应结构组织。
- SQL / 配置层：负责表结构、初始化脚本和运行参数。
- 工具层：负责通用能力复用，降低重复代码。

### 设计原则

- 降低耦合，接口层和底层实现尽量解耦。
- 保持业务可演进，项目、数据集、模板和商业版扩展能力可以独立扩展。
- 兼顾存量 BI 业务和商业版增强能力，避免扩展能力反向破坏原有链路。
- 便于排查问题，能快速定位是在路由、服务、SQL、配置还是模型调用链路。

AI 能力属于商业版模块，不在当前开源仓库内提供；如需接入，请联系作者邮箱：dk-plus-ui@foxmail.com

---

## 🔐 权限与安全约定

- 鉴权方式为 JWT，请求头通常使用 `Authorization: Bearer <token>`。
- 非管理员默认只能操作本人创建或本人有权访问的数据。
- 管理员能力与普通用户能力分开控制，避免误开放全局数据访问。
- 商业版 AI 能力如需接入，其敏感配置由商业版后端统一托管。
- 上传文件等能力按用户身份和业务场景隔离。

---

## 📦 统一响应格式

绝大多数接口统一返回 JSON：

```json
{
  "code": 200,
  "msg": "请求成功",
  "data": {}
}
```

| 字段 | 说明 |
| --- | --- |
| `code` | 业务状态码，成功通常为 `200` |
| `msg` | 结果说明或错误提示 |
| `data` | 业务数据，可为对象、数组、布尔值或 `null` |

---

## ⚙️ 技术栈

| 类别 | 当前方案 |
| --- | --- |
| Runtime | Node.js >= 14.17.1 |
| Web | Express 4 |
| Database | MySQL 5.7+，推荐 8.0+ |
| Auth | JWT |
| API 文档 | apidoc + 自定义主题 |

核心依赖：

- `express-validator`
- `express-jwt` / `jsonwebtoken`
- `mysql`
- `multer` / `multiparty`
- `nodemailer`
- `pdf-parse`
- `xlsx`

---

## 📚 建议阅读顺序

### 如果你是首次接入

1. 先看登录、Token 校验和菜单相关接口。
2. 再看项目、数据集、组件、模板四类核心 BI 资产模块。
3. 如需 AI 能力，请联系作者获取商业版说明，邮箱：dk-plus-ui@foxmail.com。

### 如果你是后端维护者

1. 先读 `routes/`，理解请求入口如何分发。
2. 再读 `services/`，理解真实业务逻辑落点。
3. 再看 `sql/` 和 `config/`，理解数据结构与运行依赖。
4. 如需 AI 模块架构与接入方案，请联系作者获取商业版资料，邮箱：dk-plus-ui@foxmail.com。

---

## 🐳 相关文档

- `header.md`：更完整的服务端设计说明与接口联调说明。
- `public/MrFan/`：apidoc 生成后的可视化文档。
- `sql/z_readme.md`：数据库脚本说明入口。
- `sponsor/README.md`：赞助说明与赞助排名入口。

---

## 💌 特别鸣谢

README 的展示结构参考了 `dkplusui/dk-plus-ui` 的首页组织方式，特别感谢这个项目的真实贡献者与提交者带来的启发。

特别鸣谢以下真实贡献者：

- [@isMrFan](https://github.com/isMrFan)
- [@WangYingJay](https://github.com/WangYingJay)
- [@fanfanyiyun](https://github.com/fanfanyiyun)

参考项目：<https://github.com/dkplusui/dk-plus-ui>

---

## 👨‍💻 作者信息

- 作者：Mr·Fan
- GitHub：<https://github.com/isMrFan>
- 官方仓库：<https://github.com/DKAgileBI/AgileBI_serve>

---

## 📃 协议许可证

本项目采用 [MIT](LICENSE) 协议。

衍生项目在再分发时，请同时保留 [NOTICE](NOTICE) 中的原创来源声明。

---

## ☕ 赞助支持

如果你认可这个项目，欢迎通过赞助支持后续维护与更新。

### 赞助说明

- 赞助用途：用于项目持续维护、功能迭代、文档完善与日常更新。
- 展示规则：单次打赏金额大于 10 元的赞助者，会展示在赞助排名中。
- 更新时间：赞助排名每周日晚上统一更新一次。
- 排名数据文件：`sponsor/ranking.json`

### 赞赏码

<div align="center">

<img src="./code.png/56f3c0b56fc0872cea24c7da4b9d525d.png" alt="赞赏码" width="320" />

</div>

感谢您的打赏，是我最大的动力。

当前赞赏码用于支持 DK AgileBI 服务端项目的持续维护与迭代更新。

### 赞助排名

当前赞助排名维护在 `sponsor/ranking.json` 中，建议按金额和更新时间进行展示。

| 排名 | 昵称 | 金额 | 时间 | 备注 |
| --- | --- | --- | --- | --- |
| 暂无 | 暂无 | 暂无 | 暂无 | 等待首次公开赞助 |

