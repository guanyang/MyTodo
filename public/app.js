// MyTodo Advanced Logic v6 - Final Polished Version
let todos = [];
let categories = [{ name: 'Work', icon: 'briefcase' }, { name: 'Personal', icon: 'user' }, { name: 'Shopping', icon: 'shopping-cart' }];
let currentEditingId = null;
let activeCategory = 'all';
let settings = { theme: 'system', lang: 'en' };

const i18n = {
    zh: {
        allTasks: "所有任务", categories: "分类", addCategory: "添加分类", categoryName: "分类名称", categoryIcon: "图标", settings: "设置",
        editTask: "编辑任务", taskName: "任务名称", category: "分类", deadline: "截止日期", priority: "优先级",
        low: "低", medium: "中", high: "高", cancel: "取消", save: "保存", delete: "删除",
        theme: "主题", themeSystem: "系统", themeLight: "浅色", themeDark: "深色", language: "语言",
        dataOps: "数据管理", export: "导出", import: "导入", close: "关闭", add: "添加", addTask: "添加任务",
        noTasks: "暂无任务", synced: "已同步", todoPlaceholder: "输入待办事项...", confirmDeleteTitle: "确认删除",
        confirmDeleteCat: "确定要删除分类「{0}」吗？", confirmDeleteTodo: "确定要删除任务「{0}」吗？",
        catNotEmpty: "该分类下还有任务，无法删除", importSuccess: "导入成功！", archive: "归档", archivedTasks: "已归档任务",
        noArchived: "暂无归档任务",
        dataSafetyTip: "所有数据均存储在您的浏览器本地。请定期导出备份以防数据丢失。",
        iconDefault: "# (默认)", iconWork: "💼 工作", iconPersonal: "👤 个人", iconShopping: "🛒 购物",
        iconStudy: "📚 学习", iconHealth: "❤️ 健康", iconHome: "🏠 居家", iconTravel: "✈️ 旅行", icon休闲: "☕ 休闲"
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
        dataSafetyTip: "All data is stored locally in your browser. Please export backups regularly to prevent data loss.",
        iconDefault: "# (Default)", iconWork: "💼 Work", iconPersonal: "👤 Personal", iconShopping: "🛒 Shopping",
        iconStudy: "📚 Study", iconHealth: "❤️ Health", iconHome: "🏠 Home", iconTravel: "✈️ Travel", icon休闲: "☕ Leisure"
    }
};

const STORAGE_KEY_DATA = 'mytodo_data_v3';
const STORAGE_KEY_SETTINGS = 'mytodo_settings_v3';

function init() {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (savedSettings) settings = { ...settings, ...JSON.parse(savedSettings) };
    const savedData = localStorage.getItem(STORAGE_KEY_DATA);
    if (savedData) {
        const parsed = JSON.parse(savedData);
        todos = parsed.todos || [];
        categories = parsed.categories || categories;
    }
    applyTheme(settings.theme, false);
    applyLanguage(settings.lang);
    switchCategory(activeCategory);
    renderCategories();
    renderTodos();
    
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.menu-trigger');
        if (window.innerWidth <= 850 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
    document.getElementById('new-task-deadline').value = new Date().toISOString().split('T')[0];
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

function saveSettings() { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings)); }
function saveData() { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({ todos, categories })); }

function renderCategories() {
    const list = document.getElementById('category-list');
    let html = `<div class="category-item ${activeCategory === 'all' ? 'active' : ''}" onclick="switchCategory('all')"><i data-lucide="layout-grid" size="18"></i><span>${i18n[settings.lang].allTasks}</span></div>`;
    categories.forEach(cat => {
        html += `<div class="category-item ${activeCategory === cat.name ? 'active' : ''}" onclick="switchCategory('${cat.name}')"><i data-lucide="${cat.icon || 'hash'}" size="18"></i><span>${cat.name}</span><button class="cat-delete-btn" onclick="openDeleteCatConfirm(event, '${cat.name}')"><i data-lucide="trash-2" size="14"></i></button></div>`;
    });
    list.innerHTML = html;
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
    const name = document.getElementById('new-category-name').value.trim();
    const icon = document.getElementById('new-category-icon').value;
    if (name && !categories.find(c => c.name === name)) {
        categories.push({ name, icon }); saveData(); renderCategories(); closeCategoryModal();
        document.getElementById('new-category-name').value = '';
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
    list.innerHTML = filtered.map(todo => `
        <div class="todo-item ${todo.status === '已完成' ? 'completed' : ''}">
            <input type="checkbox" ${todo.status === '已完成' ? 'checked' : ''} onchange="handleToggle('${todo.id}', this.checked)">
            <div class="todo-content" onclick="openEditModal('${todo.id}')">
                <span class="todo-title">${todo.task}</span>
                <div class="todo-meta">
                    <span class="priority-badge priority-${todo.priority}">${todo.priority}</span>
                    <span class="tag-category">${todo.category}</span>
                    <span class="deadline-text">${todo.deadline}</span>
                </div>
            </div>
            <button class="delete-btn" onclick="openDeleteTodoConfirm(event, '${todo.id}')"><i data-lucide="trash-2" size="18"></i></button>
        </div>`).join('');
    if (window.lucide) lucide.createIcons();
}

function addTodo() {
    const task = document.getElementById('new-task-input').value.trim();
    if (!task) return;
    todos.unshift({ id: 'id-' + Date.now(), task, status: '未完成', category: document.getElementById('new-task-category').value, deadline: document.getElementById('new-task-deadline').value, priority: document.getElementById('new-task-priority').value });
    saveData(); renderTodos(); document.getElementById('new-task-input').value = '';
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
function switchCategory(cat) { 
    activeCategory = cat; renderCategories(); renderTodos(); 
    const title = document.getElementById('current-category-title');
    if (cat === 'all') title.textContent = i18n[settings.lang].allTasks;
    else if (cat === 'archive') title.textContent = i18n[settings.lang].archivedTasks;
    else title.textContent = cat;
    document.getElementById('add-task-section').style.display = cat === 'archive' ? 'none' : 'flex';
    if (window.innerWidth <= 850) document.getElementById('sidebar').classList.remove('open');
}
function openAddCategoryModal() { document.getElementById('category-modal').style.display = 'flex'; }
function closeCategoryModal() { document.getElementById('category-modal').style.display = 'none'; }
function openSettings() { document.getElementById('settings-theme').value = settings.theme; document.getElementById('settings-lang').value = settings.lang; document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
function openEditModal(id) {
    currentEditingId = id; const todo = todos.find(t => t.id === id);
    if (todo) {
        document.getElementById('edit-task-name').value = todo.task; document.getElementById('edit-task-category').value = todo.category;
        document.getElementById('edit-task-deadline').value = todo.deadline; document.getElementById('edit-task-priority').value = todo.priority;
        document.getElementById('edit-modal').style.display = 'flex';
    }
}
function closeModal() { document.getElementById('edit-modal').style.display = 'none'; }
document.getElementById('save-edit-btn').onclick = () => {
    const idx = todos.findIndex(t => t.id === currentEditingId);
    if (idx !== -1) {
        todos[idx] = { ...todos[idx], task: document.getElementById('edit-task-name').value, category: document.getElementById('edit-task-category').value, deadline: document.getElementById('edit-task-deadline').value, priority: document.getElementById('edit-task-priority').value };
        saveData(); renderTodos(); closeModal();
    }
};
function exportData() {
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ todos, categories }));
    a.download = `mytodo_backup.json`; a.click();
}
function importData(input) {
    const reader = new FileReader(); reader.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if (d.todos) { todos = d.todos; categories = d.categories || categories; saveData(); renderCategories(); renderTodos(); }
        } catch(err) {}
    };
    reader.readAsText(input.files[0]);
}

document.getElementById('add-task-btn').addEventListener('click', addTodo);
document.getElementById('new-task-input').addEventListener('keypress', e => { if (e.key === 'Enter') addTodo(); });
window.onclick = e => { if (e.target.className === 'modal') { closeModal(); closeSettings(); closeCategoryModal(); closeConfirmModal(); } };

init();
window.cycleTheme = cycleTheme; window.applyTheme = applyTheme; window.applyLanguage = applyLanguage; window.switchCategory = switchCategory; window.openAddCategoryModal = openAddCategoryModal; window.closeCategoryModal = closeCategoryModal; window.addCategory = addCategory; window.openDeleteCatConfirm = openDeleteCatConfirm; window.openDeleteTodoConfirm = openDeleteTodoConfirm; window.closeConfirmModal = closeConfirmModal; window.openSettings = openSettings; window.closeSettings = closeSettings; window.handleToggle = handleToggle; window.openEditModal = openEditModal; window.closeModal = closeModal; window.exportData = exportData; window.importData = importData; window.toggleSidebar = toggleSidebar;
