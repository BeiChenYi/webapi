# 使用 Node.js 18 Alpine 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果有)
COPY backend/package*.json ./

# 安装依赖（使用 npm install 因为可能没有 package-lock.json）
RUN npm install --production

# 复制后端源代码
COPY backend/ ./

# 复制前端静态文件到 public 目录（假设前端构建后的文件放在 frontend/）
COPY frontend/ ./public/

# 创建 uploads 目录（用于 CSV 导入临时文件）
RUN mkdir -p uploads && chmod 777 uploads

# 创建数据库目录并设置权限
RUN mkdir -p db && chmod 777 db

# 暴露端口
EXPOSE 3000

# 设置环境变量（可以在 docker-compose 中覆盖）
ENV PORT=3000
ENV DATABASE_PATH=./db/database.sqlite
ENV SECRET_API_TOKEN=xiaoSya@oge1@2123SS

# 启动应用
CMD ["node", "server.js"]
