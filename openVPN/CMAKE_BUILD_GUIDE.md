# CMake Build & Distribution Guide

This guide explains how to build and create installers for WireGuard VPN Manager across different platforms and architectures.

## Prerequisites

### All Platforms
- CMake 3.20+
- Rust 1.70+
- Cargo

### Linux
```bash
sudo apt-get install cmake cargo rustc build-essential
# For DEB packages
sudo apt-get install dpkg-dev
# For RPM packages
sudo apt-get install rpm
```

### macOS
```bash
brew install cmake rust
# For creating DMG installers
# Xcode Command Line Tools should be installed
xcode-select --install
```

### Windows
- CMake: Download from https://cmake.org/download/
- Rust: Download from https://rustup.rs/
- For NSIS installers: Download NSIS from https://nsis.sourceforge.io/
- For WiX installers: Download WiX Toolset from https://wixtoolset.org/

## Building from Source

### Quick Start (Current Platform Only)

**Linux/macOS:**
```bash
chmod +x build.sh
./build.sh --current
```

**Windows:**
```bash
build.bat --current
```

### Build Options

**Linux/macOS:**
```bash
./build.sh [OPTIONS]

Options:
  -p, --platform PLATFORM    Build for specific platform (linux, macos, windows)
  -a, --arch ARCH            Build for specific architecture (x86_64, aarch64, armv7)
  -c, --current              Build for current platform and architecture
  -A, --all                  Build for all platforms and architectures
  -d, --dist                 Create distribution directory
  -C, --clean                Clean build directories
  -h, --help                 Show help message

Examples:
  ./build.sh --current
  ./build.sh --platform linux --arch x86_64
  ./build.sh --all --dist
```

**Windows:**
```bash
build.bat [OPTIONS]

Options:
  --current    Build for current architecture only
  --x64        Build for x86_64 architecture
  --arm64      Build for aarch64 architecture
  --dist       Create distribution directory
  --clean      Clean build directories
  --help       Show help message

Examples:
  build.bat --current
  build.bat --x64 --dist
```

## Manual CMake Build

If you prefer to use CMake directly:

### Linux x86_64
```bash
mkdir -p build/linux-x86_64
cd build/linux-x86_64
cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=x86_64 \
  -DRUST_TARGET=x86_64-unknown-linux-gnu \
  ../..
cmake --build . --config Release
cpack -C Release
```

### Linux ARM64 (aarch64)
```bash
mkdir -p build/linux-aarch64
cd build/linux-aarch64
cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=aarch64 \
  -DRUST_TARGET=aarch64-unknown-linux-gnu \
  ../..
cmake --build . --config Release
cpack -C Release
```

### Linux ARM (armv7)
```bash
mkdir -p build/linux-armv7
cd build/linux-armv7
cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=armv7 \
  -DRUST_TARGET=armv7-unknown-linux-gnueabihf \
  ../..
cmake --build . --config Release
cpack -C Release
```

### macOS Intel (x86_64)
```bash
mkdir -p build/macos-x86_64
cd build/macos-x86_64
cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Darwin \
  -DCMAKE_SYSTEM_PROCESSOR=x86_64 \
  -DRUST_TARGET=x86_64-apple-darwin \
  ../..
cmake --build . --config Release
cpack -C Release
```

### macOS Apple Silicon (aarch64)
```bash
mkdir -p build/macos-aarch64
cd build/macos-aarch64
cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Darwin \
  -DCMAKE_SYSTEM_PROCESSOR=aarch64 \
  -DRUST_TARGET=aarch64-apple-darwin \
  ../..
cmake --build . --config Release
cpack -C Release
```

### Windows x86_64
```bash
mkdir build\windows-x86_64
cd build\windows-x86_64
cmake ^
  -DCMAKE_BUILD_TYPE=Release ^
  -DCMAKE_SYSTEM_NAME=Windows ^
  -DCMAKE_SYSTEM_PROCESSOR=x86_64 ^
  -DRUST_TARGET=x86_64-pc-windows-gnu ^
  ..\..
cmake --build . --config Release
cpack -C Release
```

## Supported Architectures

| Platform | Architectures | Installers |
|----------|--------------|-----------|
| Linux | x86_64, aarch64, armv7 | .deb, .rpm, .tar.gz, .tar.bz2 |
| macOS | x86_64, aarch64 | .dmg, .zip, .tar.gz |
| Windows | x86_64, aarch64 | .exe (NSIS), .msi (WiX), .zip |

## Output Locations

- **Build artifacts**: `build/<platform>-<arch>/`
- **Binaries**: `build/<platform>-<arch>/bin/`
- **Installers**: `build/<platform>-<arch>/` (various formats)
- **Distribution**: `dist/` (when using `--dist` flag)

## Installer Details

### Linux Packages

**DEB (Debian/Ubuntu)**
- Maintainer: OpenVPN Contributors
- Depends: libc6, libssl3, wireguard
- Section: net
- Installs to: `/usr/bin/wg-daemon`, `/etc/wireguard-vpn/config.toml`

**RPM (CentOS/Fedora/RHEL)**
- License: GPL-2.0
- Depends: openssl, wireguard-tools
- Group: System/Network
- Installs to: `/usr/bin/wg-daemon`, `/etc/wireguard-vpn/config.toml`

### macOS Packages

**DMG (Disk Image)**
- Universal binary (Intel + Apple Silicon)
- Drag & drop installation
- Includes: Daemon, Web UI, Configuration

**ZIP Archive**
- Portable distribution
- No installation required
- Can be run from any directory

### Windows Packages

**NSIS Installer (.exe)**
- GUI installer
- Start menu shortcuts
- Uninstall support
- Registry entries

**WiX Installer (.msi)**
- Microsoft installer format
- Windows Update compatible
- Enterprise deployment ready
- Group Policy support

**ZIP Archive**
- Portable installation
- No registry modifications
- Suitable for USB distribution

## Installation

### Linux
```bash
# DEB
sudo dpkg -i WireGuard-VPN-Manager-1.0.0-linux-x86_64.deb

# RPM
sudo rpm -ivh WireGuard-VPN-Manager-1.0.0-linux-x86_64.rpm

# TAR.GZ
tar xzf WireGuard-VPN-Manager-1.0.0-linux-x86_64.tar.gz
sudo ./install.sh
```

### macOS
```bash
# DMG - Mount and drag WireGuard VPN Manager.app to Applications
hdiutil attach WireGuard-VPN-Manager-1.0.0-macos-x86_64.dmg

# ZIP
unzip WireGuard-VPN-Manager-1.0.0-macos-x86_64.zip
mv "WireGuard VPN Manager.app" /Applications/
```

### Windows
```bash
# EXE - Double-click installer
WireGuard-VPN-Manager-1.0.0-windows-x86_64.exe

# ZIP - Extract and run
# Or use with installers for unattended installation:
WireGuard-VPN-Manager-1.0.0-windows-x86_64.exe /S /D=C:\Program Files\WireGuard VPN Manager
```

## Cross-Compilation

### Building Linux ARM64 on x86_64

Install ARM64 toolchain:
```bash
sudo apt-get install gcc-aarch64-linux-gnu binutils-aarch64-linux-gnu

# Install Rust ARM64 target
rustup target add aarch64-unknown-linux-gnu
```

Then build:
```bash
./build.sh --platform linux --arch aarch64
```

### Building Linux ARM32 (armv7) on x86_64

Install ARM toolchain:
```bash
sudo apt-get install gcc-arm-linux-gnueabihf binutils-arm-linux-gnueabihf libc6-dev-armhf-cross

# Install Rust ARMv7 target
rustup target add armv7-unknown-linux-gnueabihf
```

Then build:
```bash
./build.sh --platform linux --arch armv7
```

### Building macOS on Linux

This requires additional setup and is not recommended. Use native macOS for macOS builds.

## Troubleshooting

### CMake not found
```bash
# Add CMake to PATH or install it
sudo apt-get install cmake  # Linux
brew install cmake           # macOS
# Windows: Download from https://cmake.org/download/
```

### Rust target not installed
```bash
rustup target add x86_64-unknown-linux-gnu
rustup target add aarch64-unknown-linux-gnu
rustup target add armv7-unknown-linux-gnueabihf
```

### Cargo build fails
```bash
# Update Rust
rustup update

# Clear cache
cargo clean

# Try building again
./build.sh --current
```

### Permission denied on Linux
```bash
chmod +x build.sh
./build.sh --current
```

## Advanced Configuration

### Custom Install Prefix

```bash
cmake -DCMAKE_INSTALL_PREFIX=/custom/path ..
```

### Disable Package Creation

```bash
cmake -DCPACK_GENERATOR="" ..
```

### Build with Debug Symbols

```bash
cmake -DCMAKE_BUILD_TYPE=Debug ..
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Multi-Architecture Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            platform: linux
            arch: x86_64
          - os: ubuntu-latest
            platform: linux
            arch: aarch64
          - os: macos-latest
            platform: macos
            arch: x86_64
          - os: macos-latest
            platform: macos
            arch: aarch64
          - os: windows-latest
            platform: windows
            arch: x86_64

    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          # Install CMake and Rust
          # Platform-specific commands
      
      - name: Build
        run: |
          if [ "$RUNNER_OS" == "Windows" ]; then
            build.bat --current
          else
            chmod +x build.sh
            ./build.sh --current
          fi
        shell: bash
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: builds-${{ matrix.platform }}-${{ matrix.arch }}
          path: build/${{ matrix.platform }}-${{ matrix.arch }}
```

## Support

For issues or questions, please visit:
- GitHub Issues: https://github.com/your-org/wireguard-vpn/issues
- Documentation: https://github.com/your-org/wireguard-vpn/wiki
