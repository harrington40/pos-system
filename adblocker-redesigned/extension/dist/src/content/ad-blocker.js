/*
 * AdBlocker Plus - Ad Blocking Logic
 * 
 * Copyright (c) 2025 AdBlocker Plus Contributors
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Cosmetic selectors for ad elements to hide
const COSMETIC_SELECTORS = [
  'iframe[src*="ads"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  '.ad', '.ads', '.advertisement', '.advert', '.ad-banner',
  '.google-ads', '.googleads', '[id*="ad-"]', '[class*="ad-"]',
  '.gpt-ad', '.dfp-ad', '#ad', '#ads',
  '.ytp-ad-image', '.ytp-ad-player', '.ytp-ad-text-overlay',
  'ytd-player-endscreen-element',
  '[data-ad-layout]', '[data-ad-format]',
  'aside[id*="ads"]', 'section[id*="ads"]',
];

// Selectors for notification scam overlays
const NOTIF_SCAM_SELECTORS = [
  'button[class*="notification"]',
  'div[class*="allow"]button',
  'a[href*="notification"]',
  '.notification-allow',
  '#notification-popup',
  '.notification-request',
  '[role="alertdialog"] button:first-child',
];

// Hide an element by removing it or applying CSS
function hide(el) {
  if (!el) return;
  try {
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.remove();
  } catch (e) {
    // Silent fail
  }
}

// Clean ads once on page load
function cleanAdsOnce() {
  // Hide cosmetic ads
  COSMETIC_SELECTORS.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        hide(el);
      });
    } catch (e) {
      // Silent fail on invalid selector
    }
  });

  // Hide notification scams
  NOTIF_SCAM_SELECTORS.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        hide(el);
      });
    } catch (e) {
      // Silent fail
    }
  });
}

// Continuously monitor for new ads (MutationObserver)
function startAdCleaner() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            COSMETIC_SELECTORS.forEach(selector => {
              try {
                if (node.matches && node.matches(selector)) {
                  hide(node);
                }
                node.querySelectorAll?.(selector).forEach(el => hide(el));
              } catch (e) {}
            });
          }
        });
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'data-ad-layout'],
  });
}

// Override Notification.requestPermission to always deny
const originalRequestPermission = Notification.requestPermission;
Notification.requestPermission = function() {
  console.log('[AdBlocker Plus] Blocked notification permission request');
  return Promise.resolve('denied');
};

// Block pushManager.subscribe
if (navigator.serviceWorker && navigator.serviceWorker.ready) {
  navigator.serviceWorker.ready.then(registration => {
    if (registration.pushManager) {
      const originalSubscribe = registration.pushManager.subscribe;
      registration.pushManager.subscribe = function() {
        console.log('[AdBlocker Plus] Blocked push subscription request');
        return Promise.reject(new Error('Push notifications are blocked by AdBlocker Plus'));
      };
    }
  });
}

// Run ad cleaner on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cleanAdsOnce();
    startAdCleaner();
  });
} else {
  cleanAdsOnce();
  startAdCleaner();
}
