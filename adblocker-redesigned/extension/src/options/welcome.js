/*
 * AdBlocker Plus - Welcome Page Script
 * 
 * Copyright (c) 2025 AdBlocker Plus Contributors
 */

// Setup event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const optionsBtn = document.getElementById('optionsBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (optionsBtn) {
        optionsBtn.addEventListener('click', function() {
            try {
                // Try to open options page
                if (chrome.runtime.openOptionsPage) {
                    chrome.runtime.openOptionsPage().catch(err => {
                        console.error('Error opening options:', err);
                        // Fallback: open options manually
                        const optionsUrl = chrome.runtime.getURL('src/options/options.html');
                        chrome.tabs.create({ url: optionsUrl });
                    });
                } else {
                    // Fallback for older Chrome versions
                    const optionsUrl = chrome.runtime.getURL('src/options/options.html');
                    chrome.tabs.create({ url: optionsUrl });
                }
            } catch (error) {
                console.error('[AdBlocker Plus] Error:', error);
                alert('Could not open settings. Please try clicking the extension icon and selecting Options.');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            window.close();
        });
    }

    console.log('[AdBlocker Plus] Welcome page loaded and ready');
});
