# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2026-02-09

### Added
- **Smart Reminders**: 
  - Cross-platform system notifications (Web + Native) ensuring you never miss a task.
  - Flexible scheduling options: "At event time", "5 mins before", "1 hour before", etc.
  - Intelligent permission request handling for seamless user experience.
- **Input Enhancements**: 
  - Added multi-line **Description** field (max 300 chars).
  - Real-time character counting and limits for Task Name (50), Category (20), and Description.
- **Cloud Sync**: 
  - Integrated GitHub and Gitee Gist synchronization with end-to-end encryption.
- **Interaction**: 
  - Implemented swipe-to-delete gesture support.
  - Added generic custom modal dialogs (`showAlert`, `showConfirm`).
- **CI/CD**: 
  - Added automated release workflow for multi-platform builds.

### Changed
- **UI/UX**: 
  - **Compact Modals**: Redesigned Add/Edit Task dialogs with a grid layout to maximize space efficiency.
  - Replaced native alerts with custom styled modals.
  - Simplified Sync Settings UI.
- **Assets**: 
  - Updated application icons for proper macOS Dock styling.
- **Documentation**: 
  - Updated README to reflect Tauri architecture and new features.

### Fixed
- **Interaction**:
  - Fixed sidebar menu toggle issue on mobile devices/small screens.
  - Fixed notification permission "default" state stuck issue on Web.
- **Sync**: 
  - Fixed UTF-8 encryption errors.
  - Fixed Gitee download failures.
- **UI**: 
  - Fixed "OK" button responsiveness in dialogs.
  - Fixed macOS icon scaling.
  - Resolved layout overlap between Deadline and Reminder fields in modals.
