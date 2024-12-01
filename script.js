function downloadQRCode(code) {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) return;
    
    // 创建一个新的canvas，包含二维码和文字
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');
    
    // 设置新canvas的大小，留出空间给文字
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height + 40;
    
    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    // 绘制二维码
    ctx.drawImage(canvas, 0, 0);
    
    // 绘制资产编号
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`资产编号：${code}`, newCanvas.width / 2, canvas.height + 25);
    
    // 下载图片
    const link = document.createElement('a');
    link.download = `资产二维码_${code}.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
}

function showQRCode(code, name) {
    // 创建二维码模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>资产二维码</h2>
                <span class="close">&times;</span>
            </div>
            <div class="qrcode-container">
                <div id="qrcode"></div>
                <p style="margin-top: 15px;">资产编号：${code}</p>
                <p>资产名称：${name}</p>
                <button onclick="downloadQRCode('${code}')" class="btn-primary" style="margin-top: 15px;">下载二维码</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 生成二维码，只包含资产编号
    new QRCode(document.getElementById("qrcode"), {
        text: code,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // 关闭按钮事件
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 全局变量
let assets = JSON.parse(localStorage.getItem('assets')) || [];
let systemLogs = JSON.parse(localStorage.getItem('systemLogs')) || [];
let currentUser = null;
let userList = JSON.parse(localStorage.getItem('userList')) || {
    admin: { 
        password: 'Szzzwy@2025',  // 修改管理员密码
        role: 'admin',
        createTime: new Date().toISOString()
    },
    user: { 
        password: 'user123', 
        role: 'user',
        createTime: new Date().toISOString()
    }
};

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成');
    
    // 获取登录表单
    const loginForm = document.getElementById('login');
    console.log('登录表单:', loginForm);
    
    // 添加登录表单提交事件
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('提交登录表单');
        
        // 获取输入的用户名和密码
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberPassword = document.getElementById('rememberPassword').checked;
        
        console.log('用户名:', username, '密码:', password, '记住密码:', rememberPassword);
        
        // 检查用户名和密码
        if (!username || !password) {
            alert('用户名和密码不能为空！');
            return;
        }

        // 检查用户是否存在
        if (!userList[username]) {
            alert('用户名不存在！');
            return;
        }

        // 验证密码
        if (userList[username].password !== password) {
            alert('密码错误！');
            return;
        }

        // 登录成功
        console.log('登录成功');
        
        // 记住密码
        if (rememberPassword) {
            localStorage.setItem('savedUsername', username);
            localStorage.setItem('savedPassword', btoa(password));
        } else {
            localStorage.removeItem('savedUsername');
            localStorage.removeItem('savedPassword');
        }
        
        // 设置当前用户
        currentUser = {
            username: username,
            role: userList[username].role
        };
        
        // 更新最后登录时间
        userList[username].lastLoginTime = new Date().toISOString();
        localStorage.setItem('userList', JSON.stringify(userList));
        
        // 登录成功，隐藏登录表单，显示主界面
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // 显示用户名
        document.getElementById('currentUser').textContent = '当前用户：' + username;
        
        // 如果是管理员，显示管理员功能
        if (userList[username].role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(function(el) {
                el.style.display = 'block';
            });
        }

        // 初始化显示资产列表
        displayAssets();
        addLog('login', `用户 ${username} 登录成功`);
    });
    
    // 添加退出按钮事件
    document.getElementById('logoutBtn').addEventListener('click', function() {
        console.log('退出登录');
        currentUser = null;
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    });

    // 加载保存的登录信息
    loadSavedLoginInfo();

    // Excel导出按钮
    document.getElementById('exportExcel').addEventListener('click', function() {
        const ws = XLSX.utils.json_to_sheet(assets.map(asset => ({
            '资产名称': asset.name,
            '资产编号': asset.code,
            '资产类型': asset.type,
            '购买日期': asset.purchaseDate,
            '存放地点': asset.location,
            '下次维保日期': asset.maintenanceDate,
            '维保负责人': asset.maintenancePerson,
            '上次维保日期': asset.lastMaintenanceDate
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "资产清单");
        XLSX.writeFile(wb, "物业固定资产清单.xlsx");
        addLog('asset', '导出产清单到Excel');
    });

    // 添加新资产按钮
    document.getElementById('addAssetBtn').addEventListener('click', function() {
        if (currentUser.role !== 'admin') {
            alert('只有管理员才能添加资产！');
            return;
        }
        document.getElementById('addAssetModal').style.display = 'block';
    });

    // 添加资产表单提交
    document.getElementById('assetForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const asset = {
            id: Date.now(),
            name: document.getElementById('assetName').value.trim(),
            code: document.getElementById('assetCode').value.trim(),
            type: document.getElementById('assetType').value,
            purchaseDate: document.getElementById('purchaseDate').value,
            location: document.getElementById('location').value.trim(),
            maintenanceDate: document.getElementById('maintenanceDate').value,
            maintenancePerson: document.getElementById('maintenancePerson').value.trim(),
            lastMaintenanceDate: document.getElementById('lastMaintenanceDate').value
        };

        if (assets.some(a => a.code === asset.code)) {
            alert('资产编号已存在！');
            return;
        }

        assets.push(asset);
        localStorage.setItem('assets', JSON.stringify(assets));
        displayAssets();
        addLog('asset', `添加新资产：${asset.name}（${asset.code}）`);
        this.reset();
        document.getElementById('addAssetModal').style.display = 'none';
        alert('添加资产成功！');
    });

    // 用户管理按钮
    document.getElementById('manageUsers').addEventListener('click', function() {
        if (currentUser.role !== 'admin') {
            alert('只有管理员才能管理用户！');
            return;
        }
        document.getElementById('userManageModal').style.display = 'block';
        displayUsers();
    });

    // 查看待维保设备按钮
    document.getElementById('checkMaintenance').addEventListener('click', function() {
        document.getElementById('maintenanceModal').style.display = 'block';
        displayMaintenanceList();
    });

    // 查看系统日志按钮
    document.getElementById('viewLogs').addEventListener('click', function() {
        document.getElementById('logModal').style.display = 'block';
        displayLogs();
    });

    // 模态框关闭按钮
    document.querySelectorAll('.close, .close-users, .close-logs, .close-asset').forEach(function(closeBtn) {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // 添加导出日志功能
    function exportLogs() {
        // 获取当前筛选的日志
        const typeFilter = document.getElementById('logTypeFilter').value;
        const dateFilter = document.getElementById('logDateFilter').value;
        
        let exportLogs = systemLogs;
        
        // 应用筛选
        if (typeFilter !== 'all') {
            exportLogs = exportLogs.filter(log => log.type === typeFilter);
        }
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            exportLogs = exportLogs.filter(log => 
                new Date(log.timestamp).toDateString() === filterDate
            );
        }
        
        // 转换为Excel格式
        const ws = XLSX.utils.json_to_sheet(exportLogs.map(log => ({
            '时间': new Date(log.timestamp).toLocaleString(),
            '操作人': log.user,
            '操作类型': getLogTypeText(log.type),
            '操作详情': log.details,
            '操作结果': log.result
        })));
        
        // 设置列宽
        const colWidths = [
            { wch: 20 },  // 时间
            { wch: 15 },  // 操作人
            { wch: 12 },  // 操作类型
            { wch: 40 },  // 操作详情
            { wch: 10 }   // 操作结果
        ];
        ws['!cols'] = colWidths;
        
        // 创建工作簿并导出
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "统日志");
        
        const now = new Date();
        const fileName = `系统日志_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;
        
        try {
            XLSX.writeFile(wb, fileName);
            addLog('system', '导出系统日志');
            alert('导出成功！');
        } catch (error) {
            console.error('导出日志失败:', error);
            alert('导出失败，请重试！');
        }
    }

    // 获取日志类型的中文描述
    function getLogTypeText(type) {
        const typeMap = {
            'login': '登录操作',
            'asset': '资产操作',
            'maintenance': '维保操作',
            'user': '用户管理',
            'system': '系统操作'
        };
        return typeMap[type] || type;
    }

    // 在DOMContentLoaded事件监听器中添加导出日志按钮事件
    document.getElementById('exportLogs').addEventListener('click', exportLogs);

    // 在DOMContentLoaded事件监听器中添加维保日志按钮事件
    document.getElementById('viewMaintenanceLogs').addEventListener('click', function() {
        document.getElementById('maintenanceLogModal').style.display = 'block';
        displayMaintenanceLogs();
    });

    // 添加维保日志导出按钮事件
    document.getElementById('exportMaintenanceLogs').addEventListener('click', function() {
        // 收集所有维保日志
        let allMaintenanceLogs = [];
        assets.forEach(asset => {
            if (asset.maintenanceHistory) {
                asset.maintenanceHistory.forEach(history => {
                    allMaintenanceLogs.push({
                        '记录时间': new Date(history.timestamp).toLocaleString(),
                        '资产名称': asset.name,
                        '资产编号': asset.code,
                        '维保日期': history.date,
                        '下次维保日期': history.nextDate,
                        '维保人员': history.person,
                        '操作人': currentUser ? currentUser.username : '系统'
                    });
                });
            }
        });

        if (allMaintenanceLogs.length === 0) {
            alert('没有维保记录可供导出！');
            return;
        }
        
        try {
            // 创建工作簿
            const ws = XLSX.utils.json_to_sheet(allMaintenanceLogs);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "维保日志");
            
            // 设置列宽
            const colWidths = [
                { wch: 20 },  // 记录时间
                { wch: 20 },  // 资产名称
                { wch: 15 },  // 资产编号
                { wch: 12 },  // 维保日期
                { wch: 12 },  // 下次维保日期
                { wch: 15 },  // 维保人员
                { wch: 15 }   // 操作人
            ];
            ws['!cols'] = colWidths;
            
            // 导出文件
            const now = new Date();
            const fileName = `维保日志_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;
            
            XLSX.writeFile(wb, fileName);
            addLog('maintenance', '导出维保日志');
            alert('导出成功！');
        } catch (error) {
            console.error('导出维保日志失败:', error);
            alert('导出失败，请重试！错误信息：' + error.message);
        }
    });

    // 在DOMContentLoaded事件监听器中添加
    // 搜索和筛选相关事件监听
    document.getElementById('searchBtn').addEventListener('click', displayAssets);
    document.getElementById('searchInput').addEventListener('input', displayAssets);
    document.getElementById('filterType').addEventListener('change', displayAssets);

    // 搜索选项变化时更新
    document.getElementById('searchName').addEventListener('change', displayAssets);
    document.getElementById('searchCode').addEventListener('change', displayAssets);
    document.getElementById('searchLocation').addEventListener('change', displayAssets);
    document.getElementById('searchPerson').addEventListener('change', displayAssets);
});

// 加载保存的登录信息
function loadSavedLoginInfo() {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    
    if (savedUsername && savedPassword) {
        document.getElementById('username').value = savedUsername;
        document.getElementById('password').value = atob(savedPassword);
        document.getElementById('rememberPassword').checked = true;
    }
}

// 修改显示资产列表函数
function displayAssets() {
    const tbody = document.getElementById('assetTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const filteredAssets = filterAssets();
    
    filteredAssets.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.name}</td>
            <td>${asset.code}</td>
            <td>${asset.type}</td>
            <td>${asset.purchaseDate}</td>
            <td>${asset.location}</td>
            <td>${asset.maintenanceDate || '未设置'}</td>
            <td>${asset.maintenancePerson || '未指定'}</td>
            <td>${asset.lastMaintenanceDate || '无记录'}</td>
            <td>
                <button class="edit-btn admin-only" onclick="editAsset(${Number(asset.id)})">编辑</button>
                <button class="delete-btn admin-only" onclick="deleteAsset(${Number(asset.id)})">删除</button>
                <button class="maintenance-btn admin-only" onclick="updateMaintenance(${Number(asset.id)})">更新维保</button>
                <button class="qrcode-btn" onclick="showQRCode('${asset.code}', '${asset.name}')">二维码</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // 如果是管理员，显示管理员功能按钮
    if (currentUser?.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'inline-block';
        });
    }
}

// 修改筛选功能
function filterAssets() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    
    // 获取搜索选项的状态
    const searchName = document.getElementById('searchName').checked;
    const searchCode = document.getElementById('searchCode').checked;
    const searchLocation = document.getElementById('searchLocation').checked;
    const searchPerson = document.getElementById('searchPerson').checked;
    
    return assets.filter(asset => {
        // 如果搜索文本为空，只按类型筛选
        if (!searchText) {
            return filterType === 'all' || asset.type === filterType;
        }
        
        // 根据选中的选项进行搜索
        const matchesSearch = (
            (searchName && asset.name.toLowerCase().includes(searchText)) ||
            (searchCode && asset.code.toLowerCase().includes(searchText)) ||
            (searchLocation && asset.location.toLowerCase().includes(searchText)) ||
            (searchPerson && asset.maintenancePerson && asset.maintenancePerson.toLowerCase().includes(searchText))
        );
        
        // 同时满足搜索条件和类型筛选
        return matchesSearch && (filterType === 'all' || asset.type === filterType);
    });
}

// 修改显示用户列表函数中的管理员行显示部分
function displayUsers(searchText = '', roleFilter = 'all') {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    
    // 转换用户列表为数组并按创建时间排序
    const userArray = Object.entries(userList)
        .map(([username, data]) => ({
            username,
            ...data,
            createTime: data.createTime || new Date().toISOString()
        }))
        .filter(user => {
            const matchesSearch = !searchText || 
                user.username.toLowerCase().includes(searchText.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        })
        .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    
    userArray.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td class="user-role-${user.role}">${user.role === 'admin' ? '管理员' : '普通用户'}</td>
            <td>${new Date(user.createTime).toLocaleString()}</td>
            <td>
                ${user.username === 'admin' ? 
                    `<button class="reset-pwd-btn" onclick="resetPassword('${user.username}')">修改密码</button>` 
                    : `
                    <button class="edit-user-btn" onclick="editUser('${user.username}')">编辑</button>
                    <button class="delete-user-btn" onclick="deleteUser('${user.username}')">删除</button>
                    <button class="reset-pwd-btn" onclick="resetPassword('${user.username}')">重置密码</button>
                `}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 用户搜索和筛选事件
document.getElementById('userSearchInput').addEventListener('input', function() {
    const searchText = this.value;
    const roleFilter = document.getElementById('userRoleFilter').value;
    displayUsers(searchText, roleFilter);
});

document.getElementById('userRoleFilter').addEventListener('change', function() {
    const searchText = document.getElementById('userSearchInput').value;
    const roleFilter = this.value;
    displayUsers(searchText, roleFilter);
});

// 编辑用户
function editUser(username) {
    const user = userList[username];
    if (!user) {
        alert('用户不存在！');
        return;
    }

    const newRole = prompt('请选择新的用户角色（admin/user）：', user.role);
    if (newRole && (newRole === 'admin' || newRole === 'user')) {
        userList[username].role = newRole;
        localStorage.setItem('userList', JSON.stringify(userList));
        displayUsers();
        addLog('user', `修改用户角色：${username} -> ${newRole}`);
        alert('修改成功！');
    }
}

// 删除用户
function deleteUser(username) {
    if (confirm(`确定要删除用户 ${username} 吗？`)) {
        delete userList[username];
        localStorage.setItem('userList', JSON.stringify(userList));
        displayUsers();
        addLog('user', `删除用户：${username}`);
        alert('删除成功！');
    }
}

// 修改重置密码函数
function resetPassword(username) {
    const user = userList[username];
    if (!user) {
        alert('用户不存在！');
        return;
    }

    // 如果是管理员修改自己的密码，需要验证旧密码
    if (username === 'admin') {
        const oldPassword = prompt('请输入当前密码：');
        if (!oldPassword) return;
        
        if (oldPassword !== user.password) {
            alert('当前密码错误！');
            return;
        }
    }

    const newPassword = prompt('请输入新密码：');
    if (!newPassword) return;

    // 如果是管理员，需要确认新密码
    if (username === 'admin') {
        const confirmPassword = prompt('请再次输入新密码：');
        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }
    }

    userList[username].password = newPassword;
    localStorage.setItem('userList', JSON.stringify(userList));
    addLog('user', `${username === 'admin' ? '修改' : '重置'}用户密码：${username}`);
    alert(`${username === 'admin' ? '修改' : '重置'}密码成功！`);
}

// 添加用户管理相关函数
function addUser(username, password, role) {
    if (userList[username]) {
        alert('用户名已存在！');
        return false;
    }

    userList[username] = {
        password: password,
        role: role,
        createTime: new Date().toISOString()
    };
    
    localStorage.setItem('userList', JSON.stringify(userList));
    return true;
}

// 生成随机密码
function generateRandomPassword(length) {
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// 添加用户表单提交事件
document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('userRole').value;
    
    if (!username || !password) {
        alert('用户名和密码不能为空！');
        return;
    }
    
    if (addUser(username, password, role)) {
        displayUsers();
        addLog('user', `添加新用户：${username}（${role}）`);
        this.reset();
        alert('添加用户成功！');
    }
});

// 批量生成用户
document.getElementById('batchUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const prefix = document.getElementById('userPrefix').value.trim();
    const count = parseInt(document.getElementById('userCount').value);
    const pwdLength = parseInt(document.getElementById('passwordLength').value);
    
    if (!prefix) {
        alert('请输入用户名前缀！');
        return;
    }
    
    const newUsers = [];
    let successCount = 0;
    let duplicateCount = 0;
    
    for (let i = 1; i <= count; i++) {
        const username = `${prefix}${i}`;
        const password = generateRandomPassword(pwdLength);
        
        if (!userList[username]) {
            userList[username] = {
                password: password,
                role: 'user',
                createTime: new Date().toISOString()
            };
            newUsers.push({
                '用户名': username,
                '密码': password,
                '创建时间': new Date().toLocaleString()
            });
            successCount++;
        } else {
            duplicateCount++;
        }
    }
    
    if (successCount > 0) {
        localStorage.setItem('userList', JSON.stringify(userList));
        displayUsers();
        
        // 导出新用户信息
        const ws = XLSX.utils.json_to_sheet(newUsers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "新用户账号");
        
        const fileName = `批量生成用户_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        addLog('user', `批量生成用户：${successCount}个`);
        alert(`成功生成${successCount}个用户，已导出到Excel文件\n重复用户名：${duplicateCount}个`);
        this.reset();
    } else {
        alert('所有用户名都已存在，未能生成新用户！');
    }
});

// 修改显示维保列表函数
function displayMaintenanceList() {
    const tbody = document.getElementById('maintenanceTableBody');
    tbody.innerHTML = '';
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // 过滤需要维保的设备
    const maintenanceNeeded = assets.filter(asset => {
        if (!asset.maintenanceDate) return false;
        const maintenanceDate = new Date(asset.maintenanceDate);
        return maintenanceDate <= thirtyDaysFromNow;
    }).sort((a, b) => new Date(a.maintenanceDate) - new Date(b.maintenanceDate));

    let overdueCount = 0;  // 已逾期
    let todayCount = 0;    // 今天需维保
    let weekCount = 0;     // 7天内需维保
    let otherCount = 0;    // 30天内需维保

    maintenanceNeeded.forEach(asset => {
        const maintenanceDate = new Date(asset.maintenanceDate);
        const diffDays = Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24));
        
        // 设置行的样式类和计数
        let rowClass = '';
        let statusText = '';
        
        if (diffDays < 0) {
            rowClass = 'maintenance-overdue';
            statusText = `已逾期${Math.abs(diffDays)}天`;
            overdueCount++;
        } else if (diffDays === 0) {
            rowClass = 'maintenance-today';
            statusText = '今天需要维保';
            todayCount++;
        } else if (diffDays <= 7) {
            rowClass = 'maintenance-warning';
            statusText = `还有${diffDays}天`;
            weekCount++;
        } else {
            statusText = `还有${diffDays}天`;
            otherCount++;
        }
        
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td>${asset.name}</td>
            <td>${asset.code}</td>
            <td>${asset.location}</td>
            <td>${asset.maintenancePerson || '未指定'}</td>
            <td>${asset.lastMaintenanceDate || '无记录'}</td>
            <td>${asset.maintenanceDate}</td>
            <td class="status-text ${rowClass}">${statusText}</td>
            <td>
                ${currentUser?.role === 'admin' ? 
                    `<button class="update-maintenance-btn" onclick="updateMaintenance(${asset.id})">更新维保</button>` 
                    : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    // 显示统计信息
    document.getElementById('maintenanceStats').innerHTML = `
        <div class="maintenance-summary">
            <span class="maintenance-total">待维保设备总数：${maintenanceNeeded.length} 台</span>
            <span class="maintenance-overdue">已逾期：${overdueCount} 台</span>
            <span class="maintenance-today">今日维保：${todayCount} 台</span>
            <span class="maintenance-warning">7天内：${weekCount} 台</span>
            <span class="maintenance-normal">30天内：${otherCount} 台</span>
        </div>
    `;
}

// 显示系统日志
function displayLogs() {
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';
    
    systemLogs.sort((a, b) => b.id - a.id).forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.user}</td>
            <td>${log.type}</td>
            <td>${log.details}</td>
            <td>${log.result}</td>
        `;
        tbody.appendChild(row);
    });
}

// 显示维保日志
function displayMaintenanceLogs(searchText = '', dateFilter = '') {
    const tbody = document.getElementById('maintenanceLogTableBody');
    tbody.innerHTML = '';
    
    // 收集所有资产的维保历史
    let allMaintenanceLogs = [];
    assets.forEach(asset => {
        if (asset.maintenanceHistory) {
            asset.maintenanceHistory.forEach(history => {
                allMaintenanceLogs.push({
                    ...history,
                    assetName: asset.name,
                    assetCode: asset.code
                });
            });
        }
    });
    
    // 应用筛选
    allMaintenanceLogs = allMaintenanceLogs.filter(log => {
        const matchesSearch = !searchText || 
            log.assetName.toLowerCase().includes(searchText.toLowerCase()) ||
            log.assetCode.toLowerCase().includes(searchText.toLowerCase());
            
        const matchesDate = !dateFilter || 
            new Date(log.date).toISOString().split('T')[0] === dateFilter;
            
        return matchesSearch && matchesDate;
    });
    
    // 按时间倒序排序
    allMaintenanceLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 显示日志
    allMaintenanceLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.assetName}</td>
            <td>${log.assetCode}</td>
            <td>${log.date}</td>
            <td>${log.nextDate}</td>
            <td>${log.person}</td>
            <td>${log.operator || '系统'}</td>
        `;
        tbody.appendChild(row);
    });
}

// 维保日志搜索和筛选
document.getElementById('maintenanceSearchInput').addEventListener('input', function() {
    const searchText = this.value;
    const dateFilter = document.getElementById('maintenanceLogDateFilter').value;
    displayMaintenanceLogs(searchText, dateFilter);
});

document.getElementById('maintenanceLogDateFilter').addEventListener('change', function() {
    const searchText = document.getElementById('maintenanceSearchInput').value;
    const dateFilter = this.value;
    displayMaintenanceLogs(searchText, dateFilter);
});

document.getElementById('clearMaintenanceLogFilter').addEventListener('click', function() {
    document.getElementById('maintenanceSearchInput').value = '';
    document.getElementById('maintenanceLogDateFilter').value = '';
    displayMaintenanceLogs();
});

// 维保日志
document.getElementById('exportMaintenanceLogs').addEventListener('click', function() {
    // 收集所有维保日志
    let allMaintenanceLogs = [];
    assets.forEach(asset => {
        if (asset.maintenanceHistory) {
            asset.maintenanceHistory.forEach(history => {
                allMaintenanceLogs.push({
                    '记录时间': new Date(history.timestamp).toLocaleString(),
                    '资产名称': asset.name,
                    '资产编号': asset.code,
                    '维保日期': history.date,
                    '下次维保日期': history.nextDate,
                    '维保人员': history.person,
                    '操作人': history.operator || '系统'
                });
            });
        }
    });
    
    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(allMaintenanceLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "维保日志");
    
    // 设置列宽
    const colWidths = [
        { wch: 20 },  // 记录时间
        { wch: 20 },  // 资产名称
        { wch: 15 },  // 资产编号
        { wch: 12 },  // 维保日期
        { wch: 12 },  // 下次维保日期
        { wch: 15 },  // 维保人员
        { wch: 15 }   // 操作人
    ];
    ws['!cols'] = colWidths;
    
    // 导出文件
    const now = new Date();
    const fileName = `维保日志_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;
    
    try {
        XLSX.writeFile(wb, fileName);
        addLog('maintenance', '导出维保日志');
        alert('导出成功！');
    } catch (error) {
        console.error('导出维保日志失败:', error);
        alert('导出失败，请重试！');
    }
});

// 修改显示维保历史记录的HTML生成
function generateMaintenanceHistoryHtml(asset) {
    if (!asset.maintenanceHistory || asset.maintenanceHistory.length === 0) {
        return '<div class="maintenance-history"><p>暂无维保记录</p></div>';
    }

    // 按时间倒排序维保记录
    const sortedHistory = [...asset.maintenanceHistory]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return `
        <div class="maintenance-history">
            <h3>维保历史记录</h3>
            <table class="history-table">
                <thead>
                    <tr>
                        <th>记录时间</th>
                        <th>维保日期</th>
                        <th>下次维保日期</th>
                        <th>维保人员</th>
                        <th>操作人</th>
                        <th>备注</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedHistory.map(history => `
                        <tr>
                            <td>${new Date(history.timestamp).toLocaleString()}</td>
                            <td>${history.date}</td>
                            <td>${history.nextDate}</td>
                            <td>${history.person}</td>
                            <td>${history.operator || '系统'}</td>
                            <td>${history.remarks || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

// 将这些函数移到全局作用域
function updateMaintenance(id) {
    const asset = assets.find(a => Number(a.id) === Number(id));
    if (!asset) {
        alert('找不到该资产！');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const today = new Date().toISOString().split('T')[0];
    const nextMaintenance = new Date();
    nextMaintenance.setMonth(nextMaintenance.getMonth() + 3);
    const nextMaintenanceDate = nextMaintenance.toISOString().split('T')[0];
    
    // 使用资产当前的维保负责人，如果没有则使用空字符串
    const currentMaintenancePerson = asset.maintenancePerson || '';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>更新维保信息</h2>
                <span class="close">&times;</span>
            </div>
            <div style="padding: 20px;">
                <h3>资产信息</h3>
                <p>资产名称：${asset.name}</p>
                <p>资产编号：${asset.code}</p>
                <p>当前维保负责人：${currentMaintenancePerson || '未指定'}</p>
                <div class="form-group">
                    <label>维保日期：</label>
                    <input type="date" id="newMaintenanceDate" value="${today}">
                </div>
                <div class="form-group">
                    <label>下次维保日期：</label>
                    <input type="date" id="nextMaintenanceDate" value="${nextMaintenanceDate}">
                </div>
                <div class="form-group">
                    <label>维保负责人：（不填则使用当前维保负责人）</label>
                    <input type="text" id="maintenancePerson" value="${currentMaintenancePerson}" placeholder="不填则使用当前维保负责人">
                </div>
                <div class="form-group">
                    <label>维保备注：</label>
                    <textarea id="maintenanceRemarks" rows="3" placeholder="请输入维保备注信息"></textarea>
                </div>
                <div class="form-group">
                    <button onclick="saveMaintenanceUpdate(${asset.id})" class="btn-primary">保存</button>
                    <button onclick="document.body.removeChild(this.closest('.modal'))" class="btn-secondary">取消</button>
                </div>
                ${generateMaintenanceHistoryHtml(asset)}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

function saveMaintenanceUpdate(id) {
    const asset = assets.find(a => Number(a.id) === Number(id));
    if (!asset) {
        alert('找不到该资产！');
        return;
    }

    // 获取表单值并去除空格
    const lastMaintenanceDate = document.getElementById('newMaintenanceDate')?.value || '';
    const maintenanceDate = document.getElementById('nextMaintenanceDate')?.value || '';
    const maintenancePerson = document.getElementById('maintenancePerson')?.value?.trim() || asset.maintenancePerson || '';
    const maintenanceRemarks = document.getElementById('maintenanceRemarks')?.value?.trim() || '';

    // 验证必填字段
    if (!lastMaintenanceDate) {
        alert('请选择维保日期！');
        return;
    }
    if (!maintenanceDate) {
        alert('请选择下次维保日期！');
        return;
    }

    // 检查日期逻辑
    const lastDate = new Date(lastMaintenanceDate);
    const nextDate = new Date(maintenanceDate);
    if (nextDate <= lastDate) {
        alert('下次维保日期必须晚于本次维保日期！');
        return;
    }

    // 添加维保历史记录
    if (!asset.maintenanceHistory) {
        asset.maintenanceHistory = [];
    }
    
    // 添加新的维保记录
    const newRecord = {
        date: lastMaintenanceDate,
        nextDate: maintenanceDate,
        person: maintenancePerson,
        operator: currentUser.username,
        timestamp: new Date().toISOString(),
        remarks: maintenanceRemarks
    };

    asset.maintenanceHistory.push(newRecord);

    // 更新当前维保信息
    asset.lastMaintenanceDate = lastMaintenanceDate;
    asset.maintenanceDate = maintenanceDate;
    asset.maintenancePerson = maintenancePerson;

    // 保存更新
    localStorage.setItem('assets', JSON.stringify(assets));
    
    // 更新显示
    displayAssets();
    displayMaintenanceList();
    
    // 记录日志
    addLog('maintenance', `更新资产维保信息：${asset.name}（${asset.code}）`);

    // 先显示成功消息
    alert('维保信息更新成功！');

    // 关闭模态框
    const maintenanceModal = document.getElementById('maintenanceModal');
    if (maintenanceModal) {
        maintenanceModal.style.display = 'none';
    }
    const updateModal = document.querySelector('.modal');
    if (updateModal) {
        document.body.removeChild(updateModal);
    }
}

// 修改编辑资产功能中的表单提交事件处理部分
function editAsset(id) {
    const asset = assets.find(a => Number(a.id) === Number(id));
    if (!asset) {
        alert('找不到该资产！');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>编辑资产信息</h2>
                <span class="close">&times;</span>
            </div>
            <div style="padding: 20px;">
                <form id="editAssetForm">
                    <div class="form-group">
                        <label>资产名称：</label>
                        <input type="text" id="editAssetName" value="${asset.name}" required>
                    </div>
                    <div class="form-group">
                        <label>资产编号：</label>
                        <input type="text" id="editAssetCode" value="${asset.code}" required>
                    </div>
                    <div class="form-group">
                        <label>资产类型：</label>
                        <select id="editAssetType">
                            <option value="安防设备" ${asset.type === '安防设备' ? 'selected' : ''}>安防设备</option>
                            <option value="清洁设备" ${asset.type === '清洁设备' ? 'selected' : ''}>清洁设备</option>
                            <option value="园艺工具" ${asset.type === '园艺工具' ? 'selected' : ''}>园艺工具</option>
                            <option value="消防设备" ${asset.type === '消防设备' ? 'selected' : ''}>消防设备</option>
                            <option value="健身器材" ${asset.type === '健身器材' ? 'selected' : ''}>健身器材</option>
                            <option value="办公设备" ${asset.type === '办公设' ? 'selected' : ''}>办公设备</option>
                            <option value="维修工具" ${asset.type === '维修工具' ? 'selected' : ''}>维修工具</option>
                            <option value="其他设备" ${asset.type === '其他设备' ? 'selected' : ''}>其他设备</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>购买日期：</label>
                        <input type="date" id="editPurchaseDate" value="${asset.purchaseDate}" required>
                    </div>
                    <div class="form-group">
                        <label>存放地点：</label>
                        <input type="text" id="editLocation" value="${asset.location}" required>
                    </div>
                    <div class="form-group">
                        <label>下次维保日期：</label>
                        <input type="date" id="editMaintenanceDate" value="${asset.maintenanceDate || ''}">
                    </div>
                    <div class="form-group">
                        <label>维保负责人：</label>
                        <input type="text" id="editMaintenancePerson" value="${asset.maintenancePerson || ''}">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn-primary">保存</button>
                        <button type="button" class="btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">取消</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加表单提交事件
    const form = modal.querySelector('#editAssetForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const editedAsset = {
            ...asset,
            name: document.getElementById('editAssetName').value.trim(),
            code: document.getElementById('editAssetCode').value.trim(),
            type: document.getElementById('editAssetType').value,
            purchaseDate: document.getElementById('editPurchaseDate').value,
            location: document.getElementById('editLocation').value.trim(),
            maintenanceDate: document.getElementById('editMaintenanceDate').value,
            maintenancePerson: document.getElementById('editMaintenancePerson').value.trim()
        };

        // 检查资产编号是否重复（排除当前资产）
        if (assets.some(a => a.code === editedAsset.code && a.id !== asset.id)) {
            alert('资产编号已存在！');
            return;
        }

        // 更新资产信息
        const index = assets.findIndex(a => a.id === asset.id);
        if (index !== -1) {
            assets[index] = editedAsset;
            localStorage.setItem('assets', JSON.stringify(assets));
            
            // 更新显示
            displayAssets();
            
            // 记录日志
            addLog('asset', `编辑资产信息：${editedAsset.name}（${editedAsset.code}）`);
            
            // 先显示成功消息
            alert('资产信息更新成功！');
            
            // 关闭所有相关模态框
            const editModal = document.querySelector('.modal');
            if (editModal) {
                document.body.removeChild(editModal);
            }
            
            // 关闭其他可能打开的模态框
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            
            // 返回到主界面
            document.getElementById('mainContent').style.display = 'block';
        } else {
            alert('更新失败：找不到该资产！');
        }
    });
    
    // 添加关闭按钮事件
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 添加删除资产功能
function deleteAsset(id) {
    const asset = assets.find(a => Number(a.id) === Number(id));
    if (!asset) {
        alert('找不到该资产！');
        return;
    }

    if (confirm(`确定要删除资产"${asset.name}"（${asset.code}）吗？`)) {
        assets = assets.filter(a => a.id !== id);
        localStorage.setItem('assets', JSON.stringify(assets));
        displayAssets();
        addLog('asset', `删除资产：${asset.name}（${asset.code}）`);
        alert('删除成功！');
    }
}