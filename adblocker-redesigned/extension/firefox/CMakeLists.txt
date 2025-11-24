# Firefox Addon Build Configuration

project(AdBlockPro-Firefox)

set(FIREFOX_MANIFEST "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json")
set(FIREFOX_DIST "${CMAKE_BINARY_DIR}/firefox")

# Create Firefox distribution directory
file(MAKE_DIRECTORY "${FIREFOX_DIST}")

# Copy extension files for Firefox
add_custom_target(firefox-build
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CMAKE_SOURCE_DIR}/extension/dist"
            "${FIREFOX_DIST}"
    COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json"
            "${FIREFOX_DIST}/manifest.json"
    COMMAND ${CMAKE_COMMAND} -E echo "Firefox addon built successfully"
    COMMENT "Building Firefox addon..."
)

# Firefox Manifest V3 (WebExtensions API)
file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/manifest.json" "
{
  \"manifest_version\": 3,
  \"name\": \"AdBlock Pro - AI-Powered\",
  \"version\": \"1.0.0\",
  \"description\": \"Privacy-first ad blocker for Firefox\",
  \"browser_specific_settings\": {
    \"gecko\": {
      \"id\": \"adblockpro@privacy.local\",
      \"strict_min_version\": \"78.0\"
    }
  },
  \"permissions\": [
    \"storage\",
    \"tabs\",
    \"webRequest\",
    \"webRequestBlocking\",
    \"webNavigation\"
  ],
  \"host_permissions\": [
    \"<all_urls>\"
  ],
  \"background\": {
    \"scripts\": [\"src/background/background.js\"]
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
  \"options_ui\": {
    \"page\": \"src/options/options.html\",
    \"open_in_tab\": false
  },
  \"icons\": {
    \"16\": \"src/assets/icons/icon-16.png\",
    \"48\": \"src/assets/icons/icon-48.png\",
    \"96\": \"src/assets/icons/icon-128.png\"
  }
}
")

message(STATUS "Firefox addon configuration ready")
