/*
 * Blocked Details Page Script
 * Shows detailed list of all blocked ads and trackers
 */

let allBlockedHistory = [];
let filteredHistory = [];
const itemsPerPage = 50;
let currentPage = 1;

// Load blocked history on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Blocked Details] Page loaded');
    loadBlockedHistory();
    document.getElementById('filterInput').addEventListener('input', handleFilter);
});

function loadBlockedHistory() {
    console.log('[Blocked Details] Loading blocked history...');
    chrome.runtime.sendMessage({ action: 'getBlockedHistory' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Blocked Details] Error:', chrome.runtime.lastError);
            return;
        }

        console.log('[Blocked Details] Received data:', response);
        allBlockedHistory = response.blockedHistory || [];
        console.log('[Blocked Details] Total blocked:', allBlockedHistory.length);
        
        filteredHistory = [...allBlockedHistory];
        
        // Sort by timestamp (newest first)
        filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
        
        updateStats();
        displayBlockedItems();
    });
}

function updateStats() {
    // Total blocked
    document.getElementById('totalBlocked').textContent = allBlockedHistory.length;

    // Unique domains
    const uniqueDomains = new Set(allBlockedHistory.map(item => item.domain));
    document.getElementById('uniqueDomains').textContent = uniqueDomains.size;

    // Blocked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const blockedToday = allBlockedHistory.filter(item =>
        new Date(item.timestamp) >= today
    ).length;
    document.getElementById('blockedToday').textContent = blockedToday;

    // Trackers blocked (requests with tracking-related types)
    const trackers = allBlockedHistory.filter(item =>
        item.url.toLowerCase().includes('track') ||
        item.url.toLowerCase().includes('analytics') ||
        item.url.toLowerCase().includes('beacon') ||
        item.resourceType === 'ping'
    ).length;
    document.getElementById('trackersBlocked').textContent = trackers;
}

function handleFilter() {
    const filterValue = document.getElementById('filterInput').value.toLowerCase();
    
    if (!filterValue) {
        filteredHistory = [...allBlockedHistory];
    } else {
        filteredHistory = allBlockedHistory.filter(item =>
            item.domain.toLowerCase().includes(filterValue) ||
            item.url.toLowerCase().includes(filterValue)
        );
    }

    // Sort by timestamp (newest first)
    filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    currentPage = 1;
    displayBlockedItems();
}

function displayBlockedItems() {
    const container = document.getElementById('blockedList');

    if (filteredHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h2>No blocked ads found</h2>
                <p>${document.getElementById('filterInput').value ? 'Try a different search' : 'Visit a website to see blocked ads'}</p>
            </div>
        `;
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredHistory.length);
    const pageItems = filteredHistory.slice(startIndex, endIndex);

    // Build items HTML
    let html = pageItems.map((item, index) => {
        const url = new URL(item.url);
        const timeAgo = getTimeAgo(item.timestamp);
        const resourceType = item.resourceType || 'unknown';

        return `
            <div class="blocked-item">
                <div class="blocked-url">
                    <div class="blocked-domain">${escapeHtml(item.domain)}</div>
                    <div class="blocked-path">${escapeHtml(url.pathname || '/')}</div>
                </div>
                <div class="blocked-type">${escapeHtml(resourceType)}</div>
                <div class="blocked-time">${timeAgo}</div>
                <div class="blocked-remove" onclick="copyToClipboard('${escapeHtml(item.url)}', event)" title="Click to copy URL">📋</div>
            </div>
        `;
    }).join('');

    // Add pagination if needed
    if (totalPages > 1) {
        html += `<div class="pagination" id="pagination"></div>`;
    }

    container.innerHTML = html;

    // Add pagination buttons
    if (totalPages > 1) {
        const paginationContainer = document.getElementById('pagination');
        let paginationHtml = '';

        if (currentPage > 1) {
            paginationHtml += `<button onclick="goToPage(${currentPage - 1})">← Previous</button>`;
        }

        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            paginationHtml += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="goToPage(${currentPage + 1})">Next →</button>`;
        }

        paginationContainer.innerHTML = paginationHtml;
    }
}

function goToPage(page) {
    currentPage = page;
    displayBlockedItems();
    window.scrollTo(0, 0);
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function copyToClipboard(text, event) {
    try {
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const element = event.target;
            const originalText = element.textContent;
            element.textContent = '✓ Copied';
            setTimeout(() => {
                element.textContent = originalText;
            }, 2000);
        });
    } catch (error) {
        console.error('Failed to copy:', error);
    }
}

function clearAllHistory() {
    if (!confirm('Are you sure you want to clear the blocked ads history? This cannot be undone.')) {
        return;
    }

    chrome.runtime.sendMessage({ action: 'clearBlockedHistory' }, (response) => {
        if (response.success) {
            allBlockedHistory = [];
            filteredHistory = [];
            currentPage = 1;
            document.getElementById('filterInput').value = '';
            displayBlockedItems();
            updateStats();
        }
    });
}

function exportData() {
    if (filteredHistory.length === 0) {
        alert('No data to export');
        return;
    }

    // Prepare CSV data
    let csv = 'Domain,URL,Type,Timestamp,Time\n';
    filteredHistory.forEach(item => {
        const date = new Date(item.timestamp).toISOString();
        csv += `"${item.domain}","${item.url}","${item.resourceType}","${date}","${getTimeAgo(item.timestamp)}"\n`;
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blocked-ads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function goBack() {
    chrome.runtime.openOptionsPage();
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Auto-refresh blocked history every 2 seconds
setInterval(() => {
    loadBlockedHistory();
}, 2000);
