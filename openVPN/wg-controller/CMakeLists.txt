cmake_minimum_required(VERSION 3.20)
project(wg-daemon VERSION 1.0.0 LANGUAGES Rust)

# Get the Rust target from parent CMake
if(NOT RUST_TARGET)
    if(WIN32)
        set(RUST_TARGET "x86_64-pc-windows-gnu")
    elseif(APPLE)
        set(RUST_TARGET "aarch64-apple-darwin")
    else()
        set(RUST_TARGET "x86_64-unknown-linux-gnu")
    endif()
endif()

# Set Rust flags based on build type
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(RUST_FLAGS "--release")
    set(BUILD_DIR "release")
else()
    set(RUST_FLAGS "")
    set(BUILD_DIR "debug")
endif()

# Get Cargo manifest directory
get_filename_component(CARGO_MANIFEST_DIR "${CMAKE_CURRENT_SOURCE_DIR}" ABSOLUTE)

# Output binary path
set(DAEMON_OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/target/${BUILD_DIR}/wg-daemon${CMAKE_EXECUTABLE_SUFFIX}")

# Custom target for building with Cargo
add_custom_target(wg-daemon ALL
    COMMAND ${CMAKE_COMMAND} -E env RUSTFLAGS="${RUSTFLAGS}" 
            ${CARGO} build ${RUST_FLAGS} --target ${RUST_TARGET}
    WORKING_DIRECTORY ${CARGO_MANIFEST_DIR}
    BYPRODUCTS ${DAEMON_OUTPUT}
    COMMENT "Building WireGuard daemon with Cargo..."
)

# Install the binary
install(
    FILES ${DAEMON_OUTPUT}
    DESTINATION bin
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE
    COMPONENT daemon
)

# Install configuration files
install(
    FILES ${CMAKE_CURRENT_SOURCE_DIR}/config.toml
    DESTINATION etc/wireguard-vpn
    COMPONENT config
)

# Install systemd service file (Linux only)
if(UNIX AND NOT APPLE)
    install(
        FILES ${CMAKE_CURRENT_SOURCE_DIR}/../wireguard-indicator.service
        DESTINATION lib/systemd/system
        COMPONENT systemd
        OPTIONAL
    )
endif()

message(STATUS "Rust daemon target: ${RUST_TARGET}")
message(STATUS "Rust build flags: ${RUST_FLAGS}")
message(STATUS "Daemon output: ${DAEMON_OUTPUT}")
