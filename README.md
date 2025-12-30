# 三千里风 (Sanqianli Wind) - 轻量级在线表格，随风而致

一个基于 Web 的轻量级在线表格应用，支持数据的增删改查、导入导出 CSV，并通过 API Token 进行安全鉴权。使用 Node.js + Express + SQLite 构建，前端使用原生 HTML/CSS/JavaScript，可通过 Docker 快速部署。

## 功能特性

- **表格管理**：
  - 查看所有数据行（ID、姓名、年龄、部门、入职日期、创建时间）
  - 双击单元格编辑内容
  - 添加新行（需 API Token）
  - 删除行（需 API Token）
- **CSV 操作**：
  - 导出表格为 CSV 文件（公开）
  - 导入 CSV 文件批量添加数据（需 API Token）
- **用户认证**：
  - 基于 API Token 的简单鉴权
  - Token 可在前端输入，用于保护写操作
  - 读取数据与导出 CSV 无需 Token
- **用户界面**：
  - 现代化响应式设计，支持移动端
  - 实时 Toast 通知（成功、错误、警告、信息）
  - 加载覆盖层，避免重复操作
  - 空表格状态提示与引导按钮
  - 系统状态卡片（后端连接、行数、Token 状态、最后更新时间）
  - 每10秒自动刷新表格数据
- **部署友好**：
  - 提供 Dockerfile 和 docker-compose.yml
  - 使用 SQLite 文件数据库，无需额外服务
  - 环境变量配置，易于扩展

## 技术栈

- **后端**：Node.js 18, Express 4.x, SQLite3, dotenv, multer (文件上传), csv-parser
- **前端**：原生 HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+), Font Awesome 图标, Google Fonts (Inter)
- **数据库**：SQLite（单文件，无需独立服务）
- **容器化**：Docker, Docker Compose
- **版本控制**：Git

## 项目结构

```
.
├── backend/                    # 后端代码
│   ├── server.js              # Express 主服务器
│   ├── db.js                  # 数据库连接与初始化
│   ├── routes/
│   │   └── data.js            # 数据相关 API 路由
│   ├── package.json           # 依赖定义
│   └── .env                   # 环境变量（示例）
├── frontend/                  # 前端代码
│   ├── index.html             # 主页面
│   ├── style.css              # 样式表
│   └── script.js              # 交互逻辑
├── docker/                    # 容器化配置
│   ├── Dockerfile             # Docker 镜像构建文件
│   └── docker-compose.yml     # 多容器编排（单服务）
├── README.md                  # 项目说明（本文档）
└── .gitignore                 # Git 忽略规则
```

## API 接口

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/data` | GET | 公开 | 获取所有行数据（JSON） |
| `/api/data/:id` | GET | 公开 | 获取单条数据（JSON），支持查询参数 `field` 读取特定单元格（如 `?field=name`） |
| `/api/data` | POST | 需 Token | 新增一行数据 |
| `/api/data/:id` | PUT | 需 Token | 更新指定行 |
| `/api/data/:id` | DELETE | 需 Token | 删除指定行 |
| `/api/data/export` | GET | 公开 | 导出 CSV 文件 |
| `/api/data/import` | POST | 需 Token | 导入 CSV 文件（multipart/form-data） |
| `/health` | GET | 公开 | 健康检查 |

**Token 验证**：在请求头中添加 `Authorization: Bearer <your_token>`。

## 快速开始

### 1. 直接运行（最简单）

项目已提供一键启动脚本，无需 Docker。

#### Linux / macOS

```bash
# 克隆仓库
git clone https://github.com/BeiChenYi/webapi.git
cd webapi

# 赋予执行权限并运行
chmod +x run.sh
./run.sh
```

#### Windows

```bash
# 克隆仓库
git clone https://github.com/BeiChenYi/webapi.git
cd webapi

# 双击 run.bat 或命令行执行
run.bat
```

脚本会自动安装依赖并启动后端服务器。

### 2. 手动运行（开发环境）

#### 后端

```bash
cd backend
npm install
cp .env.example .env  # 复制环境变量文件（如果需要修改）
npm start
```

#### 前端

前端文件由后端静态服务提供，直接访问 http://localhost:3000 即可。

### 3. 使用 Docker 运行（可选）

确保已安装 Docker 和 Docker Compose。

```bash
# 克隆仓库
git clone https://github.com/BeiChenYi/webapi.git
cd webapi

# 启动服务（使用默认 Token）
docker-compose -f docker/docker-compose.yml up -d
```

访问 http://localhost:3000 即可使用。

### 3. 环境变量

在 `.env` 文件中设置：

```
PORT=3000
SECRET_API_TOKEN=xiaoSya@oge1@2123SS
DATABASE_PATH=./db/database.sqlite
```

## 配置说明

### 数据库

- 使用 SQLite，数据库文件位于 `backend/db/database.sqlite`（Docker 中为 `/app/db/database.sqlite`）。
- 首次启动时会自动创建 `rows` 表并插入三条示例数据。

### 安全

- 默认 API Token 为 `xiaoSya@oge1@2123SS`，可在环境变量中修改。
- 前端 Token 输入框默认填入该值，可随时修改。
- 所有写操作（POST、PUT、DELETE、导入）均需验证 Token。

### 导入 CSV 格式

CSV 文件应包含以下列（顺序不限，但列名需匹配）：

- `name` (必填)
- `age` (可选)
- `department` (可选)
- `join_date` (可选，格式 YYYY-MM-DD)

示例：

```csv
name,age,department,join_date
张三,28,技术部,2023-01-15
李四,35,市场部,2022-08-22
```

## 部署到生产环境

### Docker 部署

1. 构建镜像：
   ```bash
   docker build -t online-spreadsheet -f docker/Dockerfile .
   ```

2. 运行容器：
   ```bash
   docker run -d -p 3000:3000 \
     -v spreadsheet_data:/app/db \
     -e SECRET_API_TOKEN=your_strong_token_here \
     --name spreadsheet \
     online-spreadsheet
   ```

### 使用 docker-compose

修改 `docker/docker-compose.yml` 中的环境变量，然后：

```bash
cd docker
docker-compose up -d
```

### 云平台

- **Railway**: 可直接连接 GitHub 仓库自动部署。
- **Render**: 支持 Docker 或 Node.js 原生部署。
- **Fly.io**: 适合容器化应用。

## 更新日志

### v1.0.0 (2025-12-30)
- 初始版本发布
- 实现完整的增删改查功能
- 支持 CSV 导入/导出
- 提供 Docker 部署方案

## 许可证

本项目基于 MIT 许可证开源。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 联系方式

- 项目仓库：[BeiChenYi/webapi](https://github.com/BeiChenYi/webapi)
- 如有问题，请通过 GitHub Issues 反馈。

---

**提示**：本系统适用于小型团队内部数据管理、演示用途。如需更高并发或更复杂功能，可考虑升级数据库（如 PostgreSQL）并增加用户管理系统。
