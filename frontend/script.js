// 全局状态
let currentRows = [];
let currentEditingCell = null;
let autoRefreshInterval = null;
const API_BASE = window.location.origin; // 假设前端与后端同源

// DOM 元素
const tokenInput = document.getElementById('token-input');
const toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
const addRowBtn = document.getElementById('add-row-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const csvFileInput = document.getElementById('csv-file');
const refreshBtn = document.getElementById('refresh-btn');
const spreadsheetTable = document.getElementById('spreadsheet-table').getElementsByTagName('tbody')[0];
const apiStatusSpan = document.getElementById('api-status');
const rowCountSpan = document.getElementById('row-count');
const tokenStatusSpan = document.getElementById('token-status');
const lastUpdateSpan = document.getElementById('last-update');
const addModal = document.getElementById('add-modal');
const editModal = document.getElementById('edit-modal');
const addForm = document.getElementById('add-form');
const cancelAddBtn = document.getElementById('cancel-add');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditBtn = document.getElementById('save-edit');
const editValueInput = document.getElementById('edit-value');
const editCellInfoSpan = document.getElementById('edit-cell-info');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkApiHealth();
    loadTableData();
    setupEventListeners();
    startAutoRefresh();
});

// 设置事件监听器
function setupEventListeners() {
    // Token 显示/隐藏切换
    toggleTokenVisibilityBtn.addEventListener('click', () => {
        const type = tokenInput.getAttribute('type');
        if (type === 'password') {
            tokenInput.setAttribute('type', 'text');
            toggleTokenVisibilityBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            tokenInput.setAttribute('type', 'password');
            toggleTokenVisibilityBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // 添加行按钮
    addRowBtn.addEventListener('click', () => {
        document.getElementById('add-name').value = '';
        document.getElementById('add-age').value = '';
        document.getElementById('add-department').value = '';
        document.getElementById('add-join-date').value = '';
        addModal.style.display = 'flex';
    });

    // 取消添加
    cancelAddBtn.addEventListener('click', () => {
        addModal.style.display = 'none';
    });

    // 提交添加表单
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('add-name').value.trim();
        const age = document.getElementById('add-age').value;
        const department = document.getElementById('add-department').value.trim();
        const joinDate = document.getElementById('add-join-date').value;
        if (!name) {
            alert('姓名不能为空');
            return;
        }
        addRow({ name, age, department, join_date: joinDate });
    });

    // 导出 CSV
    exportCsvBtn.addEventListener('click', () => {
        window.open(`${API_BASE}/api/data/export`, '_blank');
    });

    // 导入 CSV
    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        importCsv(file);
        e.target.value = ''; // 重置 input
    });

    // 刷新按钮
    refreshBtn.addEventListener('click', () => {
        loadTableData();
    });

    // 编辑模态框按钮
    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    saveEditBtn.addEventListener('click', () => {
        saveCellEdit();
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
}

// 检查 API 健康状态
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            apiStatusSpan.textContent = '已连接';
            apiStatusSpan.className = 'connected';
        } else {
            throw new Error('HTTP error');
        }
    } catch (error) {
        apiStatusSpan.textContent = '断开连接';
        apiStatusSpan.className = 'disconnected';
    }
}

// 获取 Token 值
function getToken() {
    return tokenInput.value.trim();
}

// 验证 Token 状态（通过尝试一个简单请求）
async function validateToken() {
    const token = getToken();
    if (!token) {
        tokenStatusSpan.textContent = '未提供';
        tokenStatusSpan.className = 'invalid';
        return false;
    }
    // 我们尝试调用一个需要 Token 的端点，例如 GET /api/data 不需要 Token，但我们可以用 POST 来验证？
    // 为了不产生副作用，我们使用一个简单的 HEAD 请求？但后端没有专门验证的端点。
    // 我们改为在每次操作时验证，这里仅显示 Token 是否存在。
    tokenStatusSpan.textContent = '已设置';
    tokenStatusSpan.className = 'valid';
    return true;
}

// 加载表格数据
async function loadTableData() {
    try {
        const response = await fetch(`${API_BASE}/api/data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = await response.json();
        currentRows = rows;
        renderTable(rows);
        updateRowCount(rows.length);
        updateLastUpdate();
        validateToken();
    } catch (error) {
        console.error('Failed to load table data:', error);
        alert('加载数据失败，请检查后端服务。');
    }
}

// 渲染表格
function renderTable(rows) {
    spreadsheetTable.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td data-field="name" data-id="${row.id}">${escapeHtml(row.name)}</td>
            <td data-field="age" data-id="${row.id}">${escapeHtml(row.age || '')}</td>
            <td data-field="department" data-id="${row.id}">${escapeHtml(row.department || '')}</td>
            <td data-field="join_date" data-id="${row.id}">${escapeHtml(row.join_date || '')}</td>
            <td>${formatDate(row.created_at)}</td>
            <td class="action-cell">
                <button class="delete-row-btn" data-id="${row.id}">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </td>
        `;
        spreadsheetTable.appendChild(tr);
    });

    // 为每个单元格添加双击编辑事件
    document.querySelectorAll('td[data-field]').forEach(cell => {
        cell.addEventListener('dblclick', (e) => {
            openEditModal(cell);
        });
    });

    // 为删除按钮添加点击事件
    document.querySelectorAll('.delete-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').getAttribute('data-id');
            deleteRow(id);
        });
    });
}

// 打开编辑模态框
function openEditModal(cell) {
    const field = cell.getAttribute('data-field');
    const id = cell.getAttribute('data-id');
    const currentValue = cell.textContent;
    currentEditingCell = { cell, field, id };
    editCellInfoSpan.textContent = `ID: ${id}, 字段: ${field}`;
    editValueInput.value = currentValue;
    editModal.style.display = 'flex';
    editValueInput.focus();
}

// 保存单元格编辑
async function saveCellEdit() {
    if (!currentEditingCell) return;
    const { cell, field, id } = currentEditingCell;
    const newValue = editValueInput.value.trim();
    // 如果值未改变，直接关闭
    if (newValue === cell.textContent) {
        editModal.style.display = 'none';
        return;
    }
    // 构建更新数据
    const updateData = {};
    updateData[field] = newValue;
    // 保留其他字段不变，需要从 currentRows 中获取当前行的完整数据
    const row = currentRows.find(r => r.id == id);
    if (!row) return;
    const updatedRow = { ...row, ...updateData };
    // 发送更新请求
    try {
        await updateRow(id, updatedRow);
        cell.textContent = newValue;
        editModal.style.display = 'none';
        currentEditingCell = null;
    } catch (error) {
        alert('更新失败: ' + error.message);
    }
}

// 添加新行
async function addRow(data) {
    const token = getToken();
    if (!token) {
        alert('请先设置 API Token');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || '添加失败');
        }
        addModal.style.display = 'none';
        loadTableData(); // 重新加载数据
        alert('添加成功！');
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}

// 更新行
async function updateRow(id, data) {
    const token = getToken();
    if (!token) {
        alert('请先设置 API Token');
        throw new Error('No token');
    }
    const response = await fetch(`${API_BASE}/api/data/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '更新失败');
    }
    return response.json();
}

// 删除行
async function deleteRow(id) {
    if (!confirm('确定要删除这一行吗？')) return;
    const token = getToken();
    if (!token) {
        alert('请先设置 API Token');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/data/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || '删除失败');
        }
        loadTableData(); // 重新加载数据
        alert('删除成功！');
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

// 导入 CSV
async function importCsv(file) {
    const token = getToken();
    if (!token) {
        alert('请先设置 API Token');
        return;
    }
    const formData = new FormData();
    formData.append('csvfile', file);
    try {
        const response = await fetch(`${API_BASE}/api/data/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || '导入失败');
        }
        alert(`导入成功！共导入了 ${result.inserted || result.message} 行。`);
        loadTableData();
    } catch (error) {
        alert('导入失败: ' + error.message);
    }
}

// 辅助函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function updateRowCount(count) {
    rowCountSpan.textContent = count;
}

function updateLastUpdate() {
    lastUpdateSpan.textContent = new Date().toLocaleString('zh-CN');
}

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(loadTableData, 10000); // 每10秒刷新
}

// 当 token 输入变化时验证
tokenInput.addEventListener('input', validateToken);

// 初始验证
validateToken();
