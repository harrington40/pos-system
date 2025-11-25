// AdBlocker Plus - Popup Script
// Handles popup UI interactions with advanced statistics

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupEventListeners();
    checkAdblockStatus();
});

function loadStats() {
    // Load blocked count and stats from storage
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[AdBlocker Plus] Error loading stats:', chrome.runtime.lastError);
            document.getElementById('blockedCount').textContent = '0';
            document.getElementById('savedTime').textContent = '0s';
            return;
        }
        const blockedCount = response?.blockedCount || 0;
        const sessionDuration = response?.sessionDuration || 0;
        const averagePerSecond = response?.averagePerSecond || 0;
        const mlStats = response?.mlStats || {};
        
        document.getElementById('blockedCount').textContent = blockedCount.toLocaleString();
        document.getElementById('savedTime').textContent = formatTime(sessionDuration);
        
        // Update ML stats if available
        const mlContainer = document.getElementById('mlStats');
        if (mlContainer && mlStats.mlBlocked !== undefined) {
            const mlPercent = blockedCount > 0 
                ? Math.round((mlStats.mlBlocked / blockedCount) * 100)
                : 0;
            mlContainer.textContent = `ML Blocked: ${mlStats.mlBlocked} (${mlPercent}%)`;
            mlContainer.style.display = 'block';
        }
    });
}

function formatTime(seconds) {
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    return hours + 'h';
}

function checkAdblockStatus() {
    // Check if adblock is enabled
    chrome.runtime.sendMessage({ action: 'isEnabled' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[AdBlocker Plus] Error checking status:', chrome.runtime.lastError);
            updateToggleUI(true); // Default to enabled
            return;
        }
        updateToggleUI(response?.enabled !== false);
    });
}

function setupEventListeners() {
    // Enable/Disable buttons
    document.getElementById('enableBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled: true }, () => {
            updateToggleUI(true);
        });
    });
    
    document.getElementById('disableBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled: false }, () => {
            updateToggleUI(false);
        });
    });
    
    // Details button
    const detailsBtn = document.getElementById('detailsBtn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', () => {
            console.log('[AdBlocker Plus Popup] Details button clicked');
            try {
                const url = chrome.runtime.getURL('src/popup/blocked-details.html');
                console.log('[AdBlocker Plus Popup] Opening URL:', url);
                chrome.tabs.create({ url: url }, (tab) => {
                    console.log('[AdBlocker Plus Popup] Tab created:', tab.id);
                });
            } catch (error) {
                console.error('[AdBlocker Plus Popup] Error opening details:', error);
                alert('Error opening blocked details. Try clicking the extension icon in toolbar instead.');
            }
        });
    } else {
        console.warn('[AdBlocker Plus Popup] Details button not found');
    }
    
    // Options button
    document.getElementById('optionsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Reset blocked ad count?')) {
            chrome.runtime.sendMessage({ action: 'resetBlockedCount' }, () => {
                chrome.storage.local.set({ blockedCount: 0, startTime: Date.now() });
                loadStats();
            });
        }
    });
}

function updateToggleUI(enabled) {
    const enableBtn = document.getElementById('enableBtn');
    const disableBtn = document.getElementById('disableBtn');
    
    if (enabled) {
        enableBtn.classList.add('active');
        enableBtn.classList.remove('inactive');
        disableBtn.classList.remove('active');
        disableBtn.classList.add('inactive');
    } else {
        enableBtn.classList.remove('active');
        enableBtn.classList.add('inactive');
        disableBtn.classList.add('active');
        disableBtn.classList.remove('inactive');
    }
}

// Refresh stats every second
setInterval(loadStats, 1000);
