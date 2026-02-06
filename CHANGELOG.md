# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2026-02-06

### Added
- **Cloud Sync**: 
  - Integrated GitHub and Gitee Gist synchronization.
  - Implemented end-to-end encryption (XOR + Base64) to secure user data and tokens.
  - Added "Sync Settings" modal for configuring provider, token, and encryption preferences.
- **Interaction**: 
  - Implemented swipe-to-delete gesture support for touch devices and trackpads.
  - Added generic custom modal dialogs (`showAlert`, `showConfirm`) for a unified UI experience.
- **CI/CD**: 
  - Added `.github/workflows/release.yml` for automated multi-platform builds (macOS, Windows, Ubuntu) on release publication.

### Changed
- **UI/UX**: 
  - Replaced system native `alert` and `confirm` dialogs with custom styled modals.
  - Simplified Sync Settings UI by removing the redundant "View Gist" button.
  - Removed "Data Management" safety tip from Settings for a cleaner look.
- **Assets**: 
  - Updated application icons to properly support macOS Dock styling (transparent rounded corners and full-size canvas).
  - Updated `favicon.png` to match the new app icon identity.
- **Documentation**: 
  - Rewrote `README.md` to reflect the transition to a Tauri-based desktop application architecture.

### Fixed
- **Sync**: 
  - Fixed `InvalidCharacterError` when encrypting non-Latin characters (UTF-8 support).
  - Fixed Gitee download failure caused by missing `filename` property in API response.
  - Fixed `syncConfig is not defined` error during initialization.
- **UI**: 
  - Fixed issue where "OK" button in confirmation dialogs would sometimes be unresponsive due to DOM loading order.
  - Fixed macOS application icon appearing too small in the Dock.
