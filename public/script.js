// 表格数据状态
let tableState = {
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

// 自动保存设置
let autoSaveEnabled = true;
let saveTimeout = null;
const AUTO_SAVE_DELAY = 2000; // 2秒后自动保存

// DOM元素
const tableBody = document.getElementById('tableBody');
const headerRow = document.getElementById('headerRow');
const rowCountEl = document.getElementById('rowCount');
const colCountEl = document.getElementById('colCount');
const cellCountEl = document.getElementById('cellCount');
const statusText = document.getElementById('statusText');
const lastSaveTimeEl = document.getElementById('lastSaveTime');
const autoSaveToggle = document.getElementById('autoSaveToggle');

// 初始化表格
async function initTable() {
    // 从服务器加载数据
    await loadFromServer();
    updateHeader();
    updateBody();
    updateStatus();
    updateLastSaveTime();
}

// 更新表头（支持编辑）
function updateHeader() {
    // 清空表头（保留第一个单元格）
    while (headerRow.children.length > 1) {
        headerRow.removeChild(headerRow.lastChild);
    }
    
    // 添加列标题
    for (let col = 0; col < tableState.cols; col++) {
        const th = document.createElement('th');
        th.textContent = tableState.headers[col] || String.fromCharCode(65 + col);
        th.title = `双击编辑表头 (列 ${col + 1})`;
        th.dataset.col = col;
        
        // 双击编辑表头
        th.addEventListener('dblclick', () => startEditHeader(th));
        
        headerRow.appendChild(th);
    }
}

// 更新表格主体
function updateBody() {
    tableBody.innerHTML = '';
    
    for (let row = 0; row < tableState.rows; row++) {
        const tr = document.createElement('tr');
        
        // 行号单元格
        const th = document.createElement('th');
        th.textContent = row + 1;
        th.className = 'row-header';
        tr.appendChild(th);
        
        // 数据单元格
        for (let col = 0; col < tableState.cols; col++) {
            const td = document.createElement('td');
            td.textContent = tableState.data[row]?.[col] || '';
            td.dataset.row = row;
            td.dataset.col = col;
            
            // 双击编辑
            td.addEventListener('dblclick', () => startEditCell(td));
            
            tr.appendChild(td);
        }
        
        tableBody.appendChild(tr);
    }
}

// 开始编辑表头
function startEditHeader(th) {
    if (th.classList.contains('editing')) return;
    
    const col = parseInt(th.dataset.col);
    const currentValue = tableState.headers[col] || String.fromCharCode(65 + col);
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.maxLength = 20;
    
    // 保存编辑
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditHeader(th, input.value);
        } else if (e.key === 'Escape') {
            cancelEditHeader(th, currentValue);
        }
    });
    
    // 失去焦点时保存
    input.addEventListener('blur', () => {
        finishEditHeader(th, input.value);
    });
    
    // 替换表头内容
    th.textContent = '';
    th.classList.add('editing');
    th.appendChild(input);
    input.focus();
    input.select();
}

// 完成编辑表头
function finishEditHeader(th, newValue) {
    const col = parseInt(th.dataset.col);
    
    // 更新数据
    tableState.headers[col] = newValue || String.fromCharCode(65 + col);
    
    // 更新显示
    th.classList.remove('editing');
    th.textContent = tableState.headers[col];
    
    // 自动保存
    scheduleAutoSave();
    updateStatusMessage(`表头"${tableState.headers[col]}"已更新`);
}

// 取消编辑表头
function cancelEditHeader(th, originalValue) {
    th.classList.remove('editing');
    th.textContent = originalValue;
}

// 开始编辑单元格
function startEditCell(td) {
    if (td.classList.contains('editing')) return;
    
    const row = parseInt(td.dataset.row);
    const col = parseInt(td.dataset.col);
    const currentValue = tableState.data[row]?.[col] || '';
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.maxLength = 100;
    
    // 保存编辑
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditCell(td, input.value);
        } else if (e.key === 'Escape') {
            cancelEditCell(td, currentValue);
        }
    });
    
    // 失去焦点时保存
    input.addEventListener('blur', () => {
        finishEditCell(td, input.value);
    });
    
    // 替换单元格内容
    td.textContent = '';
    td.classList.add('editing');
    td.appendChild(input);
    input.focus();
    input.select();
}

// 完成编辑单元格
function finishEditCell(td, newValue) {
    const row = parseInt(td.dataset.row);
    const col = parseInt(td.dataset.col);
    
    // 更新数据
    if (!tableState.data[row]) tableState.data[row] = [];
    tableState.data[row][col] = newValue;
    
    // 更新显示
    td.classList.remove('editing');
    td.textContent = newValue || '';
    
    // 自动保存
    scheduleAutoSave();
    updateStatusMessage(`单元格(${row+1}, ${tableState.headers[col] || String.fromCharCode(65+col)}) 已更新`);
}

// 取消编辑单元格
function cancelEditCell(td, originalValue) {
    td.classList.remove('editing');
    td.textContent = originalValue;
}

// 增加一行
function addRow() {
    tableState.rows++;
    const newRow = [];
    
    for (let col = 0; col < tableState.cols; col++) {
        newRow.push(`新数据 ${tableState.rows}-${col+1}`);
    }
    
    tableState.data.push(newRow);
    updateBody();
    updateStatus();
    scheduleAutoSave();
    updateStatusMessage(`已添加第 ${tableState.rows} 行`);
}

// 增加一列
function addColumn() {
    tableState.cols++;
    tableState.headers.push(`列${tableState.cols}`);
    
    // 为每一行添加新列数据
    for (let row = 0; row < tableState.rows; row++) {
        if (!tableState.data[row]) tableState.data[row] = [];
        tableState.data[row].push(`新列 ${row+1}`);
    }
    
    updateHeader();
    updateBody();
    updateStatus();
    scheduleAutoSave();
    updateStatusMessage(`已添加第 ${tableState.cols} 列`);
}

// 清空表格
function clearTable() {
    if (!confirm('确定要清空整个表格吗？所有数据将丢失。')) return;
    
    tableState.data = [];
    for (let row = 0; row < tableState.rows; row++) {
        tableState.data[row] = [];
        for (let col = 0; col < tableState.cols; col++) {
            tableState.data[row][col] = '';
        }
    }
    
    updateBody();
    scheduleAutoSave();
    updateStatusMessage('表格已清空');
}

// 更新状态显示
function updateStatus() {
    rowCountEl.textContent = tableState.rows;
    colCountEl.textContent = tableState.cols;
    cellCountEl.textContent = tableState.rows * tableState.cols;
}

// 更新状态消息
function updateStatusMessage(message) {
    statusText.textContent = message;
    statusText.style.color = '#2ecc71';
    
    // 3秒后恢复
    setTimeout(() => {
        statusText.textContent = '就绪';
        statusText.style.color = '';
    }, 3000);
}

// 显示错误消息
function showError(message) {
    statusText.textContent = `错误: ${message}`;
    statusText.style.color = '#e74c3c';
    
    setTimeout(() => {
        statusText.textContent = '就绪';
        statusText.style.color = '';
    }, 5000);
}

// 更新最后保存时间
function updateLastSaveTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    lastSaveTimeEl.textContent = timeStr;
}

// 计划自动保存
function scheduleAutoSave() {
    if (!autoSaveEnabled) return;
    
    // 清除之前的定时器
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // 设置新的定时器
    saveTimeout = setTimeout(() => {
        saveToServer(true); // 自动保存
    }, AUTO_SAVE_DELAY);
}

// 保存数据到服务器
async function saveToServer(isAutoSave = false) {
    try {
        if (!isAutoSave) {
            updateStatusMessage('正在保存到服务器...');
        }
        
        const response = await fetch('/api/data', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rows: tableState.rows,
                cols: tableState.cols,
                headers: tableState.headers,
                data: tableState.data
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        updateLastSaveTime();
        
        if (!isAutoSave) {
            updateStatusMessage(result.message || '数据保存成功');
        }
    } catch (error) {
        showError(`保存失败: ${error.message}`);
    }
}

// 从服务器加载数据
async function loadFromServer() {
    try {
        updateStatusMessage('正在从服务器加载...');
        
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // 更新本地状态
        tableState.rows = data.rows || 5;
        tableState.cols = data.cols || 4;
        tableState.headers = data.headers || Array(tableState.cols).fill('').map((_, i) => String.fromCharCode(65 + i));
        tableState.data = data.data || [];
        
        // 确保数据数组大小正确
        for (let row = 0; row < tableState.rows; row++) {
            if (!tableState.data[row]) tableState.data[row] = [];
            for (let col = 0; col < tableState.cols; col++) {
                if (tableState.data[row][col] === undefined) {
                    tableState.data[row][col] = '';
                }
            }
        }
        
        updateStatusMessage('数据加载成功');
    } catch (error) {
        showError(`加载失败: ${error.message}`);
        // 使用默认数据继续
    }
}

// 复制API URL到剪贴板
function copyApiUrl() {
    const url = `${window.location.origin}/api/data`;
    navigator.clipboard.writeText(url)
        .then(() => {
            updateStatusMessage('API URL 已复制到剪贴板');
        })
        .catch(err => {
            showError('复制失败: ' + err.message);
        });
}

// 导出表格数据为JSON
function exportData() {
    const dataStr = JSON.stringify(tableState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `table-data-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    updateStatusMessage('数据已导出为JSON文件');
}

// 切换自动保存
function toggleAutoSave() {
    autoSaveEnabled = !autoSaveEnabled;
    
    if (autoSaveEnabled) {
        autoSaveToggle.innerHTML = '<i class="fas fa-check-circle"></i> 自动保存已开启';
        autoSaveToggle.className = 'btn btn-small btn-success';
        updateStatusMessage('自动保存已启用');
    } else {
        autoSaveToggle.innerHTML = '<i class="fas fa-times-circle"></i> 自动保存已关闭';
        autoSaveToggle.className = 'btn btn-small btn-warning';
        updateStatusMessage('自动保存已禁用');
    }
}

// 事件监听器绑定
document.getElementById('addRow').addEventListener('click', addRow);
document.getElementById('addCol').addEventListener('click', addColumn);
document.getElementById('clearBtn').addEventListener('click', clearTable);
document.getElementById('loadBtn').addEventListener('click', loadFromServer);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('copyApiBtn').addEventListener('click', copyApiUrl);
document.getElementById('autoSaveToggle').addEventListener('click', toggleAutoSave);

// 初始化
document.addEventListener('DOMContentLoaded', initTable);

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl+S 保存
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToServer();
    }
    
    // Ctrl+L 加载
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        loadFromServer();
    }
    
    // Ctrl+R 添加行
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        addRow();
    }
    
    // Ctrl+C 添加列
    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        addColumn();
    }
    
    // Ctrl+E 导出
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportData();
    }
});
