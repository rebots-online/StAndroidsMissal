# Windows 11 x64 standalone attestation — v1.16.34594

- Artifact: `standroidsmissal-v1.16.34594-windows-x64-standalone.exe`.
- Cross-toolchain: Rust MSVC target through `cargo-xwin` 0.21.4 with the cached Microsoft CRT/SDK.
- Compile/link: successful Tauri release build.
- Binary format: PE32+ / `IMAGE_FILE_MACHINE_AMD64` / `IMAGE_SUBSYSTEM_WINDOWS_GUI`.
- Runtime imports include the expected Windows GUI/WebView support surface (`user32`, `gdi32`, `ole32`, `shell32`, `dwmapi`, `advapi32`, and Universal CRT API sets).
- SHA-256: `d59eaee1d6ddcb5ab6786f36b2579153e40a2ce9b9004204a2ce48d2adcc0e24`.

This is the verified standalone executable requested for Windows 11. NSIS is not claimed: Ubuntu NSIS 3.09 rejected Tauri's generated `NSISCOMCALL` macro, so installer packaging remains a matching-Windows-host step rather than weakening the successful PE handback.
