# MyTodo

MyTodo 是一款基于 **Tauri** 构建的现代化、极简主义桌面端待办事项应用。它结合了 Web 前端的灵活性与 Rust 后端的高性能，提供原生级的应用体验。

![App Icon](src-tauri/icons/128x128.png)

## ✨ 主要功能

### 📝 任务管理
- **高效录入**：支持快速添加任务、设置截止日期和时间。
- **分类管理**：自定义任务分类（工作、生活、购物等），支持自定义图标。
- **任务归档**：一键归档已完成任务，保持今日列表清爽。
- **交互体验**：提供移动端风格的**滑动删除**功能，以及桌面端优化的 Hover 操作。

### ☁️ 云端同步 (Gist Sync)
- **多端同步**：支持通过 **GitHub Gist** 或 **Gitee Gist** 进行多设备数据同步。
- **隐私优先**：内置**端到端加密**（AES-like XOR + Base64），确保您的 Token 和数据在云端以密文存储，保护隐私。
- **无缝体验**：简单的配置流程，支持一键上传/下载。

### 🎨 现代化设计
- **精致 UI**：采用各类现代化设计语言（Glassmorphism 磨砂玻璃、平滑动画）。
- **多主题支持**：内置浅色、深色模式，并支持跟随系统自动切换。
- **国际化**：完美支持 **简体中文** 和 **English**，自动检测系统语言。

### 🔒 数据安全
- **本地优先**：所有数据默认存储在本地，不经过任何第三方服务器。
- **备份导出**：随时导出/导入 JSON 格式的完整数据备份。

## 🚀 安装与运行

### 下载安装包
请前往 [Releases页面](https://github.com/guanyang/MyTodo/releases) 下载适用于 macOS (.dmg) 或 Windows (.exe) 的最新安装包。

### 💻 本地开发

如果你是开发者，可以按照以下步骤运行项目：

1. **环境准备**：
   - 确保已安装 [Rust](https://www.rust-lang.org/tools/install) 环境。
   - 确保已安装 Node.js。

2. **安装依赖**：
   ```bash
   npm install
   # 主要是前端工具链，本项目核心依赖由 Rust 管理
   ```

3. **启动开发服务器**：
   ```bash
   cargo tauri dev
   ```
   该命令将同时启动前端服务和 Tauri 窗口。

4. **构建发布版本**：
   ```bash
   cargo tauri build
   ```
   构建产物将位于 `src-tauri/target/release/bundle/` 目录下。

## 📂 项目结构

```
.
├── public/                 # 前端资源
│   ├── index.html          # UI 入口
│   ├── app.js              # 核心业务逻辑 (Vanilla JS)
│   ├── style.css           # 样式表
│   └── locales/            # 国际化资源
├── src-tauri/              # Tauri 后端 (Rust)
│   ├── src/                # Rust 源码
│   ├── tauri.conf.json     # Tauri 配置文件
│   └── icons/              # 应用图标资源
└── README.md
```

## 🛠 技术栈

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (No Framework)
- **Backend/Shell**: Tauri (Rust), Tauri Plugins (Store, Shell, Dialog, FS)
- **Iconography**: Lucide Icons
- **Sync**: GitHub/Gitee REST API

## 📝 许可证

MIT License
