const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { db } = require('../db');
const router = express.Router();

// 验证 API Token 的中间件
function authenticateToken(req, res, next) {
  const token = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.SECRET_API_TOKEN}`;
  if (token === expectedToken) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }
}

// 配置 Multer 用于文件上传（CSV）
const upload = multer({ dest: 'uploads/' });

// 获取所有数据（公开）
router.get('/', (req, res) => {
  db.all('SELECT * FROM rows ORDER BY id', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

// 新增一行（需 Token）
router.post('/', authenticateToken, (req, res) => {
  const { name, age, department, join_date } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run(
    'INSERT INTO rows (name, age, department, join_date) VALUES (?, ?, ?, ?)',
    [name, age || null, department || null, join_date || null],
    function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to insert row' });
      } else {
        res.status(201).json({ id: this.lastID, name, age, department, join_date });
      }
    }
  );
});

// 更新一行（需 Token）
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, age, department, join_date } = req.body;
  db.run(
    'UPDATE rows SET name = ?, age = ?, department = ?, join_date = ? WHERE id = ?',
    [name, age || null, department || null, join_date || null, id],
    function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update row' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Row not found' });
      } else {
        res.json({ id, name, age, department, join_date });
      }
    }
  );
});

// 删除一行（需 Token）
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM rows WHERE id = ?', id, function (err) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete row' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Row not found' });
    } else {
      res.status(204).send();
    }
  });
});

// 导出 CSV（公开）
router.get('/export', (req, res) => {
  db.all('SELECT * FROM rows ORDER BY id', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    // 生成 CSV 内容
    const header = ['ID', '姓名', '年龄', '部门', '入职日期', '创建时间'];
    const csvRows = rows.map(row => [
      row.id,
      row.name,
      row.age,
      row.department,
      row.join_date,
      row.created_at
    ]);
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += header.join(',') + '\n';
    csvRows.forEach(row => {
      csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename=spreadsheet.csv');
    res.send(csvContent);
  });
});

// 导入 CSV（需 Token）
router.post('/import', authenticateToken, upload.single('csvfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv({
      headers: ['name', 'age', 'department', 'join_date'],
      skipLines: 0
    }))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // 删除临时文件
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temporary file:', err);
      });
      // 批量插入数据库
      const stmt = db.prepare('INSERT INTO rows (name, age, department, join_date) VALUES (?, ?, ?, ?)');
      let inserted = 0;
      let errors = [];
      results.forEach((row, index) => {
        // 验证必填字段
        if (!row.name) {
          errors.push(`Row ${index + 1}: Name is missing`);
          return;
        }
        stmt.run([row.name, row.age || null, row.department || null, row.join_date || null], (err) => {
          if (err) {
            errors.push(`Row ${index + 1}: ${err.message}`);
          } else {
            inserted++;
          }
        });
      });
      stmt.finalize(() => {
        if (errors.length > 0) {
          res.status(400).json({ error: 'Partial import', details: errors, inserted });
        } else {
          res.json({ message: `Successfully imported ${inserted} rows` });
        }
      });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: 'Error processing CSV file' });
    });
});

module.exports = router;
