// MyTodo Advanced Logic v7 - Tauri Store Version with Fallback
let todos = [];
let categories = [{ name: 'Work', icon: 'briefcase' }, { name: 'Personal', icon: 'user' }, { name: 'Shopping', icon: 'shopping-cart' }];
let currentEditingId = null;
let activeCategory = 'all';
let settings = { theme: 'system', lang: 'en' };
let touchStartX = 0;
let currentSwipedItem = null;
let syncConfig = {
    enabled: false,
    type: 'github',
    token: '',
    gistId: '',
    encrypt: true,
    lastSync: null
};

function getText(key) {
    // Assuming 'i18n' object is defined elsewhere or will be defined.
    // For now, returning key if i18n or settings.lang is not available.
    if (typeof i18n !== 'undefined' && i18n[settings.lang]) {
        return i18n[settings.lang][key] || key;
    }
    return key;
}

// ============ Date/Time Utilities ============

// Get default date (today) in YYYY-MM-DD format
function getDefaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get default time (next hour) in HH:mm format
function getDefaultTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Combine date and time into YYYY-MM-DDTHH:mm format
function combineDateTime(date, time) {
    if (!date) date = getDefaultDate();
    if (!time) time = '12:00';
    return `${date}T${time}`;
}

// Split datetime into { date, time } object
function splitDateTime(datetime) {
    if (!datetime) {
        return { date: getDefaultDate(), time: getDefaultTime() };
    }

    // Handle old format (date only: YYYY-MM-DD)
    if (datetime.length === 10) {
        return { date: datetime, time: '12:00' };
    }

    // Handle new format (datetime: YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm)
    const parts = datetime.includes('T') ? datetime.split('T') : datetime.split(' ');
    return {
        date: parts[0] || getDefaultDate(),
        time: parts[1] || '12:00'
    };
}

// Format deadline for display (e.g., "02-06 14:30" or "2026-02-06 14:30")
function formatDeadline(deadline) {
    if (!deadline) return '';

    // Handle old format (date only: YYYY-MM-DD)
    if (deadline.length === 10) {
        return deadline;
    }

    // Handle new format (datetime: YYYY-MM-DDTHH:mm)
    try {
        const date = new Date(deadline);
        const now = new Date();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        // If same year, show MM-DD HH:mm; otherwise show full date
        if (date.getFullYear() === now.getFullYear()) {
            return `${month}-${day} ${hours}:${minutes}`;
        } else {
            return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
        }
    } catch (e) {
        return deadline;
    }
}

// Tauri Store instance
let store = null;
let isNativeApp = false; // true = Tauri (desktop/mobile), false = Web/H5
const STORE_FILE = 'mytodo_data.json';
const STORAGE_KEY_DATA = 'mytodo_data_v3';
const STORAGE_KEY_SETTINGS = 'mytodo_settings_v3';

// Check if running in Tauri (desktop/mobile app)
function checkTauriEnvironment() {
    try {
        return window.__TAURI__ !== undefined;
    } catch (e) {
        return false;
    }
}

// Check if Tauri Store plugin is available
function checkTauriStore() {
    try {
        return window.__TAURI__ && window.__TAURI__.store &&
            (typeof window.__TAURI__.store.load === 'function' || typeof window.__TAURI__.store.Store === 'function');
    } catch (e) {
        return false;
    }
}

// Initialize Tauri Store (for native apps only)
async function initTauriStore() {
    if (!checkTauriStore()) {
        console.log('Tauri Store not available');
        return false;
    }

    try {
        const { load, Store } = window.__TAURI__.store;
        if (typeof load === 'function') {
            store = await load(STORE_FILE, { autoSave: true });
        } else if (typeof Store === 'function') {
            store = new Store(STORE_FILE);
            await store.load(); // Ensure load
        } else {
            throw new Error('Tauri Store API not compatible');
        }
        isNativeApp = true;
        console.log('Tauri Store initialized - Native App Mode');

        // One-time migration from LocalStorage to Tauri Store
        const localData = localStorage.getItem(STORAGE_KEY_DATA);
        const storeHasData = await store.get('todos');

        if (localData && (!storeHasData || storeHasData.length === 0)) {
            const parsed = JSON.parse(localData);
            await store.set('todos', parsed.todos || []);
            await store.set('categories', parsed.categories || categories);
            const localSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (localSettings) {
                await store.set('settings', JSON.parse(localSettings));
            }
            await store.save();
            // Clear LocalStorage after migration
            localStorage.removeItem(STORAGE_KEY_DATA);
            localStorage.removeItem(STORAGE_KEY_SETTINGS);
            console.log('Data migrated from LocalStorage to Tauri Store');
        }

        return true;
    } catch (e) {
        console.warn('Failed to initialize Tauri Store:', e);
        store = null;
        isNativeApp = false;
        return false;
    }
}

// ============ Storage API (Single Mode) ============

// Save data - uses Tauri Store for native apps, LocalStorage for web
function saveData() {
    const data = { todos, categories };

    if (isNativeApp && store) {
        // Native App: Tauri Store only
        store.set('todos', todos).then(() => {
            return store.set('categories', categories);
        }).then(() => {
            return store.save();
        }).catch(e => {
            console.error('Tauri Store save error:', e);
        });
    } else {
        // Web/H5: LocalStorage only
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    }
}

// Save settings
function saveSettings() {
    if (isNativeApp && store) {
        // Native App: Tauri Store only
        store.set('settings', settings).then(() => {
            return store.save();
        }).catch(e => {
            console.error('Tauri Store settings save error:', e);
        });
    } else {
        // Web/H5: LocalStorage only
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
}

// Load data from LocalStorage (for Web/H5 or initial load before Tauri Store is ready)
function loadDataFromLocalStorage() {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (savedSettings) settings = { ...settings, ...JSON.parse(savedSettings) };

    const savedData = localStorage.getItem(STORAGE_KEY_DATA);
    if (savedData) {
        const parsed = JSON.parse(savedData);
        todos = parsed.todos || [];
        categories = parsed.categories || categories;
    }
}

// Load data from Tauri Store (for native apps)
async function loadDataFromTauriStore() {
    if (!store) return false;

    try {
        const savedTodos = await store.get('todos');
        const savedCategories = await store.get('categories');
        const savedSettings = await store.get('settings');

        if (savedTodos) todos = savedTodos;
        if (savedCategories && savedCategories.length > 0) categories = savedCategories;
        if (savedSettings) settings = { ...settings, ...savedSettings };

        return true;
    } catch (e) {
        console.error('Error loading from Tauri Store:', e);
        return false;
    }
}

function setupSwipeListeners() {
    const list = document.getElementById('todo-list');
    list.addEventListener('touchstart', e => {
        const item = e.target.closest('.todo-item');
        if (!item || window.innerWidth > 850) return;
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    list.addEventListener('touchend', e => {
        const item = e.target.closest('.todo-item');
        if (!item || window.innerWidth > 850) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (diff > 50) { // Swipe Left
            if (currentSwipedItem && currentSwipedItem !== item) currentSwipedItem.classList.remove('swiped');
            item.classList.add('swiped'); currentSwipedItem = item;
        } else if (diff < -50) { // Swipe Right
            item.classList.remove('swiped');
            if (currentSwipedItem === item) currentSwipedItem = null;
        }
    });
}

// ============ I18n ============
const i18n = {
    zh: {
        allTasks: "所有任务", categories: "分类", addCategory: "添加分类", categoryName: "分类名称", categoryIcon: "图标", settings: "设置",
        editTask: "编辑任务", taskName: "任务名称", category: "分类", deadline: "截止时间", priority: "优先级",
        low: "低", medium: "中", high: "高", cancel: "取消", save: "保存", delete: "删除",
        theme: "主题", themeSystem: "系统", themeLight: "浅色", themeDark: "深色", language: "语言",
        dataOps: "数据管理", export: "导出", import: "导入", close: "关闭", add: "添加", addTask: "添加任务",
        noTasks: "暂无任务", synced: "已同步", todoPlaceholder: "输入待办事项...", confirmDeleteTitle: "确认删除",
        confirmDeleteCat: "确定要删除分类「{0}」吗？", confirmDeleteTodo: "确定要删除任务「{0}」吗？",
        catNotEmpty: "该分类下还有任务，无法删除", importSuccess: "导入成功！", archive: "归档", archivedTasks: "已归档任务",
        noArchived: "暂无归档任务",
        dataSafetyTip: "所有数据均安全存储在本地应用目录中，不会上传至云端。",
        iconDefault: "# (默认)", iconWork: "💼 工作", iconPersonal: "👤 个人", iconShopping: "🛒 购物",
        iconStudy: "📚 学习", iconHealth: "❤️ 健康", iconHome: "🏠 居家", iconTravel: "✈️ 旅行", icon休闲: "☕ 休闲",
        // Sync related
        cloudSync: "云端同步", enableSync: "启用 Gist 同步", syncConfig: "同步配置", syncConfigTitle: "同步设置",
        syncType: "平台类型", syncToken: "Access Token", syncGistId: "Gist ID",
        tokenHint: "需要具有 Gist 权限的 Personal Access Token", gistIdHint: "现有 Gist ID，留空则自动创建新 Gist",
        encryptData: "使用 Token 加密数据", uploadConfig: "上传配置/数据", downloadConfig: "下载配置/数据",
        lastSyncTime: "上次同步时间：", notSynced: "未同步", syncSuccess: "同步成功！", syncFailed: "同步失败：",
        syncing: "同步中...", decryptFailed: "解密失败，Token 可能不匹配",
        confirmOverwriteLocal: "云端数据更新，是否覆盖本地数据？", confirmOverwriteCloud: "确定要覆盖云端数据吗？",
        // New Features
        description: "任务描述", descriptionPlaceholder: "添加详细描述（最多300字）...",
        reminder: "到期提醒", noReminder: "无提醒",
        remind0: "任务截止时", remind5m: "提前 5 分钟", remind15m: "提前 15 分钟", remind30m: "提前 30 分钟", remind1h: "提前 1 小时", remind1d: "提前 1 天"
    },
    en: {
        allTasks: "All Tasks", categories: "Categories", addCategory: "Add Category", categoryName: "Name", categoryIcon: "Icon", settings: "Settings",
        editTask: "Edit Task", taskName: "Task Name", category: "Category", deadline: "Deadline", priority: "Priority",
        low: "Low", medium: "Medium", high: "High", cancel: "Cancel", save: "Save", delete: "Delete",
        theme: "Theme", themeSystem: "System", themeLight: "Light", themeDark: "Dark", language: "Language",
        dataOps: "Data", export: "Export", import: "Import", close: "Close", add: "Add", addTask: "Add Task",
        noTasks: "No tasks", synced: "Synced", todoPlaceholder: "What needs to be done?", confirmDeleteTitle: "Confirm Delete",
        confirmDeleteCat: "Delete category \"{0}\"?", confirmDeleteTodo: "Delete task \"{0}\"?",
        catNotEmpty: "Category not empty", importSuccess: "Import successful!", archive: "Archive", archivedTasks: "Archived Tasks",
        noArchived: "No archived tasks",
        dataSafetyTip: "All data is securely stored in your local app directory and is never uploaded to the cloud.",
        iconDefault: "# (Default)", iconWork: "💼 Work", iconPersonal: "👤 Personal", iconShopping: "🛒 Shopping",
        iconStudy: "📚 Study", iconHealth: "❤️ Health", iconHome: "🏠 Home", iconTravel: "✈️ Travel", icon休闲: "☕ Cafe",
        // Sync related
        cloudSync: "Cloud Sync", enableSync: "Enable Gist Sync", syncConfig: "Sync Config", syncConfigTitle: "Sync Settings",
        syncType: "Platform", syncToken: "Access Token", syncGistId: "Gist ID",
        tokenHint: "Personal Access Token with gist permissions required", gistIdHint: "Existing Gist ID or leave empty to auto-create",
        encryptData: "Encrypt data with Token", uploadConfig: "Upload Config/Data", downloadConfig: "Download Config/Data",
        lastSyncTime: "Last Sync:", notSynced: "Not synced", syncSuccess: "Sync Successful!", syncFailed: "Sync Failed:",
        syncing: "Syncing...", decryptFailed: "Decrypt failed, Token mismatch",
        confirmOverwriteLocal: "Cloud data is newer, overwrite local data?", confirmOverwriteCloud: "Overwrite cloud data with local data?",
        // New Features
        description: "Description", descriptionPlaceholder: "Add details (max 300 chars)...",
        reminder: "Reminder", noReminder: "None",
        remind0: "At event time", remind5m: "5 min before", remind15m: "15 min before", remind30m: "30 min before", remind1h: "1 hour before", remind1d: "1 day before"
    }
};

function init() {
    setupCharCountListeners();
    startReminderService();
    // For Web/H5: Load from LocalStorage immediately
    // For Native Apps: Load from LocalStorage first (for fast initial render), 
    // then Tauri Store will override when ready
    loadDataFromLocalStorage();

    // Apply settings and render UI immediately
    applyTheme(settings.theme, false);
    applyLanguage(settings.lang);
    switchCategory(activeCategory);
    renderCategories();
    renderTodos();

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const isTrigger = e.target.closest('.menu-trigger');
        if (window.innerWidth <= 850 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !isTrigger) {
            sidebar.classList.remove('open');
        }

        // Close swiped items if clicking elsewhere
        const swiped = document.querySelector('.todo-item.swiped');
        if (swiped && !swiped.contains(e.target)) {
            swiped.classList.remove('swiped');
        }
    });
    document.getElementById('new-task-date').value = getDefaultDate();
    document.getElementById('new-task-time').value = getDefaultTime();
    setupSwipeListeners();

    // For Native Apps: Initialize Tauri Store and reload data
    if (checkTauriEnvironment()) {
        initTauriStore().then((success) => {
            if (success) {
                return loadDataFromTauriStore();
            }
            return false;
        }).then((loaded) => {
            if (loaded) {
                // Re-render with data from Tauri Store
                applyTheme(settings.theme, false);
                applyLanguage(settings.lang);
                renderCategories();
                renderTodos();
                console.log('Storage mode: Tauri Store (Native App)');
            }
        }).catch(e => {
            console.warn('Tauri Store init failed, using LocalStorage:', e);
            alert('Tauri Store Init Failed:\n' + e.message + '\nFalling back to LocalStorage.');

            // Fallback initialization
            isNativeApp = false;
            loadDataFromLocalStorage();
            applyTheme(settings.theme);
            applyLanguage(settings.lang);
            renderCategories();
            renderTodos();
        });
    } else {
        console.log('Storage mode: LocalStorage (Web/H5)');
    }
}

function applyTheme(theme, save = true) {
    settings.theme = theme;
    const icon = document.getElementById('theme-toggle-icon');
    const label = document.getElementById('theme-toggle-label');
    let effectiveTheme = theme;
    if (theme === 'system') effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.body.setAttribute('data-theme', effectiveTheme);
    if (theme === 'system') { icon.setAttribute('data-lucide', 'monitor'); label.textContent = 'SYS'; }
    else if (theme === 'dark') { icon.setAttribute('data-lucide', 'moon'); label.textContent = 'DARK'; }
    else { icon.setAttribute('data-lucide', 'sun'); label.textContent = 'LIGHT'; }
    if (save) saveSettings();
    if (window.lucide) lucide.createIcons();
}

function cycleTheme() {
    const modes = ['light', 'dark', 'system'];
    applyTheme(modes[(modes.indexOf(settings.theme) + 1) % modes.length]);
}

function applyLanguage(lang) {
    settings.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[lang][key]) el.placeholder = i18n[lang][key];
    });

    // Support option text translation
    document.querySelectorAll('option[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });

    const title = document.getElementById('current-category-title');
    if (activeCategory === 'all') title.textContent = i18n[lang].allTasks;
    else if (activeCategory === 'archive') title.textContent = i18n[lang].archivedTasks;
    renderCategories(); renderTodos(); saveSettings();
}

function renderCategories() {
    const list = document.getElementById('category-list');
    let html = `<div class="category-item ${activeCategory === 'all' ? 'active' : ''}" data-category="all"><i data-lucide="layout-grid" size="18"></i><span>${i18n[settings.lang].allTasks}</span></div>`;
    categories.forEach(cat => {
        html += `<div class="category-item ${activeCategory === cat.name ? 'active' : ''}" data-category="${cat.name}"><i data-lucide="${cat.icon || 'hash'}" size="18"></i><span>${cat.name}</span><button class="cat-delete-btn" data-category="${cat.name}"><i data-lucide="trash-2" size="14"></i></button></div>`;
    });
    list.innerHTML = html;

    // Manually attach listeners
    list.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.cat-delete-btn')) return;
            const cat = item.dataset.category;
            if (cat) switchCategory(cat);
        });
    });

    list.querySelectorAll('.cat-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cat = btn.dataset.category;
            if (cat) {
                // Ensure openDeleteCatConfirm is defined and reachable
                try { openDeleteCatConfirm(e, cat); } catch (err) { alert('Delete Error: ' + err.message); }
            }
        });
    });

    const archiveItem = document.getElementById('archive-menu-item');
    if (activeCategory === 'archive') archiveItem.classList.add('active');
    else archiveItem.classList.remove('active');
    [document.getElementById('new-task-category'), document.getElementById('edit-task-category')].forEach(select => {
        const val = select.value;
        select.innerHTML = categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        if (val) select.value = val;
    });
    if (window.lucide) lucide.createIcons();
}

function openDeleteCatConfirm(e, name) {
    e.stopPropagation();
    const hasTasks = todos.some(t => t.category === name);
    if (hasTasks) { openSimpleAlert(i18n[settings.lang].catNotEmpty); return; }
    document.getElementById('confirm-modal-text').textContent = i18n[settings.lang].confirmDeleteCat.replace('{0}', name);
    document.getElementById('confirm-delete-btn').onclick = () => {
        categories = categories.filter(c => c.name !== name);
        if (activeCategory === name) activeCategory = 'all';
        saveData(); renderCategories(); renderTodos(); closeConfirmModal();
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function openSimpleAlert(text) {
    document.getElementById('confirm-modal-text').textContent = text;
    document.getElementById('confirm-delete-btn').style.display = 'none';
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    document.getElementById('confirm-delete-btn').style.display = 'block';
}

function addCategory() {
    const nameVal = document.getElementById('new-category-name').value.trim();
    const icon = document.getElementById('new-category-icon').value;

    if (!nameVal) {
        highlightError('new-category-name');
        return;
    }

    if (!categories.find(c => c.name === nameVal)) {
        categories.push({ name: nameVal, icon }); saveData(); renderCategories(); closeCategoryModal();
        document.getElementById('new-category-name').value = '';
        document.getElementById('new-category-name-count').innerText = '0';
    }
}

function renderTodos() {
    const list = document.getElementById('todo-list');
    const isArchive = activeCategory === 'archive';
    let filtered = isArchive ? todos.filter(t => t.status === '已完成') : (activeCategory === 'all' ? todos.filter(t => t.status === '未完成') : todos.filter(t => t.category === activeCategory && t.status === '未完成'));
    if (filtered.length === 0) {
        list.innerHTML = `<div class="todo-item empty"><i data-lucide="clipboard-list" size="48"></i><p>${isArchive ? i18n[settings.lang].noArchived : i18n[settings.lang].noTasks}</p></div>`;
        if (window.lucide) lucide.createIcons(); return;
    }
    list.innerHTML = filtered.map(todo => {
        // Priority normalization for i18n
        let pKey = todo.priority;
        if (pKey === '高') pKey = 'high';
        else if (pKey === '中') pKey = 'medium';
        else if (pKey === '低') pKey = 'low';

        return `
        <div class="todo-item ${todo.status === '已完成' ? 'completed' : ''}" data-id="${todo.id}">
            <div class="todo-main-view">
                <input type="checkbox" class="todo-checkbox" ${todo.status === '已完成' ? 'checked' : ''}>
                <div class="todo-content">
                    <span class="todo-title">${todo.task}</span>
                    <div class="todo-meta">
                        <span class="priority-badge priority-${pKey}">${getText(pKey)}</span>
                        <span class="tag-category">${todo.category}</span>
                        <span class="deadline-text">${formatDeadline(todo.deadline)}</span>
                    </div>
                </div>
            </div>
            <button class="delete-btn"><i data-lucide="trash-2" size="18"></i></button>
        </div>`
    }).join('');

    // Manually attach listeners to bypass delegation issues
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.todo-item');
            if (item) openDeleteTodoConfirm(e, item.dataset.id);
        });
    });
    list.querySelectorAll('.todo-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const item = chk.closest('.todo-item');
            if (item) handleToggle(item.dataset.id, e.target.checked);
        });
    });
    list.querySelectorAll('.todo-content').forEach(content => {
        content.addEventListener('click', (e) => {
            const item = content.closest('.todo-item');
            if (item) openEditModal(item.dataset.id);
        });
    });

    if (window.lucide) lucide.createIcons();
}

function addTodo() {
    const taskInput = document.getElementById('new-task-input');
    const task = taskInput.value.trim();
    if (!task) {
        highlightError('new-task-input');
        return;
    }
    const deadline = combineDateTime(
        document.getElementById('new-task-date').value,
        document.getElementById('new-task-time').value
    );
    todos.unshift({
        id: 'id-' + Date.now(),
        task,
        status: '未完成',
        category: document.getElementById('new-task-category').value,
        deadline: deadline,
        priority: document.getElementById('new-task-priority').value,
        description: document.getElementById('new-task-desc').value.trim(),
        reminder: parseInt(document.getElementById('new-task-reminder').value),
        reminderSent: false
    });
    saveData(); renderTodos();
    document.getElementById('new-task-input').value = '';
    document.getElementById('new-task-name-count').innerText = '0';
    document.getElementById('new-task-desc').value = '';
    document.getElementById('new-task-desc-count').innerText = '0';
    closeAddTaskModal();
}

function handleToggle(id, checked) {
    const todo = todos.find(t => t.id === id);
    if (todo) { todo.status = checked ? '已完成' : '未完成'; saveData(); renderTodos(); }
}

function openDeleteTodoConfirm(e, id) {
    e.stopPropagation();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    document.getElementById('confirm-modal-text').textContent = i18n[settings.lang].confirmDeleteTodo.replace('{0}', todo.task);
    document.getElementById('confirm-delete-btn').onclick = () => {
        todos = todos.filter(t => t.id !== id);
        saveData(); renderTodos(); closeConfirmModal();
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function highlightError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('input-error');
    el.focus();
    setTimeout(() => el.classList.remove('input-error'), 800);
}

function switchCategory(cat) {
    activeCategory = cat; renderCategories(); renderTodos();
    const title = document.getElementById('current-category-title');
    if (cat === 'all') title.textContent = i18n[settings.lang].allTasks;
    else if (cat === 'archive') title.textContent = i18n[settings.lang].archivedTasks;
    else title.textContent = cat;
    const fab = document.getElementById('fab-add-btn');
    if (fab) fab.style.display = cat === 'archive' ? 'none' : 'flex';
    if (window.innerWidth <= 850) document.getElementById('sidebar').classList.remove('open');
}
function openAddCategoryModal() {
    const el = document.getElementById('new-category-name');
    const count = document.getElementById('new-category-name-count');
    if (count) count.innerText = el.value.length;
    document.getElementById('category-modal').style.display = 'flex';
}
function closeCategoryModal() { document.getElementById('category-modal').style.display = 'none'; }
function openSettings() { document.getElementById('settings-theme').value = settings.theme; document.getElementById('settings-lang').value = settings.lang; document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
function openEditModal(id) {
    currentEditingId = id;
    const todo = todos.find(t => t.id === id);
    if (todo) {
        document.getElementById('edit-task-name').value = todo.task;
        document.getElementById('edit-task-name-count').innerText = todo.task.length;
        document.getElementById('edit-task-category').value = todo.category;
        const dt = splitDateTime(todo.deadline);
        document.getElementById('edit-task-date').value = dt.date;
        document.getElementById('edit-task-time').value = dt.time;

        // Normalize priority for backward compatibility (Chinese -> English)
        let pKey = String(todo.priority).toLowerCase();
        if (pKey === '高') pKey = 'high';
        else if (pKey === '中') pKey = 'medium';
        else if (pKey === '低') pKey = 'low';


        document.getElementById('edit-task-priority').value = pKey;

        // Populate new fields with safe defaults
        document.getElementById('edit-task-desc').value = todo.description || '';
        document.getElementById('edit-task-desc-count').innerText = (todo.description || '').length;
        document.getElementById('edit-task-reminder').value = (todo.reminder !== undefined) ? todo.reminder : -1;

        document.getElementById('edit-modal').style.display = 'flex';
    }
}
function closeModal() { document.getElementById('edit-modal').style.display = 'none'; }
document.getElementById('save-edit-btn').onclick = () => {
    const idx = todos.findIndex(t => t.id === currentEditingId);
    if (idx !== -1) {
        const titleEl = document.getElementById('edit-task-name');
        if (!titleEl.value.trim()) {
            highlightError('edit-task-name');
            return;
        }
        const deadline = combineDateTime(
            document.getElementById('edit-task-date').value,
            document.getElementById('edit-task-time').value
        );
        todos[idx] = {
            ...todos[idx],
            task: document.getElementById('edit-task-name').value,
            category: document.getElementById('edit-task-category').value,
            deadline: deadline,
            priority: document.getElementById('edit-task-priority').value,
            description: document.getElementById('edit-task-desc').value.trim(),
            reminder: parseInt(document.getElementById('edit-task-reminder').value),
            reminderSent: false // Reset reminder status on edit
        };
        saveData(); renderTodos(); closeModal();
    }
};
async function exportData() {
    const data = JSON.stringify({ todos, categories }, null, 2);

    // Check if running in Tauri environment
    if (isNativeApp && window.__TAURI__ && window.__TAURI__.dialog) {
        try {
            const { save } = window.__TAURI__.dialog;
            const { writeTextFile } = window.__TAURI__.fs;

            // Open save dialog
            const filePath = await save({
                defaultPath: 'mytodo_backup.json',
                filters: [{
                    name: 'JSON',
                    extensions: ['json']
                }]
            });

            if (filePath) {
                await writeTextFile(filePath, data);
                console.log('Data exported to:', filePath);
            }
        } catch (e) {
            console.error('Export failed:', e);
            // Fallback to web method
            downloadAsFile(data, 'mytodo_backup.json');
        }
    } else {
        // Web/H5: Use download method
        downloadAsFile(data, 'mytodo_backup.json');
    }
}

// Helper function for web download
function downloadAsFile(content, filename) {
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(content);
    a.download = filename;
    a.click();
}

async function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if (d.todos) {
                todos = d.todos;
                categories = d.categories || categories;
                saveData();
                renderCategories();
                renderTodos();
                // Reset file input
                input.value = '';
            }
        } catch (err) {
            console.error('Import failed:', err);
        }
    };
    reader.readAsText(file);
}




function openAddTaskModal() {
    document.getElementById('new-task-input').value = '';
    document.getElementById('new-task-date').value = getDefaultDate();
    document.getElementById('new-task-time').value = getDefaultTime();
    const catSelect = document.getElementById('new-task-category');
    if (activeCategory !== 'all' && activeCategory !== 'archive') catSelect.value = activeCategory;
    document.getElementById('add-task-modal').style.display = 'flex';
}
function closeAddTaskModal() { document.getElementById('add-task-modal').style.display = 'none'; }

document.getElementById('add-task-confirm-btn').addEventListener('click', addTodo);
document.getElementById('new-task-input').addEventListener('keypress', e => { if (e.key === 'Enter') addTodo(); });
window.onclick = e => { if (e.target.className === 'modal') { closeModal(); closeSettings(); closeCategoryModal(); closeConfirmModal(); closeAddTaskModal(); closeSyncModal(); } };

init();
initSync();
window.cycleTheme = cycleTheme; window.applyTheme = applyTheme; window.applyLanguage = applyLanguage; window.switchCategory = switchCategory; window.openAddCategoryModal = openAddCategoryModal; window.closeCategoryModal = closeCategoryModal; window.addCategory = addCategory; window.openDeleteCatConfirm = openDeleteCatConfirm; window.openDeleteTodoConfirm = openDeleteTodoConfirm; window.closeConfirmModal = closeConfirmModal; window.openSettings = openSettings; window.closeSettings = closeSettings; window.handleToggle = handleToggle; window.openEditModal = openEditModal; window.closeModal = closeModal; window.exportData = exportData; window.importData = importData; window.toggleSidebar = toggleSidebar; window.openAddTaskModal = openAddTaskModal; window.closeAddTaskModal = closeAddTaskModal;
window.toggleSyncEnabled = toggleSyncEnabled; window.openSyncModal = openSyncModal; window.closeSyncModal = closeSyncModal; window.toggleTokenVisibility = toggleTokenVisibility; window.saveSyncConfig = saveSyncConfig; window.uploadToGist = uploadToGist; window.downloadFromGist = downloadFromGist;

// ============ Sync Logic ============

function initSync() {
    // Load sync config from local storage or Tauri store
    if (isNativeApp && store) {
        store.get('sync_config').then(config => {
            if (config) {
                syncConfig = { ...syncConfig, ...config };
                updateSyncUI();
            }
        });
    } else {
        const savedConfig = localStorage.getItem('mytodo_sync_config');
        if (savedConfig) {
            syncConfig = { ...syncConfig, ...JSON.parse(savedConfig) };
            updateSyncUI();
        }
    }
}

function updateSyncUI() {
    // Settings panel UI
    document.getElementById('sync-enabled').checked = syncConfig.enabled;
    const preview = document.getElementById('sync-config-preview');
    if (syncConfig.enabled) {
        preview.style.display = 'flex';
        document.getElementById('sync-platform-display').textContent = syncConfig.type === 'github' ? 'GitHub' : 'Gitee';
        document.getElementById('sync-time-display').textContent = syncConfig.lastSync ?
            `${getText('lastSyncTime')} ${new Date(syncConfig.lastSync).toLocaleString()}` : getText('notSynced');
    } else {
        preview.style.display = 'none';
    }

    // Modal UI
    document.getElementById('sync-type').value = syncConfig.type;
    document.getElementById('sync-token').value = syncConfig.token;
    document.getElementById('sync-gist-id').value = syncConfig.gistId;
    document.getElementById('sync-encrypt').checked = syncConfig.encrypt;
    document.getElementById('last-sync-time').textContent = syncConfig.lastSync ?
        new Date(syncConfig.lastSync).toLocaleString() : '--';
}

function toggleSyncEnabled() {
    syncConfig.enabled = document.getElementById('sync-enabled').checked;
    updateSyncUI();
    saveSyncConfig(true); // Save silently
    if (syncConfig.enabled && (!syncConfig.token)) {
        openSyncModal();
    }
}

function openSyncModal() {
    updateSyncUI();
    document.getElementById('sync-modal').style.display = 'flex';
}

function closeSyncModal() {
    document.getElementById('sync-modal').style.display = 'none';
    // Refresh settings panel UI
    updateSyncUI();
}

function toggleTokenVisibility() {
    const input = document.getElementById('sync-token');
    const icon = document.getElementById('token-visibility-icon');
    if (input.type === 'password') {
        input.type = 'text';
        // lucide icon update logic handled by redrawing or simpler replacement?
        // Since we verify lucide exists, just redraw or ignore icon change exact visuals for speed
        // Actually better to just assume icon stays "eye" but user sees text.
        // For polish:
        // icon.setAttribute('data-lucide', 'eye-off'); 
        // lucide.createIcons();
    } else {
        input.type = 'password';
    }
}

function saveSyncConfig(arg) {
    // Handle overload: arg could be boolean (silent) or Event object (from click)
    const silent = (typeof arg === 'boolean') ? arg : false;

    const typeEl = document.getElementById('sync-type');
    const tokenEl = document.getElementById('sync-token');
    const gistIdEl = document.getElementById('sync-gist-id');
    const encryptEl = document.getElementById('sync-encrypt');

    if (typeEl) syncConfig.type = typeEl.value;
    if (tokenEl) syncConfig.token = tokenEl.value.trim();
    if (gistIdEl) syncConfig.gistId = gistIdEl.value.trim();
    if (encryptEl) syncConfig.encrypt = encryptEl.checked;

    // Validate Token
    if (tokenEl && !tokenEl.value.trim()) {
        highlightError('sync-token');
        return;
    }

    // Save to storage
    if (isNativeApp && typeof store !== 'undefined') {
        store.set('sync_config', syncConfig);
        store.save(); // Persist immediately
    } else {
        localStorage.setItem('mytodo_sync_config', JSON.stringify(syncConfig));
    }

    if (!silent) {
        closeSyncModal();
    }
}



// Simple XOR + Base64 encryption (UTF-8 safe)
function encryptData(data, key) {
    if (!key) return null;
    try {
        const jsonStr = JSON.stringify(data);
        // UTF-8 encode
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonStr);

        // XOR
        const encoderKey = new TextEncoder();
        const keyBytes = encoderKey.encode(key);
        const xorBytes = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            xorBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }

        // Uint8Array to Binary String for btoa
        let binary = '';
        const len = xorBytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(xorBytes[i]);
        }
        return window.btoa(binary);
    } catch (e) {
        console.error('Encryption error:', e);
        return null;
    }
}

function decryptData(cipherText, key) {
    if (!key) return null;
    try {
        // Base64 to Binary String
        const binary = window.atob(cipherText);
        // Binary String to Uint8Array
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // XOR
        const encoderKey = new TextEncoder();
        const keyBytes = encoderKey.encode(key);
        const decryptedBytes = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            decryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }

        // UTF-8 decode
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(decryptedBytes);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Decryption error:', e);
        return null;
    }
}

// API Interactions
async function uploadToGist() {
    const statusMsg = document.getElementById('sync-status-message');
    statusMsg.style.display = 'block';
    statusMsg.className = 'sync-status-message loading';
    statusMsg.textContent = getText('syncing');

    const type = document.getElementById('sync-type').value;
    const token = document.getElementById('sync-token').value.trim();
    const gistId = document.getElementById('sync-gist-id').value.trim();
    const encrypt = document.getElementById('sync-encrypt').checked;

    if (!token) {
        statusMsg.className = 'sync-status-message error';
        statusMsg.textContent = getText('syncFailed') + ' Token required';
        return;
    }

    const rawData = { todos, categories, settings };
    let content = '';

    if (encrypt) {
        content = encryptData(rawData, token);
        if (!content) {
            statusMsg.className = 'sync-status-message error';
            statusMsg.textContent = getText('syncFailed') + ' Encryption failed';
            return;
        }
    } else {
        content = JSON.stringify(rawData, null, 2);
    }

    const fileName = encrypt ? 'mytodo_data.enc' : 'mytodo_data.json';
    const description = `MyTodo Backup (${new Date().toLocaleString()})`;

    try {
        let response;
        if (type === 'github') {
            const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
            const method = gistId ? 'PATCH' : 'POST';

            response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description,
                    files: {
                        [fileName]: {
                            content: content
                        }
                    },
                    public: false
                })
            });
        } else {
            // Gitee
            const url = gistId ? `https://gitee.com/api/v5/gists/${gistId}` : 'https://gitee.com/api/v5/gists';
            const method = gistId ? 'PATCH' : 'POST';

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    access_token: token,
                    description: description,
                    files: {
                        [fileName]: {
                            content: content
                        }
                    },
                    public: false
                })
            });
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const resData = await response.json();

        // Update sync details
        syncConfig.gistId = resData.id;
        syncConfig.lastSync = new Date().toISOString();
        saveSyncConfig(true); // Save IDs

        // Update UI
        updateSyncUI();
        statusMsg.className = 'sync-status-message success';
        statusMsg.textContent = getText('syncSuccess');

    } catch (e) {
        console.error(e);
        statusMsg.className = 'sync-status-message error';
        statusMsg.textContent = getText('syncFailed') + ' ' + e.message;
    }
}

async function downloadFromGist() {
    const statusMsg = document.getElementById('sync-status-message');
    statusMsg.style.display = 'block';
    statusMsg.className = 'sync-status-message loading';
    statusMsg.textContent = getText('syncing');

    const type = document.getElementById('sync-type').value;
    const token = document.getElementById('sync-token').value.trim();
    const gistId = document.getElementById('sync-gist-id').value.trim();
    const encrypt = document.getElementById('sync-encrypt').checked;

    if (!token || !gistId) {
        statusMsg.className = 'sync-status-message error';
        statusMsg.textContent = getText('syncFailed') + ' Token & Gist ID required';
        return;
    }

    try {
        let response;
        if (type === 'github') {
            response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { 'Authorization': `token ${token}` }
            });
        } else {
            response = await fetch(`https://gitee.com/api/v5/gists/${gistId}?access_token=${token}`);
        }

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const resData = await response.json();
        const files = resData.files;

        let targetFile = files['mytodo_data.enc'];
        let isEncrypted = true;

        if (!targetFile) {
            targetFile = files['mytodo_data.json'];
            isEncrypted = false;
        }

        if (!targetFile) {
            throw new Error('No valid data file found in Gist');
        }

        let content = targetFile.content;
        let data = null;

        if (isEncrypted) {
            // Need decryption
            data = decryptData(content, token);
            if (!data) {
                throw new Error(getText('decryptFailed'));
            }
        } else {
            data = JSON.parse(content);
        }

        // Confirm overwrite
        const statusMsgEl = document.getElementById('sync-status-message');
        if (statusMsgEl) statusMsgEl.style.display = 'none';

        showConfirm(getText('confirmOverwriteLocal'), () => {
            todos = data.todos || [];
            categories = data.categories || categories;

            saveData();
            renderTodos();
            renderCategories();

            syncConfig.lastSync = new Date().toISOString();
            saveSyncConfig(true);

            if (statusMsgEl) {
                statusMsgEl.style.display = 'block';
                statusMsgEl.className = 'sync-status-message success';
                statusMsgEl.textContent = getText('syncSuccess');
            }
            updateSyncUI();
        });

    } catch (e) {
        console.error(e);
        statusMsg.className = 'sync-status-message error';
        statusMsg.textContent = getText('syncFailed') + ' ' + e.message;
    }
}

// ============ Generic Modal Logic ============
let genericConfirmCallback = null;

function showAlert(message, titleKey = 'info') {
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-title').innerHTML = getText(titleKey); // innerHTML to support possible icon
    document.getElementById('alert-modal').style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('alert-modal').style.display = 'none';
}

function showConfirm(message, callback, titleKey = 'confirm') {
    document.getElementById('generic-confirm-message').textContent = message;
    document.getElementById('generic-confirm-title').innerHTML = getText(titleKey);
    genericConfirmCallback = callback;
    document.getElementById('generic-confirm-modal').style.display = 'flex';
}

function closeGenericConfirmModal() {
    document.getElementById('generic-confirm-modal').style.display = 'none';
    genericConfirmCallback = null;
}

// Use event delegation or ensure element exists
const genericConfirmBtn = document.getElementById('generic-confirm-btn');
if (genericConfirmBtn) {
    genericConfirmBtn.addEventListener('click', () => {
        if (genericConfirmCallback) genericConfirmCallback();
        closeGenericConfirmModal();
    });
} else {
    console.warn('Generic confirm button not found on init');
    // Fallback: try waiting for DOM if somehow script ran too early (unlikely at bottom of body)
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('generic-confirm-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (genericConfirmCallback) genericConfirmCallback();
                closeGenericConfirmModal();
            });
        }
    });
}

window.showAlert = showAlert;
window.closeAlertModal = closeAlertModal;
window.showConfirm = showConfirm;
window.closeGenericConfirmModal = closeGenericConfirmModal;

// Update window.onclick to include new modals
// Note: This overrides previous window.onclick. We should merge or ensure all are covered.
// Previous: window.onclick = e => { if (e.target.className === 'modal') { closeModal(); closeSettings(); ... } };
// Since we have access to variables like closeModal etc, we can redefine it completely to include new ones.

const existingOnClickProxy = window.onclick;
window.onclick = e => {
    if (e.target.className === 'modal') {
        // Try calling all close functions. It's safe if they just hide elements.
        try { closeModal(); } catch (e) { }
        try { closeSettings(); } catch (e) { }
        try { closeCategoryModal(); } catch (e) { }
        try { closeConfirmModal(); } catch (e) { }
        try { closeAddTaskModal(); } catch (e) { }
        try { closeSyncModal(); } catch (e) { }

        closeAlertModal();
        closeGenericConfirmModal();
    }
};



/* Reminder System & Description Helpers */
function startReminderService() {
    if (isNativeApp && window.__TAURI__) {
        const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;
        if (invoke) {
            invoke('plugin:notification|request_permission').catch(err => console.error('Perm Error', err));
        }
    } else if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
            // Also bind to click for better browser support
            const clickHandler = () => {
                Notification.requestPermission();
                document.removeEventListener('click', clickHandler);
            };
            document.addEventListener('click', clickHandler);
        }
    }
    // Check every minute
    setInterval(checkReminders, 60000);
    // Initial check (delay to let data load)
    setTimeout(checkReminders, 5000);
}

function checkReminders() {
    // console.log('checkReminders running:', (todos || []).length);
    if (!todos || todos.length === 0) return;
    const now = new Date();
    let changed = false;

    todos.forEach(todo => {
        if (todo.status === '已完成') return;
        if (todo.reminder === undefined || todo.reminder < 0) return;
        if (todo.reminderSent) return;

        const deadlineDate = new Date(todo.deadline);
        if (isNaN(deadlineDate.getTime())) return;

        const reminderMs = todo.reminder * 60 * 1000;
        const triggerTime = new Date(deadlineDate.getTime() - reminderMs);

        // Debug log
        // console.log(`Checking Task: "${todo.task}" | Diff: ${(now - triggerTime)/1000}s`);
        if (now >= triggerTime) {
            // console.log('>>> FIRING NOTIFICATION for:', todo.task);
            sendNotification(todo);
            todo.reminderSent = true;
            changed = true;
        }
    });

    if (changed) {
        saveData(); // Persist sent status
    }
}

function sendNotification(todo) {
    const title = 'Todo Reminder: ' + todo.task;
    const timeStr = formatDeadline(todo.deadline);
    const body = `Due: ${timeStr}\n${todo.description || ''}`;

    if (isNativeApp && window.__TAURI__) {
        const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;
        if (window.__TAURI__.notification && typeof window.__TAURI__.notification.sendNotification === 'function') {
            try { window.__TAURI__.notification.sendNotification({ title, body }); }
            catch (e) { console.error('Notify Error', e); }
        } else if (invoke) {
            invoke('plugin:notification|notify', { options: { title, body } })
                .catch(e => console.error('Notify Invoke Error', e));
        }
    } else if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                const n = new Notification(title, { body, icon: '/icon.png' });
                n.onclick = () => window.focus();
            } catch (e) { console.error('Web Notify Error:', e); }
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') {
                    new Notification(title, { body, icon: '/icon.png' });
                }
            });
        }
    }
}

function setupCharCountListeners() {
    const map = {
        'new-task-desc': 'new-task-desc-count',
        'edit-task-desc': 'edit-task-desc-count',
        'new-task-input': 'new-task-name-count',
        'edit-task-name': 'edit-task-name-count',
        'new-category-name': 'new-category-name-count'
    };
    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        const countId = map[id];
        if (el) {
            el.addEventListener('input', () => {
                const counter = document.getElementById(countId);
                if (counter) counter.innerText = el.value.length;
            });
        }
    });
}

// Event Listeners for Release Build Compatibility
document.getElementById('btn-add-category')?.addEventListener('click', openAddCategoryModal);
document.getElementById('btn-settings')?.addEventListener('click', openSettings);
document.getElementById('theme-toggle-btn')?.addEventListener('click', cycleTheme);
document.getElementById('fab-add-btn')?.addEventListener('click', openAddTaskModal);
// Sidebar toggles
document.querySelectorAll('.menu-trigger').forEach(btn => {
    btn.addEventListener('click', toggleSidebar);
});

document.getElementById('archive-menu-item')?.addEventListener('click', () => switchCategory('archive'));

// Comprehensive Event Listeners for Release Build
// Modals
const clickMap = {
    'btn-edit-cancel': closeModal,
    'btn-confirm-cancel': closeConfirmModal,
    'btn-alert-close': closeAlertModal,
    'btn-generic-cancel': closeGenericConfirmModal,
    'btn-cat-cancel': closeCategoryModal,
    'btn-cat-add': addCategory,
    'btn-add-task-cancel': closeAddTaskModal,
    'add-task-confirm-btn': addTodo,
    'btn-export-data': exportData,
    'btn-open-sync': openSyncModal
};

Object.keys(clickMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', clickMap[id]);
});

// Import Trigger
const btnImport = document.getElementById('btn-import-trigger');
if (btnImport) btnImport.addEventListener('click', () => document.getElementById('import-file').click());

// Settings Changes
const themeSelect = document.getElementById('settings-theme');
if (themeSelect) themeSelect.addEventListener('change', e => applyTheme(e.target.value));

const langSelect = document.getElementById('settings-lang');
if (langSelect) langSelect.addEventListener('change', e => applyLanguage(e.target.value));

const syncCheck = document.getElementById('sync-enabled');
if (syncCheck) syncCheck.addEventListener('change', toggleSyncEnabled);

const importFile = document.getElementById('import-file');
if (importFile) importFile.addEventListener('change', function () { importData(this); });


// Sync Modal Handlers
const syncMap = {
    'btn-settings-close': closeSettings,
    'btn-toggle-token': toggleTokenVisibility,
    'btn-sync-upload': uploadToGist,
    'btn-sync-download': downloadFromGist,
    'btn-sync-cancel': closeSyncModal,
    'btn-sync-save': saveSyncConfig,
};
Object.keys(syncMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', syncMap[id]);
});

// Final fallback error handler for debugging Release issues
// Final fallback error handler (Silent in Production)
window.addEventListener('error', (e) => {
    console.error('JS Error:', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
    console.warn('Promise Error:', e.reason);
});


(function () {
    function attach(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => { e.stopPropagation(); try { fn(e); } catch (err) { alert('Action Error: ' + err.message); } });
    }
    // Explicit Final Binding
    attach('btn-sync-cancel', closeSyncModal);
    attach('btn-sync-save', saveSyncConfig);
    attach('btn-settings-close', closeSettings);
})();

