@echo off
echo 启动三千里风在线表格...
cd backend
REM 确保数据库目录存在
if not exist db mkdir db
call npm install
call npm start
