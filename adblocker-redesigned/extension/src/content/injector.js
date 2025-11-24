/*
 * AdBlocker Plus - Content Script Injector
 * 
 * Copyright (c) 2025 AdBlocker Plus Contributors
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Load the ad-blocker script from the extension
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/content/ad-blocker.js');
script.onload = function() {
  this.remove();
};
script.onerror = function() {
  console.error('[AdBlocker Plus] Failed to load ad-blocker.js');
  this.remove();
};

// Add script to page as early as possible
if (document.documentElement) {
  document.documentElement.prepend(script);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.prepend(script);
  });
}
