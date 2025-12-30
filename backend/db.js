const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './db/database.sqlite';
const db = new sqlite3.Database(dbPath);

// 初始化数据库表
function initialize() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER,
        department TEXT,
        join_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database table "rows" ready.');
        // 可选：插入一些示例数据（如果表为空）
        db.get('SELECT COUNT(*) as count FROM rows', (err, row) => {
          if (err) {
            console.warn('Could not count rows:', err.message);
          } else if (row.count === 0) {
            const sampleData = [
              ['张三', 28, '技术部', '2023-01-15'],
              ['李四', 35, '市场部', '2022-08-22'],
              ['王五', 42, '财务部', '2021-05-10']
            ];
            const stmt = db.prepare('INSERT INTO rows (name, age, department, join_date) VALUES (?, ?, ?, ?)');
            sampleData.forEach(data => stmt.run(data));
            stmt.finalize();
            console.log('Inserted sample data.');
          }
          resolve();
        });
      }
    });
  });
}

// 关闭数据库连接（用于优雅关闭）
function close() {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  db,
  initialize,
  close
};
