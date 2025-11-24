cmake_minimum_required(VERSION 3.20)
project(WireGuard-VPN-Manager VERSION 1.0.0 LANGUAGES Rust)

# Set C++ standard for any C++ components
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Architecture: ${CMAKE_SYSTEM_PROCESSOR}")

# Detect OS
if(WIN32)
    set(PLATFORM_NAME "windows")
    set(EXECUTABLE_SUFFIX ".exe")
elseif(APPLE)
    set(PLATFORM_NAME "macos")
    set(EXECUTABLE_SUFFIX "")
elseif(UNIX AND NOT APPLE)
    set(PLATFORM_NAME "linux")
    set(EXECUTABLE_SUFFIX "")
endif()

message(STATUS "Platform: ${PLATFORM_NAME}")

# Architecture mapping
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64" OR CMAKE_SYSTEM_PROCESSOR MATCHES "AMD64")
    set(ARCH "x86_64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch64" OR CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
    set(ARCH "aarch64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "armv7" OR CMAKE_SYSTEM_PROCESSOR MATCHES "armv7l")
    set(ARCH "armv7")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "i686" OR CMAKE_SYSTEM_PROCESSOR MATCHES "i386")
    set(ARCH "i686")
else()
    set(ARCH ${CMAKE_SYSTEM_PROCESSOR})
endif()

message(STATUS "Detected Architecture: ${ARCH}")

# Rust target mapping
if(WIN32)
    if(ARCH MATCHES "x86_64")
        set(RUST_TARGET "x86_64-pc-windows-gnu")
    elseif(ARCH MATCHES "aarch64")
        set(RUST_TARGET "aarch64-pc-windows-gnu")
    endif()
elseif(APPLE)
    if(ARCH MATCHES "x86_64")
        set(RUST_TARGET "x86_64-apple-darwin")
    elseif(ARCH MATCHES "aarch64")
        set(RUST_TARGET "aarch64-apple-darwin")
    endif()
elseif(UNIX AND NOT APPLE)
    if(ARCH MATCHES "x86_64")
        set(RUST_TARGET "x86_64-unknown-linux-gnu")
    elseif(ARCH MATCHES "aarch64")
        set(RUST_TARGET "aarch64-unknown-linux-gnu")
    elseif(ARCH MATCHES "armv7")
        set(RUST_TARGET "armv7-unknown-linux-gnueabihf")
    endif()
endif()

message(STATUS "Rust Target: ${RUST_TARGET}")

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Find required tools
find_program(CARGO cargo REQUIRED)
find_program(RUSTC rustc REQUIRED)

message(STATUS "Cargo: ${CARGO}")
message(STATUS "Rustc: ${RUSTC}")

# Add Rust subdirectory
add_subdirectory(wg-controller)

# Add Flutter UI subdirectory (optional)
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/wg-ui-flutter/CMakeLists.txt")
    add_subdirectory(wg-ui-flutter EXCLUDE_FROM_ALL)
endif()

# CPack configuration for creating installers
include(InstallRequiredSystemLibraries)

set(CPACK_PACKAGE_NAME "WireGuard-VPN-Manager")
set(CPACK_PACKAGE_VENDOR "OpenVPN")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "WireGuard VPN Management System")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_VERSION_MAJOR 1)
set(CPACK_PACKAGE_VERSION_MINOR 0)
set(CPACK_PACKAGE_VERSION_PATCH 0)

# Platform-specific installer configurations
if(WIN32)
    # Windows NSIS installer
    set(CPACK_GENERATOR "NSIS;ZIP;WIX")
    set(CPACK_NSIS_DISPLAY_NAME "WireGuard VPN Manager")
    set(CPACK_NSIS_INSTALL_ROOT "C:\\Program Files")
    set(CPACK_NSIS_MUI_ICON "${CMAKE_CURRENT_SOURCE_DIR}/assets/icon.ico")
    set(CPACK_NSIS_MUI_HEADERIMAGE "${CMAKE_CURRENT_SOURCE_DIR}/assets/header.bmp")
    set(CPACK_NSIS_MUI_WELCOMEFINISHPAGE_BITMAP "${CMAKE_CURRENT_SOURCE_DIR}/assets/wizard.bmp")
    set(CPACK_NSIS_CREATE_ICONS_EXTRA "CreateDirectory '\\\"$SMPROGRAMS\\\\$STARTMENU_FOLDER\\\"'
      CreateShortCut '\\\"$SMPROGRAMS\\\\$STARTMENU_FOLDER\\\\WireGuard VPN Manager.lnk\\\" \\\"$INSTDIR\\\\bin\\\\wg-daemon.exe\\\"'")
    
    # WiX configuration (advanced MSI)
    set(CPACK_WIX_UPGRADE_GUID "12345678-1234-1234-1234-123456789012")
    set(CPACK_WIX_PRODUCT_ICON "${CMAKE_CURRENT_SOURCE_DIR}/assets/icon.ico")
    
    # ZIP archive
    set(CPACK_ARCHIVE_COMPONENT_INSTALL ON)
    
elseif(APPLE)
    # macOS installers
    set(CPACK_GENERATOR "DragNDrop;ZIP;TGZ")
    set(CPACK_DMG_BACKGROUND_IMAGE "${CMAKE_CURRENT_SOURCE_DIR}/assets/dmg-background.png")
    set(CPACK_DMG_WINDOW_GEOMETRY "400x480")
    set(CPACK_PACKAGE_ICON "${CMAKE_CURRENT_SOURCE_DIR}/assets/icon.icns")
    
elseif(UNIX)
    # Linux installers
    set(CPACK_GENERATOR "DEB;RPM;TGZ;TBZ2")
    
    # Debian package configuration
    set(CPACK_DEBIAN_PACKAGE_MAINTAINER "OpenVPN Contributors")
    set(CPACK_DEBIAN_PACKAGE_DESCRIPTION "WireGuard VPN Management System with Web Dashboard")
    set(CPACK_DEBIAN_PACKAGE_DEPENDS "libc6, libssl3, wireguard")
    set(CPACK_DEBIAN_PACKAGE_SECTION "net")
    set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
    set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "https://github.com/your-org/wireguard-vpn")
    
    # RPM package configuration
    set(CPACK_RPM_PACKAGE_DESCRIPTION "WireGuard VPN Management System with Web Dashboard")
    set(CPACK_RPM_PACKAGE_LICENSE "GPL-2.0")
    set(CPACK_RPM_PACKAGE_GROUP "System/Network")
    set(CPACK_RPM_PACKAGE_REQUIRES "openssl, wireguard-tools")
    set(CPACK_RPM_PACKAGE_URL "https://github.com/your-org/wireguard-vpn")

endif()

# Common package settings
set(CPACK_PACKAGE_FILE_NAME "${CPACK_PACKAGE_NAME}-${PROJECT_VERSION}-${PLATFORM_NAME}-${ARCH}")
set(CPACK_STRIP_FILES ON)
set(CPACK_PACKAGE_CONTACT "support@openvpn.org")
set(CPACK_PACKAGE_HOMEPAGE_URL "https://github.com/your-org/wireguard-vpn")

# Set resource files
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE")
set(CPACK_RESOURCE_FILE_README "${CMAKE_CURRENT_SOURCE_DIR}/README.md")

include(CPack)

# Print build summary
message(STATUS "")
message(STATUS "==== WireGuard VPN Manager Build Summary ====")
message(STATUS "Version: ${PROJECT_VERSION}")
message(STATUS "Platform: ${PLATFORM_NAME}")
message(STATUS "Architecture: ${ARCH}")
message(STATUS "Rust Target: ${RUST_TARGET}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Generators: ${CPACK_GENERATOR}")
message(STATUS "Install Prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "==========================================")
message(STATUS "")
message(STATUS "Build with: cmake --build . --config ${CMAKE_BUILD_TYPE}")
message(STATUS "Install with: cmake --install . --prefix <install-dir>")
message(STATUS "Create package with: cpack -C ${CMAKE_BUILD_TYPE}")
message(STATUS "")
