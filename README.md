
<h1 align="center">MyTodo ✅</h1>

<div align="center">
  极简、安全、高效的本地优先待办事项管理工具
</div>

<br />

<div align="center">
  <img src="src-tauri/icons/128x128.png" width="128" height="128" alt="MyTodo Icon" />
</div>

<br />

<div align="center">
  <h3>您的个人高效生产力助手</h3>
  <p>不仅仅是待办清单，更是掌控生活的极简哲学。</p>
</div>

<div align="center">
  <img src="https://img.shields.io/github/v/release/guanyang/MyTodo?style=flat-square&color=blue&label=Version" alt="Version">
  <img src="https://img.shields.io/badge/Tauri-v2-orange?logo=tauri&style=flat-square" alt="Tauri">
  <img src="https://img.shields.io/badge/Backend-Rust-red?logo=rust&style=flat-square" alt="Rust">
  <img src="https://img.shields.io/badge/Frontend-Vanilla_JS-yellow?logo=javascript&style=flat-square" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</div>

<p align="center">
  <a href="#-主要功能">核心功能</a> • 
  <a href="#-安装与运行">安装指南</a> • 
  <a href="#-技术栈">技术架构</a> • 
  <a href="#-项目结构">项目结构</a>
</p>

<p align="center">
  <b>简体中文</b> | <a href="./README.en.md">English</a>
</p>

---

**MyTodo** 是一款基于 **Tauri** 构建的现代化桌面端待办事项应用。它摒弃了繁杂的功能堆砌，回归任务管理的本质，结合 **Rust** 的极致性能与现代 Web 设计的灵活性。

通过内置的 **Gist 云同步** 与 **端到端加密** 技术，您可以在享受本地应用极速体验的同时，安全地在多设备间同步数据，且无需担心隐私泄露——
您的数据完全掌握在自己手中。

<h2 align="center">🎨 界面预览</h2>

<div align="center">
  <img src="docs/images/main_light.png" width="45%" alt="Light Mode" />
  <img src="docs/images/main_dark.png" width="45%" alt="Dark Mode" />
</div>
<div align="center">
  <sub>现代化主题展示 (Light / Dark)</sub>
</div>

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
├── .github/                # GitHub Actions Workflows
│   └── workflows/          
│       └── release.yml     # 自动发布流程配置
├── public/                 # 前端资源 (Web Assets)
│   ├── index.html          # 应用入口 HTML
│   ├── app.js              # 核心业务逻辑 (Vanilla JS)
│   ├── style.css           # 全局样式表
│   └── favicon.png         # 网站/应用图标
├── src-tauri/              # Tauri 后端 (Rust Environment)
│   ├── src/                # Rust 源代码
│   │   ├── main.rs         # 入口文件
│   │   └── lib.rs          # 库文件与插件注册
│   ├── capabilities/       # 权限控制配置
│   ├── icons/              # 多平台应用图标资源
│   ├── tauri.conf.json     # Tauri 项目配置文件
│   └── Cargo.toml          # Rust 依赖配置
├── CHANGELOG.md            # 更新日志
└── README.md               # 项目说明文档
```

## 🛠 技术栈

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (No Framework)
- **Backend/Shell**: Tauri v2 (Rust)
- **Plugins**: Tauri Plugin Store, Shell, Dialog, FS
- **Iconography**: Lucide Icons
- **Sync**: GitHub/Gitee REST API

## 📝 许可证

MIT License
