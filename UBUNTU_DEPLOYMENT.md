# Ubuntu服务器部署指南

## 前提条件

1. Ubuntu服务器（20.04/22.04/24.04）
2. 具有sudo权限的用户
3. 服务器可以访问互联网

## 方法一：使用一键部署脚本（推荐）

### 步骤1：上传项目文件到服务器

```bash
# 在本地打包项目
tar -czf table-editor.tar.gz --exclude=node_modules --exclude=data.json .

# 上传到服务器（使用scp）
scp table-editor.tar.gz user@your-server-ip:/tmp/

# 登录服务器
ssh user@your-server-ip
```

### 步骤2：在服务器上执行部署

```bash
# 解压文件
cd /tmp
tar -xzf table-editor.tar.gz -C /opt/

# 进入项目目录
cd /opt/table-editor

# 给部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本（需要sudo权限）
sudo ./deploy.sh
```

### 步骤3：验证部署

```bash
# 检查服务状态
sudo systemctl status online-table-editor

# 检查端口监听
sudo netstat -tlnp | grep 32577

# 测试API
curl http://localhost:32577/api/data
```

## 方法二：手动部署

### 步骤1：安装Node.js

```bash
# 更新系统
sudo apt update
sudo apt upgrade -y

# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 步骤2：创建应用用户

```bash
# 创建专用用户
sudo useradd -r -s /bin/false -m -d /opt/online-table-editor table-editor
```

### 步骤3：部署应用文件

```bash
# 创建应用目录
sudo mkdir -p /opt/online-table-editor
sudo chown table-editor:table-editor /opt/online-table-editor

# 复制项目文件（假设文件在/tmp/table-editor）
sudo cp -r /tmp/table-editor/* /opt/online-table-editor/
sudo chown -R table-editor:table-editor /opt/online-table-editor

# 安装依赖
cd /opt/online-table-editor
sudo -u table-editor npm install --production
```

### 步骤4：创建systemd服务

```bash
# 创建服务文件
sudo nano /etc/systemd/system/online-table-editor.service
```

粘贴以下内容：

```ini
[Unit]
Description=Online Table Editor Web Application
After=network.target

[Service]
Type=simple
User=table-editor
WorkingDirectory=/opt/online-table-editor
Environment=NODE_ENV=production
Environment=PORT=32577
ExecStart=/usr/bin/node /opt/online-table-editor/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=online-table-editor

[Install]
WantedBy=multi-user.target
```

### 步骤5：启动服务

```bash
# 重新加载systemd
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable online-table-editor

# 启动服务
sudo systemctl start online-table-editor

# 检查状态
sudo systemctl status online-table-editor
```

### 步骤6：配置防火墙

```bash
# 如果使用ufw
sudo ufw allow 32577/tcp
sudo ufw reload

# 如果使用firewalld
sudo firewall-cmd --permanent --add-port=32577/tcp
sudo firewall-cmd --reload
```

## 方法三：使用Docker部署

### 步骤1：安装Docker

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 添加当前用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

### 步骤2：创建Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 32577

USER node

CMD ["node", "server.js"]
```

### 步骤3：构建和运行

```bash
# 构建镜像
docker build -t online-table-editor .

# 运行容器
docker run -d \
  --name table-editor \
  -p 32577:32577 \
  -v table-data:/app/data.json \
  online-table-editor

# 查看日志
docker logs table-editor
```

## 访问应用

部署完成后，可以通过以下方式访问：

1. **本地访问**：`http://localhost:32577`
2. **网络访问**：`http://服务器IP:32577`
3. **API端点**：`http://服务器IP:32577/api/data`

## 管理命令

### 服务管理

```bash
# 启动服务
sudo systemctl start online-table-editor

# 停止服务
sudo systemctl stop online-table-editor

# 重启服务
sudo systemctl restart online-table-editor

# 查看状态
sudo systemctl status online-table-editor

# 查看日志
sudo journalctl -u online-table-editor -f
```

### 数据备份

```bash
# 备份数据文件
sudo cp /opt/online-table-editor/data.json /backup/table-data-$(date +%Y%m%d).json

# 恢复数据
sudo cp /backup/table-data-20251230.json /opt/online-table-editor/data.json
sudo chown table-editor:table-editor /opt/online-table-editor/data.json
sudo systemctl restart online-table-editor
```

## 故障排除

### 1. 端口被占用

```bash
# 检查端口占用
sudo lsof -i :32577

# 如果被占用，可以修改端口
sudo nano /opt/online-table-editor/server.js
# 修改 PORT 常量
```

### 2. 权限问题

```bash
# 修复权限
sudo chown -R table-editor:table-editor /opt/online-table-editor
sudo chmod -R 755 /opt/online-table-editor
```

### 3. 服务启动失败

```bash
# 查看详细日志
sudo journalctl -u online-table-editor -n 50 --no-pager

# 测试手动启动
cd /opt/online-table-editor
sudo -u table-editor node server.js
```

### 4. 无法访问API

```bash
# 检查服务是否运行
curl -v http://localhost:32577/api/data

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all
```

## 安全建议

1. **使用HTTPS**：配置Nginx反向代理并添加SSL证书
2. **限制访问**：使用防火墙限制只允许特定IP访问
3. **定期更新**：保持Node.js和依赖包更新
4. **监控日志**：定期检查系统日志和应用日志
5. **数据备份**：定期备份data.json文件

## 性能优化

1. **增加内存限制**：在服务文件中添加 `MemoryLimit=256M`
2. **使用PM2**：替代简单的node启动
3. **启用压缩**：在server.js中添加压缩中间件
4. **缓存静态文件**：配置适当的缓存头

## 更新应用

```bash
# 停止服务
sudo systemctl stop online-table-editor

# 备份当前数据
sudo cp /opt/online-table-editor/data.json /tmp/data-backup.json

# 更新文件
cd /opt/online-table-editor
sudo git pull  # 如果使用git
# 或手动复制新文件

# 恢复数据
sudo cp /tmp/data-backup.json /opt/online-table-editor/data.json

# 更新依赖
sudo -u table-editor npm install --production

# 重启服务
sudo systemctl start online-table-editor
```

## 卸载应用

```bash
# 停止服务
sudo systemctl stop online-table-editor
sudo systemctl disable online-table-editor

# 删除服务文件
sudo rm /etc/systemd/system/online-table-editor.service
sudo systemctl daemon-reload

# 删除应用目录
sudo rm -rf /opt/online-table-editor

# 删除用户
sudo userdel table-editor
```

---

**注意**：部署前请确保服务器有足够的内存和磁盘空间。建议至少1GB内存和10GB磁盘空间。
