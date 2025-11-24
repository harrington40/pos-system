# Chrome Extension Build Configuration

project(AdBlockPro-Chrome)

set(CHROME_MANIFEST "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json")
set(CHROME_DIST "${CMAKE_BINARY_DIR}/chrome")

# Create Chrome distribution directory
file(MAKE_DIRECTORY "${CHROME_DIST}")

# Copy extension files for Chrome
add_custom_target(chrome-build
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CMAKE_SOURCE_DIR}/extension/dist"
            "${CHROME_DIST}"
    COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json"
            "${CHROME_DIST}/manifest.json"
    COMMAND ${CMAKE_COMMAND} -E echo "Chrome extension built successfully"
    COMMENT "Building Chrome extension..."
)

# Chrome Manifest V3 (Manifest V2 deprecated)
file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json" "
{
  \"manifest_version\": 3,
  \"name\": \"AdBlock Pro - AI-Powered\",
  \"version\": \"1.0.0\",
  \"description\": \"Privacy-first ad blocker for Chrome\",
  \"minimum_chrome_version\": \"88\",
  \"permissions\": [
    \"storage\",
    \"tabs\",
    \"scripting\",
    \"webNavigation\",
    \"declarativeNetRequest\",
    \"declarativeNetRequestFeedback\"
  ],
  \"host_permissions\": [
    \"<all_urls>\"
  ],
  \"background\": {
    \"service_worker\": \"src/background/service-worker.js\",
    \"type\": \"module\"
  },
  \"content_scripts\": [
    {
      \"matches\": [\"<all_urls>\"],
      \"js\": [\"src/content/injector.js\"],
      \"run_at\": \"document_start\",
      \"all_frames\": true
    }
  ],
  \"action\": {
    \"default_popup\": \"src/popup/popup.html\",
    \"default_title\": \"AdBlock Pro\"
  },
  \"options_page\": \"src/options/options.html\",
  \"icons\": {
    \"16\": \"src/assets/icons/icon-16.png\",
    \"48\": \"src/assets/icons/icon-48.png\",
    \"128\": \"src/assets/icons/icon-128.png\"
  }
}
")

message(STATUS "Chrome extension configuration ready")
