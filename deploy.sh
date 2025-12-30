#!/bin/bash

# 在线表格编辑器部署脚本
# 适用于Ubuntu 20.04/22.04/24.04
# 将应用安装为系统服务，开机自启

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 应用配置
APP_NAME="online-table-editor"
APP_PORT="32577"
APP_USER="table-editor"
APP_DIR="/opt/$APP_NAME"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以root运行
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用sudo或以root用户运行此脚本"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    print_info "安装系统依赖..."
    apt-get update
    apt-get install -y curl wget git
    
    print_info "安装Node.js..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    else
        print_warn "Node.js 已安装: $(node --version)"
    fi
    
    print_info "安装PM2..."
    npm install -g pm2
}

# 创建应用用户
create_app_user() {
    if ! id "$APP_USER" &>/dev/null; then
        print_info "创建应用用户: $APP_USER"
        useradd -r -s /bin/false -m -d "$APP_DIR" "$APP_USER"
    else
        print_warn "用户 $APP_USER 已存在"
    fi
}

# 部署应用
deploy_app() {
    print_info "部署应用到 $APP_DIR"
    
    # 创建应用目录
    mkdir -p "$APP_DIR"
    
    # 复制当前目录的所有文件到应用目录
    cp -r . "$APP_DIR"/
    
    # 设置权限
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    # 安装npm依赖
    print_info "安装Node.js依赖..."
    cd "$APP_DIR"
    sudo -u "$APP_USER" npm install --production
}

# 创建systemd服务
create_systemd_service() {
    print_info "创建systemd服务..."
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Online Table Editor Web Application
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载systemd
    systemctl daemon-reload
    systemctl enable "$APP_NAME"
    
    print_info "服务文件创建在: $SERVICE_FILE"
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."
    
    if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
        ufw allow "$APP_PORT/tcp"
        print_info "防火墙已开放端口 $APP_PORT"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port="$APP_PORT/tcp"
        firewall-cmd --reload
        print_info "firewalld 已开放端口 $APP_PORT"
    else
        print_warn "未检测到防火墙，请手动开放端口 $APP_PORT"
    fi
}

# 启动服务
start_service() {
    print_info "启动服务..."
    systemctl start "$APP_NAME"
    systemctl status "$APP_NAME" --no-pager
    
    # 检查服务状态
    if systemctl is-active --quiet "$APP_NAME"; then
        print_info "服务启动成功!"
    else
        print_error "服务启动失败，请检查日志: journalctl -u $APP_NAME"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    local ip_address
    ip_address=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}      在线表格编辑器部署完成!          ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "应用名称: ${YELLOW}$APP_NAME${NC}"
    echo -e "运行端口: ${YELLOW}$APP_PORT${NC}"
    echo -e "应用目录: ${YELLOW}$APP_DIR${NC}"
    echo -e "服务状态: ${YELLOW}systemctl status $APP_NAME${NC}"
    echo -e "查看日志: ${YELLOW}journalctl -u $APP_NAME -f${NC}"
    echo ""
    echo -e "访问地址:"
    echo -e "  - 本地: ${YELLOW}http://localhost:$APP_PORT${NC}"
    echo -e "  - 网络: ${YELLOW}http://$ip_address:$APP_PORT${NC}"
    echo -e "  - API:  ${YELLOW}http://$ip_address:$APP_PORT/api/data${NC}"
    echo ""
    echo -e "管理命令:"
    echo -e "  ${YELLOW}systemctl start $APP_NAME${NC}    # 启动服务"
    echo -e "  ${YELLOW}systemctl stop $APP_NAME${NC}     # 停止服务"
    echo -e "  ${YELLOW}systemctl restart $APP_NAME${NC}  # 重启服务"
    echo -e "  ${YELLOW}systemctl status $APP_NAME${NC}   # 查看状态"
    echo ""
    echo -e "${GREEN}数据存储位置: $APP_DIR/data.json${NC}"
    echo -e "${GREEN}服务已设置为开机自启${NC}"
    echo ""
}

# 主函数
main() {
    print_info "开始部署在线表格编辑器..."
    print_info "目标端口: $APP_PORT"
    
    check_root
    install_dependencies
    create_app_user
    deploy_app
    create_systemd_service
    configure_firewall
    start_service
    show_deployment_info
    
    print_info "部署完成!"
}

# 执行主函数
main "$@"
