const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 32577;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// 提供静态文件（前端）
app.use(express.static(path.join(__dirname, 'public')));

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data.json');

// 从文件加载数据或使用默认数据
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (error) {
    console.error('加载数据文件失败:', error);
  }
  
  // 默认数据
  return {
    rows: 5,
    cols: 4,
    headers: ['A', 'B', 'C', 'D'],
    data: [
      ['A1', 'B1', 'C1', 'D1'],
      ['A2', 'B2', 'C2', 'D2'],
      ['A3', 'B3', 'C3', 'D3'],
      ['A4', 'B4', 'C4', 'D4'],
      ['A5', 'B5', 'C5', 'D5']
    ]
  };
}

// 保存数据到文件
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存数据文件失败:', error);
    return false;
  }
}

// 初始化数据
let tableData = loadData();

// API: 获取所有表格数据
app.get('/api/data', (req, res) => {
  res.json(tableData);
});

// API: 更新整个表格（自动保存）
app.post('/api/data', (req, res) => {
  const { rows, cols, headers, data } = req.body;
  
  if (rows === undefined || cols === undefined || !Array.isArray(data)) {
    return res.status(400).json({ error: '无效的数据格式' });
  }
  
  tableData = { rows, cols, headers: headers || tableData.headers, data };
  
  // 自动保存到文件
  if (saveData(tableData)) {
    res.json({ success: true, message: '表格数据已更新并保存' });
  } else {
    res.status(500).json({ error: '数据保存失败' });
  }
});

// API: 更新表格（部分更新，自动保存）
app.put('/api/data', (req, res) => {
  const updates = req.body;
  
  // 合并更新到现有数据
  if (updates.headers !== undefined) tableData.headers = updates.headers;
  if (updates.rows !== undefined) tableData.rows = updates.rows;
  if (updates.cols !== undefined) tableData.cols = updates.cols;
  if (updates.data !== undefined) tableData.data = updates.data;
  
  // 自动保存到文件
  if (saveData(tableData)) {
    res.json({ success: true, message: '表格数据已更新并保存' });
  } else {
    res.status(500).json({ error: '数据保存失败' });
  }
});

// API: 获取特定单元格数据
app.get('/api/cell/:row/:col', (req, res) => {
  const row = parseInt(req.params.row);
  const col = parseInt(req.params.col);
  
  if (row >= 0 && row < tableData.rows && col >= 0 && col < tableData.cols) {
    res.json({ value: tableData.data[row][col] });
  } else {
    res.status(404).json({ error: '单元格不存在' });
  }
});

// API: 更新特定单元格（自动保存）
app.put('/api/cell/:row/:col', (req, res) => {
  const row = parseInt(req.params.row);
  const col = parseInt(req.params.col);
  const { value } = req.body;
  
  if (row >= 0 && row < tableData.rows && col >= 0 && col < tableData.cols) {
    if (value === undefined) {
      return res.status(400).json({ error: '缺少value字段' });
    }
    tableData.data[row][col] = value;
    
    // 自动保存到文件
    if (saveData(tableData)) {
      res.json({ success: true, message: '单元格已更新并保存' });
    } else {
      res.status(500).json({ error: '数据保存失败' });
    }
  } else {
    res.status(404).json({ error: '单元格不存在' });
  }
});

// API: 更新表头（自动保存）
app.put('/api/header/:col', (req, res) => {
  const col = parseInt(req.params.col);
  const { header } = req.body;
  
  if (col >= 0 && col < tableData.cols) {
    if (header === undefined) {
      return res.status(400).json({ error: '缺少header字段' });
    }
    
    // 确保headers数组存在
    if (!tableData.headers) {
      tableData.headers = Array(tableData.cols).fill('').map((_, i) => String.fromCharCode(65 + i));
    }
    
    tableData.headers[col] = header;
    
    // 自动保存到文件
    if (saveData(tableData)) {
      res.json({ success: true, message: '表头已更新并保存' });
    } else {
      res.status(500).json({ error: '数据保存失败' });
    }
  } else {
    res.status(404).json({ error: '列不存在' });
  }
});

// 默认路由返回前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API端点: http://localhost:${PORT}/api/data`);
});
