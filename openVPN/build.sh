#!/bin/bash

# Multi-architecture build script for WireGuard VPN Manager
# Supports: Windows, macOS, Linux on x86_64, aarch64, armv7

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
BUILD_DIR="${PROJECT_ROOT}/build"
DIST_DIR="${PROJECT_ROOT}/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Detect platform
detect_platform() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Detect architecture
detect_arch() {
    local arch=$(uname -m)
    case "$arch" in
        x86_64|amd64) echo "x86_64" ;;
        aarch64|arm64) echo "aarch64" ;;
        armv7l|armv7) echo "armv7" ;;
        i686|i386) echo "i686" ;;
        *) echo "$arch" ;;
    esac
}

# Map architecture to Rust target
map_rust_target() {
    local platform=$1
    local arch=$2
    
    case "${platform}-${arch}" in
        linux-x86_64) echo "x86_64-unknown-linux-gnu" ;;
        linux-aarch64) echo "aarch64-unknown-linux-gnu" ;;
        linux-armv7) echo "armv7-unknown-linux-gnueabihf" ;;
        macos-x86_64) echo "x86_64-apple-darwin" ;;
        macos-aarch64) echo "aarch64-apple-darwin" ;;
        windows-x86_64) echo "x86_64-pc-windows-gnu" ;;
        windows-aarch64) echo "aarch64-pc-windows-gnu" ;;
        *) echo "unknown" ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v cmake &> /dev/null; then
        missing_tools+=("cmake")
    fi
    
    if ! command -v cargo &> /dev/null; then
        missing_tools+=("cargo/rust")
    fi
    
    if ! command -v cpack &> /dev/null; then
        print_warning "cpack not found - installers will not be created"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    print_success "All prerequisites met"
    return 0
}

# Build for single architecture
build_single() {
    local platform=$1
    local arch=$2
    local rust_target=$3
    
    local build_folder="${BUILD_DIR}/${platform}-${arch}"
    
    print_info "Building for ${platform}-${arch} (${rust_target})..."
    
    mkdir -p "$build_folder"
    cd "$build_folder"
    
    # Run CMake
    cmake \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_SYSTEM_NAME=$(echo "$platform" | tr '[:lower:]' '[:upper:]') \
        -DCMAKE_SYSTEM_PROCESSOR="$arch" \
        -DRUST_TARGET="$rust_target" \
        "${PROJECT_ROOT}"
    
    # Build
    cmake --build . --config Release
    
    # Create installer
    if command -v cpack &> /dev/null; then
        cpack -C Release
        print_success "Installer created for ${platform}-${arch}"
    else
        print_warning "cpack not available, skipping installer"
    fi
    
    print_success "Build completed for ${platform}-${arch}"
}

# Build all architectures for current platform
build_all() {
    local platform=$1
    
    print_info "Building all architectures for ${platform}..."
    
    case "$platform" in
        linux)
            build_single "linux" "x86_64" "x86_64-unknown-linux-gnu"
            build_single "linux" "aarch64" "aarch64-unknown-linux-gnu"
            build_single "linux" "armv7" "armv7-unknown-linux-gnueabihf"
            ;;
        macos)
            build_single "macos" "x86_64" "x86_64-apple-darwin"
            build_single "macos" "aarch64" "aarch64-apple-darwin"
            ;;
        windows)
            build_single "windows" "x86_64" "x86_64-pc-windows-gnu"
            build_single "windows" "aarch64" "aarch64-pc-windows-gnu"
            ;;
        *)
            print_error "Unknown platform: $platform"
            return 1
            ;;
    esac
}

# Create distribution directory
prepare_dist() {
    print_info "Preparing distribution directory..."
    
    mkdir -p "$DIST_DIR"
    
    # Copy all built installers
    if [ -d "$BUILD_DIR" ]; then
        find "$BUILD_DIR" -name "*.exe" -o -name "*.msi" -o -name "*.deb" -o -name "*.rpm" -o -name "*.dmg" -o -name "*.zip" -o -name "*.tar.gz" | while read -r file; do
            cp "$file" "$DIST_DIR/"
        done
    fi
    
    print_success "Distribution files ready in: $DIST_DIR"
}

# Display help
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -p, --platform PLATFORM    Build for specific platform (linux, macos, windows)
    -a, --arch ARCH            Build for specific architecture (x86_64, aarch64, armv7)
    -c, --current              Build for current platform and architecture
    -A, --all                  Build for all platforms and architectures
    -d, --dist                 Create distribution directory
    -C, --clean                Clean build directories
    -h, --help                 Show this help message

Examples:
    # Build for current platform
    $0 --current
    
    # Build for all architectures on Linux
    $0 --platform linux --all
    
    # Build for specific combination
    $0 --platform linux --arch x86_64
    
    # Full build and create distribution
    $0 --all --dist

EOF
}

# Main
main() {
    local platform=$(detect_platform)
    local arch=$(detect_arch)
    local build_current=false
    local build_all_flag=false
    local create_dist=false
    local clean=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--platform)
                platform="$2"
                shift 2
                ;;
            -a|--arch)
                arch="$2"
                shift 2
                ;;
            -c|--current)
                build_current=true
                shift
                ;;
            -A|--all)
                build_all_flag=true
                shift
                ;;
            -d|--dist)
                create_dist=true
                shift
                ;;
            -C|--clean)
                clean=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Clean if requested
    if [ "$clean" = true ]; then
        print_info "Cleaning build directories..."
        rm -rf "$BUILD_DIR"
        print_success "Clean complete"
        exit 0
    fi
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi
    
    # Build
    if [ "$build_all_flag" = true ]; then
        build_all "$platform"
    elif [ "$build_current" = true ]; then
        local rust_target=$(map_rust_target "$platform" "$arch")
        build_single "$platform" "$arch" "$rust_target"
    else
        local rust_target=$(map_rust_target "$platform" "$arch")
        if [ "$rust_target" = "unknown" ]; then
            print_error "Unsupported platform-architecture combination: ${platform}-${arch}"
            exit 1
        fi
        build_single "$platform" "$arch" "$rust_target"
    fi
    
    # Create distribution
    if [ "$create_dist" = true ]; then
        prepare_dist
    fi
    
    print_success "Build complete!"
}

main "$@"
