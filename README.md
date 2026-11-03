# 精品工具导航站

精品工具导航站是一套面向普通用户的实用工具发现与管理平台，提供分类浏览、关键词搜索、工具详情、收藏、评分、内容导入、运营审核和后台管理，帮助用户快速找到可靠的效率工具与在线服务。

## 主要功能

- 工具分类、标签、搜索、筛选和详情展示。
- 收藏、评分、访问统计和热门推荐。
- 通用工具数据导入、内容审核和上下架管理。
- 用户、权限、运营配置、操作日志和数据导出。
- 图片处理、文件导入、访问留存和后台任务。

## 产品界面

![精品工具导航站电脑端界面](artifacts/product-general-tools-desktop.png)

## 技术架构

- Next.js 16、React 19、Node.js 22。
- MySQL、ExcelJS、Sharp、HLS.js。
- Node.js 定时任务、Nginx、systemd。

## 环境要求

- Node.js 22+、npm 10+、MySQL 8.0 或兼容版本。
- 生产环境建议使用 Nginx、HTTPS 和独立数据库账号。

## 本地安装

```bash
git clone https://github.com/CharlesYin1204/premium-tools-directory.git
cd premium-tools-directory
npm ci
cp .env.example .env.local
npm run db:init
npm run data:general-tools
npm run dev
```

访问 `http://127.0.0.1:3020`。数据导入脚本会写入数据库，执行前请确认连接的是目标环境。

## 环境变量

| 配置 | 说明 |
| --- | --- |
| `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` | MySQL 连接 |
| `PUBLIC_URL` | 对外访问地址 |
| `SESSION_SECRET` | 会话签名密钥，至少 32 位随机字符 |
| `SESSION_SECURE` | HTTPS 环境设为 `true` |

## 测试与构建

```bash
npm test
npm run build
npm start
```

生产服务默认监听 `127.0.0.1:3020`。

## 生产部署

1. 安装 Node.js 22、MySQL、Nginx，创建 `tools_app` 等独立数据库用户。
2. 拉取代码，执行 `npm ci`，创建权限为 `600` 的 `.env.local`。
3. 创建数据库，执行 `npm run db:init`；按需要导入通用工具数据。
4. 执行 `npm test && npm run build`。
5. 使用 systemd 或 PM2 运行 `npm start`。
6. 参考 `deploy/tools-directory.nginx.conf` 配置反向代理和 HTTPS。
7. 按需启用 `tools-sync-worker.service` 和 IP 留存 timer。
8. 配置数据库、上传文件和环境配置备份，并定期恢复验证。

更新前备份数据库，随后安装依赖、执行必要迁移、构建并重启。导入任务应先在测试库验证，避免重复写入。

## 项目结构

- `app/`：页面与 API。
- `components/`：界面组件。
- `lib/`：数据库、会话和业务逻辑。
- `scripts/`：初始化、数据导入和测试。
- `deploy/`：Nginx、Worker 与定时任务配置。
- `artifacts/product-general-tools-desktop.png`：GitHub 产品介绍使用的电脑端截图。

## 常见问题

- 搜索无结果：确认已执行数据库初始化和通用工具导入。
- 登录状态丢失：检查 `PUBLIC_URL`、`SESSION_SECURE` 和代理协议头。
- 图片处理失败：检查 Sharp 依赖、文件权限和磁盘空间。
- 后台任务不运行：检查对应 systemd service/timer 和日志。

## 联系方式

微信：`charlesyin6015`

## 开源与二次开发

本项目采用 [MIT License](LICENSE) 开源。你可以点击 GitHub 页面右上角的 **Fork** 创建自己的副本，也可以克隆后创建新分支进行修改：

```bash
git checkout -b feature/my-change
```

请勿提交 `.env`、数据库备份、用户数据或任何真实密钥；部署前请根据 `.env.example` 创建自己的环境配置。
