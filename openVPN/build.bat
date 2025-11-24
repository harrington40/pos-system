@echo off
REM Multi-architecture build script for WireGuard VPN Manager (Windows)
REM Supports: x86_64, aarch64

setlocal enabledelayedexpansion

REM Set variables
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%
set BUILD_DIR=%PROJECT_ROOT%build
set DIST_DIR=%PROJECT_ROOT%dist

REM Colors (using color escape codes)
set GREEN=[92m
set BLUE=[94m
set YELLOW=[93m
set RED=[91m
set NC=[0m

REM Check prerequisites
echo.
echo Checking prerequisites...
where cmake >nul 2>nul || (
    echo ERROR: cmake not found. Please install CMake.
    exit /b 1
)

where cargo >nul 2>nul || (
    echo ERROR: cargo not found. Please install Rust.
    exit /b 1
)

echo Prerequisites OK

REM Detect architecture
for /f "tokens=*" %%A in ('wmic os get osarchitecture /format:value') do set ARCH=%%A
if "%ARCH%"=="64-bit" (
    set DETECTED_ARCH=x86_64
) else if "%ARCH%"=="32-bit" (
    set DETECTED_ARCH=i686
) else (
    set DETECTED_ARCH=x86_64
)

echo Detected architecture: %DETECTED_ARCH%

REM Parse arguments
set BUILD_CURRENT=false
set BUILD_PLATFORM=windows
set BUILD_ARCH=%DETECTED_ARCH%
set CREATE_DIST=false
set CLEAN=false

:parse_args
if "%1"=="" goto end_parse
if "%1"=="--current" (
    set BUILD_CURRENT=true
    shift
    goto parse_args
)
if "%1"=="--x64" (
    set BUILD_ARCH=x86_64
    shift
    goto parse_args
)
if "%1"=="--arm64" (
    set BUILD_ARCH=aarch64
    shift
    goto parse_args
)
if "%1"=="--dist" (
    set CREATE_DIST=true
    shift
    goto parse_args
)
if "%1"=="--clean" (
    set CLEAN=true
    shift
    goto parse_args
)
if "%1"=="--help" (
    goto show_help
)
shift
goto parse_args

:end_parse

REM Clean if requested
if "%CLEAN%"=="true" (
    echo Cleaning build directories...
    rmdir /s /q "%BUILD_DIR%" 2>nul
    echo Clean complete
    exit /b 0
)

REM Build function
if "%BUILD_CURRENT%"=="true" (
    call :build_single "%BUILD_PLATFORM%" "%BUILD_ARCH%"
) else (
    call :build_single "%BUILD_PLATFORM%" "x86_64"
    call :build_single "%BUILD_PLATFORM%" "aarch64"
)

if "%CREATE_DIST%"=="true" (
    call :prepare_dist
)

echo Build complete!
exit /b 0

:build_single
setlocal
set PLATFORM=%~1
set ARCH=%~2
set BUILD_FOLDER=%BUILD_DIR%\%PLATFORM%-%ARCH%

echo.
echo Building for %PLATFORM%-%ARCH%...

if "%ARCH%"=="x86_64" (
    set RUST_TARGET=x86_64-pc-windows-gnu
) else if "%ARCH%"=="aarch64" (
    set RUST_TARGET=aarch64-pc-windows-gnu
) else (
    set RUST_TARGET=x86_64-pc-windows-gnu
)

echo Rust target: %RUST_TARGET%

mkdir "%BUILD_FOLDER%" 2>nul

cd /d "%BUILD_FOLDER%"

REM Run CMake
echo Running CMake...
cmake ^
    -G "Unix Makefiles" ^
    -DCMAKE_BUILD_TYPE=Release ^
    -DCMAKE_SYSTEM_NAME=Windows ^
    -DCMAKE_SYSTEM_PROCESSOR=%ARCH% ^
    -DRUST_TARGET=%RUST_TARGET% ^
    "%PROJECT_ROOT%"

if errorlevel 1 (
    echo ERROR: CMake configuration failed
    exit /b 1
)

REM Build
echo Building project...
cmake --build . --config Release

if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)

REM Create installer
cpack -C Release 2>nul
if errorlevel 0 (
    echo Installer created for %PLATFORM%-%ARCH%
)

echo Build completed for %PLATFORM%-%ARCH%
cd /d "%PROJECT_ROOT%"
endlocal
exit /b 0

:prepare_dist
setlocal
echo.
echo Preparing distribution directory...
mkdir "%DIST_DIR%" 2>nul

REM Copy installers (simplified - adjust paths as needed)
for /r "%BUILD_DIR%" %%F in (*.exe *.msi *.zip) do (
    copy "%%F" "%DIST_DIR%\" >nul 2>&1
)

echo Distribution files ready in: %DIST_DIR%
endlocal
exit /b 0

:show_help
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   --current    Build for current architecture only
echo   --x64        Build for x86_64 architecture
echo   --arm64      Build for aarch64 architecture
echo   --dist       Create distribution directory
echo   --clean      Clean build directories
echo   --help       Show this help message
echo.
echo Examples:
echo   %0 --current
echo   %0 --x64 --dist
echo   %0 --clean
exit /b 0
