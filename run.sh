#!/bin/bash
echo "启动三千里风在线表格..."
cd backend
# 确保数据库目录存在
mkdir -p db
npm install
npm start
