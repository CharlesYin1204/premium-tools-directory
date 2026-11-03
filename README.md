# 精品工具导航站

一个面向个人与团队的精品工具发现平台，帮助用户快速找到可靠的 AI、设计、开发、办公和效率工具。项目包含响应式前台、AI 工具推荐、运营管理后台以及完整的内容发布流程。

## 核心功能

- 工具导航：按分类、标签和关键词浏览常用工具。
- AI 工具推荐：用自然语言描述任务，智能匹配站内工具。
- 运营后台：管理工具、分类、推荐位、站点设置和管理员账号。
- 发布流程：支持草稿、审核、发布、下架、版本记录和操作审计。
- 数据管理：支持 CSV/XLSX 导入导出、访问统计与数据报表。
- 安全控制：包含权限校验、请求限流、安全 URL 检查和敏感配置隔离。
- 响应式设计：兼容主流桌面浏览器及不同尺寸屏幕。

## 产品界面

![精品工具导航站电脑端界面](artifacts/product-general-tools-desktop.png)

## 技术栈

- 前端：Next.js 16、React 19、Lucide React
- 服务端：Next.js App Router、Node.js 22
- 数据库：MySQL 8
- 图片处理：Sharp
- 测试：Node.js Test Runner、Playwright
- 部署：Nginx、systemd

## 项目结构

```text
├── app/                # 页面、路由与服务端 API
├── components/         # 前台和管理后台组件
├── lib/                # 数据访问、业务规则和安全能力
├── config/             # 应用配置与 AI 审核范围
├── data/               # 工具目录基础数据
├── public/             # 正式静态资源
├── scripts/            # 初始化、迁移、后台任务与自动化测试
├── deploy/             # Nginx 与 systemd 部署配置
└── project-docs/       # 架构、需求、运维和变更文档
```

## 本地运行

环境要求：Node.js 22、MySQL 8。

```bash
npm ci
cp .env.example .env.local
npm run db:init
npm run build
npm start
```

默认服务监听 `127.0.0.1:3020`。

## 环境变量

在 `.env.local` 中配置：

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
PUBLIC_URL=https://your-domain.example
SESSION_SECRET=replace-with-a-random-secret
SESSION_SECURE=true
```

不要提交 `.env.local`、管理员凭据、数据库备份或上传文件。

## 数据初始化

```bash
npm run db:init
npm run data:general-tools
```

`db:init` 创建数据库结构和初始管理员；`data:general-tools` 导入通用工具目录并自动备份现有资源配置。

## 测试与构建

```bash
npm test
npm run build
```

提交或部署前应保证自动化测试与生产构建全部通过。

## 生产部署

1. 安装 Node.js 22、MySQL 8 和 Nginx。
2. 上传项目并执行 `npm ci`。
3. 创建 `.env.local`，配置数据库、站点域名和 Session 密钥。
4. 执行数据库初始化或增量迁移。
5. 运行 `npm test` 和 `npm run build`。
6. 使用 systemd 启动服务，由 Nginx 反向代理到 `127.0.0.1:3020`。
7. 开启 HTTPS，并设置 `SESSION_SECURE=true`。
8. 检查首页、分类、AI 推荐、后台登录和发布流程。

部署配置示例位于 `deploy/`。更新前请备份数据库和 `storage/uploads`，并保留上一版本以便快速回滚。

## 联系方式

微信：`charlesyin6015`

## License

本项目暂未声明开源许可证，未经授权请勿用于商业发布。
