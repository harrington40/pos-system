/*
 * AdBlocker Plus - Options Page Logic
 * 
 * Copyright (c) 2025 AdBlocker Plus Contributors
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Load all settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadCustomLists();
  await loadWhitelist();
  await loadCustomDomains();
  await updateBlockedCount();
  
  // Load saved settings
  const settings = await chrome.storage.sync.get([
    'blockTrackers',
    'blockAnalytics',
    'blockFonts',
    'enableLogging'
  ]);
  
  document.getElementById('blockTrackers').checked = settings.blockTrackers !== false;
  document.getElementById('blockAnalytics').checked = settings.blockAnalytics !== false;
  document.getElementById('blockFonts').checked = settings.blockFonts === true;
  document.getElementById('enableLogging').checked = settings.enableLogging === true;
});

// Load custom filter lists
async function loadCustomLists() {
  const stored = await chrome.storage.sync.get('customLists');
  const lists = stored.customLists || [];
  
  const container = document.getElementById('customListsContainer');
  container.innerHTML = '';
  
  if (lists.length === 0) {
    container.innerHTML = '<p style="color: #999;">No custom lists added yet.</p>';
    return;
  }
  
  for (const list of lists) {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <input type="checkbox" ${list.enabled ? 'checked' : ''} 
             onchange="toggleList('${list.url}', this.checked)">
      <span title="${list.url}">${list.url}</span>
      <button onclick="removeList('${list.url}')">Remove</button>
    `;
    container.appendChild(item);
  }
}

async function addCustomList() {
  const url = document.getElementById('newListUrl').value.trim();
  
  if (!url) {
    alert('Please enter a filter list URL');
    return;
  }
  
  if (!url.startsWith('http')) {
    alert('URL must start with http:// or https://');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'addCustomList', url }, (response) => {
    if (response?.success) {
      document.getElementById('newListUrl').value = '';
      loadCustomLists();
    }
  });
}

async function removeList(url) {
  if (confirm(`Remove filter list: ${url}?`)) {
    chrome.runtime.sendMessage({ action: 'removeCustomList', url }, (response) => {
      if (response?.success) {
        loadCustomLists();
      }
    });
  }
}

async function toggleList(url, enabled) {
  const stored = await chrome.storage.sync.get('customLists');
  const lists = stored.customLists || [];
  
  const list = lists.find(l => l.url === url);
  if (list) {
    list.enabled = enabled;
    await chrome.storage.sync.set({ customLists: lists });
  }
}

// Whitelist management
async function loadWhitelist() {
  chrome.runtime.sendMessage({ action: 'getWhitelist' }, (response) => {
    const whitelist = response?.whitelist || [];
    const container = document.getElementById('whitelistContainer');
    container.innerHTML = '';
    
    if (whitelist.length === 0) {
      container.innerHTML = '<p style="color: #999;">No sites whitelisted yet.</p>';
      return;
    }
    
    for (const domain of whitelist) {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <span>${domain}</span>
        <button onclick="removeWhitelist('${domain}')">Remove</button>
      `;
      container.appendChild(item);
    }
  });
}

function addWhitelist() {
  const domain = document.getElementById('newWhitelistDomain').value.trim();
  
  if (!domain) {
    alert('Please enter a domain');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'addWhitelist', domain }, (response) => {
    if (response?.success) {
      document.getElementById('newWhitelistDomain').value = '';
      loadWhitelist();
    }
  });
}

function removeWhitelist(domain) {
  if (confirm(`Remove ${domain} from whitelist?`)) {
    chrome.runtime.sendMessage({ action: 'removeWhitelist', domain }, (response) => {
      if (response?.success) {
        loadWhitelist();
      }
    });
  }
}

// Custom domains management
async function loadCustomDomains() {
  chrome.runtime.sendMessage({ action: 'getCustomDomains' }, (response) => {
    const domains = response?.customDomains || [];
    const container = document.getElementById('customDomainsContainer');
    container.innerHTML = '';
    
    if (domains.length === 0) {
      container.innerHTML = '<p style="color: #999;">No custom domains added yet.</p>';
      return;
    }
    
    for (const domain of domains) {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <span>${domain}</span>
        <button onclick="removeCustomDomain('${domain}')">Remove</button>
      `;
      container.appendChild(item);
    }
  });
}

function addCustomDomain() {
  const domain = document.getElementById('newCustomDomain').value.trim();
  
  if (!domain) {
    alert('Please enter a domain');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'addCustomDomain', domain }, (response) => {
    if (response?.success) {
      document.getElementById('newCustomDomain').value = '';
      loadCustomDomains();
    }
  });
}

function removeCustomDomain(domain) {
  if (confirm(`Stop blocking ${domain}?`)) {
    chrome.runtime.sendMessage({ action: 'removeCustomDomain', domain }, (response) => {
      if (response?.success) {
        loadCustomDomains();
      }
    });
  }
}

// Update blocked count display
async function updateBlockedCount() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    const count = response?.blockedCount || 0;
    document.getElementById('blockedCount').textContent = count.toLocaleString();
    
    // Estimate time saved (assume 2s per ad)
    const timeSaved = count * 2;
    document.getElementById('timeSaved').textContent = 
      timeSaved < 60 ? `${timeSaved}s` : `${(timeSaved / 60).toFixed(1)}m`;
    
    // Estimate data saved (assume 200KB per ad)
    const dataSaved = (count * 0.2) / 1024; // in MB
    document.getElementById('dataSaved').textContent = 
      dataSaved < 1 ? `${(dataSaved * 1024).toFixed(0)} KB` : `${dataSaved.toFixed(1)} MB`;
  });
}

function resetStats() {
  if (confirm('Reset blocked ads counter?')) {
    chrome.runtime.sendMessage({ action: 'resetBlockedCount' }, () => {
      updateBlockedCount();
    });
  }
}

// Update blocked count every 5 seconds
setInterval(updateBlockedCount, 5000);

// Save settings on change
document.getElementById('blockTrackers').addEventListener('change', (e) => {
  chrome.storage.sync.set({ blockTrackers: e.target.checked });
});

document.getElementById('blockAnalytics').addEventListener('change', (e) => {
  chrome.storage.sync.set({ blockAnalytics: e.target.checked });
});

document.getElementById('blockFonts').addEventListener('change', (e) => {
  chrome.storage.sync.set({ blockFonts: e.target.checked });
});

document.getElementById('enableLogging').addEventListener('change', (e) => {
  chrome.storage.sync.set({ enableLogging: e.target.checked });
});
