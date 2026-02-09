# Tauri 开发指南：CSP 安全策略与 Release 构建陷阱

在 Tauri 应用开发中，Release 构建（生产环境）与 Dev 模式（开发环境）的主要差异之一在于 **Webview 安全策略 (CSP - Content Security Policy)**。这些策略旨在防止 XSS（跨站脚本攻击）和其他安全漏洞，但也常常阻断某些常见的开发模式。

本指南总结了我们在开发 `MyTodo` 中遇到的典型问题及其解决方案。

## 1. 为什么 Release 构建容易“出问题”？

Tauri 在打包为 Release 版本时，会应用严格的 CSP 策略。
*   **Dev 模式**：通常运行在一个本地 HTTP 服务器上（如 `http://localhost:1420`），浏览器环境相对宽松，允许部分内联脚本和调试。
*   **Release 模式**：通常从本地文件系统加载资源 (`tauri://localhost` 或 `https://tauri.localhost`)，且 Webview 会强制执行 `tauri.conf.json` 中配置的 CSP 规则。

如果代码违反 CSP 规则，Webview 会直接拦截执行，通常**没有明显的报错提示**（除非配置了远程日志或开启了 Inspect），表现为点击无反应、白屏或请求失败。

## 2. 核心问题与解决方案

### A. 内联事件处理器 (`onclick="..."`)

**❌ 问题写法：**
HTML 中的内联 JS 代码通常被 CSP 拦截，导致点击无效。
```html
<!-- 在 Release 模式下极易失效 -->
<button onclick="saveSyncConfig()">Save</button>
<button onclick="confirm('Delete?')">Delete</button>
```

**✅ 推荐写法：**
使用 `addEventListener` 或在 JS 中动态绑定。
```javascript
// HTML
<button id="btn-save">Save</button>

// JS (app.js)
document.getElementById('btn-save').addEventListener('click', saveSyncConfig);
```

### B. 动态 HTML 与事件委托

**❌ 常见陷阱：**
在 `innerHTML` 插入新内容后，原有的事件绑定会丢失；或者使用事件委托时，Release 环境下的事件冒泡行为可能被 Shadow DOM 或 SVG 结构阻断。
```javascript
// 这种基于 innerHTML 的动态生成，按钮本身没有独立绑定事件
list.innerHTML = `<button class="delete-btn">Delete</button>`;
// 依赖父容器委托（如 todo-list），有时会因为点击了内部图标（<svg>）而判定失败
```

**✅ 推荐写法（手动重绑）：**
虽然代码量稍多，但在每次渲染后 **手动查找并绑定** 是最稳健的方式。
```javascript
list.innerHTML = htmlContent;
// 手动绑定，确保无死角
list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
});
```

### C. 网络请求拦截 (`connect-src`)

**❌ 问题现象：**
在 Dev 模式下 `fetch('https://api.github.com')` 正常，但在 Release 包中报错 `Failed to fetch`。

**✅ 解决方案：**
必须在 `tauri.conf.json` 的 `csp` 配置中显式添加允许的域名。
```json
"security": {
  "csp": "default-src 'self'; ... connect-src 'self' https://api.github.com https://gitee.com"
}
```
*注意：Tauri v2 默认禁止未声明的外部连接。*

### D. 原生弹窗假死 (`alert`/`confirm`)

**❌ 严重问题：**
在 macOS 的 Release 构建中，调用原生的 `window.alert()` 或 `window.confirm()` 可能会阻塞 UI 线程，导致应用假死（无法关闭弹窗，主窗口无响应）。

**✅ 解决方案：**
1.  **绝对禁止**在 Release 代码中使用 `alert()`。
2.  使用 **自定义 HTML 模态框**（如 `<div id="my-modal">`）替代。
3.  或者使用 Tauri 提供的 Rust 原生对话框 API (`@tauri-apps/api/dialog`)，但这需要 Rust 后端支持。

## 3. Release 调试技巧

当 Release 版本出现“点击无反应”且无报错时：

1.  **开启审查 (Inspect)**：
    在 `tauri.conf.json` 中临时开启 `devtools`，允许在 Release 包中右键审查元素看 Console 报错。
    ```json
    "app": {
      "windows": [
        {
          "devtools": true
        }
      ]
    }
    ```

2.  **全局错误捕获 (仅调试用)**：
    在代码末尾添加 `window.onerror`，将错误输出到页面可见区域（如创建一个临时的 `div`），因为 Release 模式通常看不到控制台。
    ```javascript
    window.onerror = function(msg) {
        document.body.insertAdjacentHTML('beforeend', '<div style="color:red;z-index:9999">Error: ' + msg + '</div>');
    }
    ```

## 4. 总结

为了开发高质量的 Tauri 应用，应始终遵循：
1.  **HTML/JS 分离**：拒绝 `onclick`。
2.  **显式绑定**：对动态元素使用显式 `addEventListener`。
3.  **零原生弹窗**：使用自定义 UI 替代 `alert`。
4.  **CSP 白名单**：网络请求必配 `connect-src`。
