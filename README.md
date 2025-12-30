# 在线表格编辑器

一个简单的网页在线表格，支持增加行、增加列、修改内容，数据自动保存，支持API直接获取表格内容。

## 功能特性

- 📊 **表格编辑**：双击单元格或表头进行编辑
- ➕ **行列操作**：支持动态增加行和列
- 💾 **自动保存**：数据自动保存到服务器，重启不丢失
- 🔄 **实时同步**：支持从服务器加载最新数据
- 📁 **数据导出**：可将表格导出为JSON文件
- 🔗 **API支持**：提供RESTful API接口
- 🎨 **响应式设计**：适配各种屏幕尺寸
- ⌨️ **键盘快捷键**：支持常用操作的快捷键

## 快速开始

### 本地运行

1. 确保已安装Node.js (v14+)
2. 克隆或下载本项目
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动服务器：
   ```bash
   node server.js
   ```
5. 打开浏览器访问：http://localhost:32577

### Ubuntu服务器部署

使用一键部署脚本：

```bash
# 下载项目文件
git clone <项目地址>
cd <项目目录>

# 给部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本（需要sudo权限）
sudo ./deploy.sh
```

部署脚本会自动：
- 安装Node.js和依赖
- 创建专用系统用户
- 配置systemd服务
- 设置开机自启
- 开放防火墙端口

## API接口

### 获取表格数据
```
GET /api/data
```
返回完整的表格数据，包括行数、列数、表头和单元格内容。

### 更新表格数据
```
PUT /api/data
Content-Type: application/json

{
  "rows": 5,
  "cols": 4,
  "headers": ["A", "B", "C", "D"],
  "data": [...]
}
```

### 获取特定单元格
```
GET /api/cell/:row/:col
```

### 更新特定单元格
```
PUT /api/cell/:row/:col
Content-Type: application/json

{
  "value": "新内容"
}
```

### 更新表头
```
PUT /api/header/:col
Content-Type: application/json

{
  "header": "新表头"
}
```

## 键盘快捷键

- `Ctrl + S`：保存数据到服务器
- `Ctrl + L`：从服务器加载数据
- `Ctrl + R`：添加一行
- `Ctrl + C`：添加一列
- `Ctrl + E`：导出数据为JSON文件
- `Enter`：保存编辑
- `ESC`：取消编辑

## 项目结构

```
├── server.js              # 后端服务器
├── package.json          # 项目依赖
├── data.json            # 数据存储文件（自动生成）
├── deploy.sh            # Ubuntu部署脚本
├── README.md            # 说明文档
└── public/              # 前端文件
    ├── index.html       # 主页面
    ├── style.css        # 样式表
    └── script.js        # 前端逻辑
```

## 数据持久化

数据自动保存到 `data.json` 文件中，服务器重启后数据不会丢失。每次编辑后2秒内自动保存。

## 系统服务管理

部署为系统服务后，可以使用以下命令管理：

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

# 设置开机自启（已自动设置）
sudo systemctl enable online-table-editor
```

## 自定义配置

### 修改端口
编辑 `server.js` 文件，修改 `const PORT` 的值。

### 修改数据存储位置
编辑 `server.js` 文件，修改 `DATA_FILE` 常量的值。

## 故障排除

### 端口被占用
如果端口32577已被占用，可以修改server.js中的端口号，然后重启服务。

### 权限问题
确保应用目录 `/opt/online-table-editor` 的权限正确：
```bash
sudo chown -R table-editor:table-editor /opt/online-table-editor
```

### 服务启动失败
查看详细日志：
```bash
sudo journalctl -u online-table-editor -n 50 --no-pager
```

## 许可证

MIT
