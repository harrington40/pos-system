/*
 * AdBlocker Plus - Service Worker
 * 
 * Copyright (c) 2025 AdBlocker Plus Contributors
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

// ============= ML URL CLASSIFIER (Inlined) =============
class MLURLClassifier {
  constructor() {
    this.modelLoaded = false;
    this.cache = new Map();
    this.cacheSize = 5000;
    this.mlEnabled = true;
    this.stats = {
      mlBlocked: 0,
      mlConfidenceSum: 0,
      mlAnalyzed: 0,
    };
    
    this.adKeywords = [
      'ad', 'ads', 'advertisement', 'advert', 'banner',
      'doubleclick', 'adsense', 'adwords', 'adroll', 'criteo',
      'taboola', 'outbrain', 'pubmatic', 'openx', 'rubicon',
      'pixel', 'beacon', 'tracker', 'tracking', 'analytics',
      'metrics', 'collect', 'log', 'event', 'pageview',
      'impression', 'conversion', 'click', 'monetize',
      'yield', 'revenue', 'exchange', 'bid', 'dsp', 'ssp',
      'audience', 'segment', 'profile', 'behavior',
    ];

    this.suspiciousPatterns = [
      /tracking/i,
      /analytics/i,
      /pixel/i,
      /beacon/i,
      /ad[sv]?[^a-z]/i,
      /metric/i,
      /collect/i,
      /log[^a-z]/i,
      /impression/i,
      /conversion/i,
      /click[^a-z]/i,
    ];
  }

  loadSettings() {
    if (chrome && chrome.storage) {
      chrome.storage.sync.get(['mlEnabled'], (data) => {
        if (data) this.mlEnabled = data.mlEnabled !== false;
      });
    }
  }

  analyzeURL(url) {
    if (!this.mlEnabled || !url) {
      return { isAd: false, confidence: 0, reason: 'ML disabled' };
    }

    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    try {
      const result = this._classifyURL(url);
      
      if (this.cache.size >= this.cacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(url, result);

      if (result.isAd) {
        this.stats.mlBlocked++;
      }
      this.stats.mlAnalyzed++;
      this.stats.mlConfidenceSum += result.confidence;

      return result;
    } catch (error) {
      console.error('[AdBlocker Plus ML] Error analyzing URL:', error);
      return { isAd: false, confidence: 0, reason: 'ML error' };
    }
  }

  _classifyURL(url) {
    let score = 0;
    const reasons = [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const query = urlObj.search.toLowerCase();
      const fullUrl = `${domain}${path}${query}`;

      const domainKeywordMatches = this.adKeywords.filter(keyword =>
        domain.includes(keyword)
      ).length;
      if (domainKeywordMatches > 0) {
        score += Math.min(domainKeywordMatches * 0.15, 0.5);
        reasons.push(`domain has ${domainKeywordMatches} ad keywords`);
      }

      const patternMatches = this.suspiciousPatterns.filter(pattern =>
        pattern.test(fullUrl)
      ).length;
      if (patternMatches > 0) {
        score += Math.min(patternMatches * 0.12, 0.4);
        reasons.push(`matched ${patternMatches} suspicious patterns`);
      }

      if (domain.split('.').length > 3) {
        score += 0.05;
        reasons.push('deep subdomain structure');
      }

      const suspiciousParams = [
        'utm_', 'fbclid', 'gclid', 'msclkid', 'uuid', 'sid',
        'userid', 'deviceid', 'sessionid', 'impression', 'conversion'
      ];
      const queryParamMatches = suspiciousParams.filter(param =>
        query.includes(param)
      ).length;
      if (queryParamMatches > 0) {
        score += Math.min(queryParamMatches * 0.1, 0.3);
        reasons.push(`${queryParamMatches} tracking parameters`);
      }

      const numericIdMatch = fullUrl.match(/[?&/](\d{6,})[&/]?/);
      if (numericIdMatch) {
        score += 0.08;
        reasons.push('contains numeric identifier');
      }

      const adPaths = ['/ads/', '/adserver/', '/pagead/', '/googleads/', '/adsense/'];
      if (adPaths.some(adPath => path.includes(adPath))) {
        score += 0.3;
        reasons.push('known ad server path');
      }

      const legitimateDomains = [
        'google.com', 'facebook.com', 'twitter.com', 'amazon.com',
        'github.com', 'stackoverflow.com', 'wikipedia.org'
      ];
      if (legitimateDomains.some(legit => domain.endsWith(legit))) {
        score *= 0.5;
        reasons.push('legitimate platform detected');
      }

    } catch (error) {
      console.error('[AdBlocker Plus ML] URL parse error:', error);
      return { isAd: false, confidence: 0, reason: 'invalid URL' };
    }

    const normalizedScore = Math.min(score, 1);
    
    return {
      isAd: normalizedScore > 0.5,
      confidence: normalizedScore,
      reason: reasons.length > 0 ? reasons.join('; ') : 'no ad indicators',
    };
  }

  getStats() {
    const avgConfidence = this.stats.mlAnalyzed > 0
      ? (this.stats.mlConfidenceSum / this.stats.mlAnalyzed).toFixed(2)
      : 0;

    return {
      mlBlocked: this.stats.mlBlocked,
      mlAnalyzed: this.stats.mlAnalyzed,
      mlAverageConfidence: avgConfidence,
      mlEnabled: this.mlEnabled,
      cacheSize: this.cache.size,
    };
  }

  resetStats() {
    this.stats = {
      mlBlocked: 0,
      mlConfidenceSum: 0,
      mlAnalyzed: 0,
    };
    this.cache.clear();
  }

  toggle(enabled) {
    this.mlEnabled = enabled;
    chrome.storage.sync.set({ mlEnabled: enabled });
  }
}

const mlClassifier = new MLURLClassifier();
// ============= END ML CLASSIFIER =============

// Ad network domains for smart blocking (25+ major ad networks)
const AD_DOMAINS = [
  // Google Ad Networks
  'doubleclick.net',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'ads.youtube.com',
  'amazon-adsystem.com',
  'adservice.google.com',
  'advertising.google.com',
  'cdn.doubleclick.net',
  'googleadservices.com',
  'googleads.g.doubleclick.net',
  
  // Social & Premium Ad Networks
  'facebook.com/ads',
  'ads.facebook.com',
  'criteo.net',
  'criteo.com',
  'taboola.com',
  'taboola-ads.com',
  'outbrain.com',
  'outbrain-img.com',
  'adroll.com',
  'adform.net',
  'adform.com',
  'adnxs.com',
  'appnexus.com',
  
  // Tracking & Analytics
  'scorecardresearch.com',
  'quantserve.com',
  'analytics.google.com',
  'google-analytics.com',
  'googleanalytics.com',
  
  // Ad Exchanges
  'pubmatic.com',
  'openx.net',
  'rubiconproject.com',
  'contextweb.com',
  'smartadserver.com',
];

// ============= TRACKING DOMAINS (Organized by Category) =============

const ANALYTICS_DOMAINS = [
  'analytics.google.com',
  'google-analytics.com',
  'googleanalytics.com',
  'matomo.org',
  'matomo.com',
  'piwik.org',
  'hotjar.com',
  'amplitude.com',
  'mixpanel.com',
  'segment.com',
  'kissmetrics.com',
  'intercom.io',
  'intercomcdn.com',
  'appcenter.ms',
];

const PIXEL_TRACKER_DOMAINS = [
  'pixel.facebook.com',
  'pins.pinterest.com',
  'analytics.pinterest.com',
  'twimg.com',
  'connect.facebook.net',
  'redditpixel.com',
];

const FINGERPRINTING_DOMAINS = [
  'api.maxmind.com',
  'minfraud.maxmind.com',
  'deviceatlas.com',
  'wurfl.io',
  'uaparser.com',
];

const SOCIAL_TRACKING_DOMAINS = [
  'platform.twitter.com',
  'platform.linkedin.com',
  'apis.google.com',
  'csi.gstatic.com',
  'platform.instagram.com',
];

let trackingSettings = {
  blockTrackers: true,
  blockAnalytics: true,
  blockPixels: true,
  blockFingerprinting: true,
  blockSocialTracking: true,
};

// Ad-related path keywords that indicate ad/tracking requests
const AD_PATH_KEYWORDS = [
  '/ads',
  '/adserver',
  '/tracking',
  '/tracker',
  '/analytics',
  '/advert',
  '/banner',
  '/ad-banner',
  '/googleads',
  '/pagead',
  '/gstatic/ads',
  '/collect',
  '/metrics',
];

// Wildcard patterns for more efficient blocking
const WILDCARD_PATTERNS = [
  '*ads*',     // Matches any URL containing "ads"
  '*tracker*', // Matches tracking domains
  '*analytics*', // Matches analytics
  '*ad-*',     // Matches ad-related paths
];

let customLists = [];
let adblockEnabled = true;
let mlThreshold = 0.65; // Configurable ML confidence threshold

// Check if URL matches pattern-based rules
function shouldBlockByPatterns(url) {
  try {
    if (!url || typeof url !== 'string') return false;
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    // Check against known ad domains
    if (AD_DOMAINS && AD_DOMAINS.some(adDomain => domain.includes(adDomain))) {
      return true;
    }

    // Check tracking settings and apply category-based blocking
    if (trackingSettings.blockAnalytics && ANALYTICS_DOMAINS && ANALYTICS_DOMAINS.some(d => domain.includes(d))) {
      return true;
    }
    if (trackingSettings.blockPixels && PIXEL_TRACKER_DOMAINS && PIXEL_TRACKER_DOMAINS.some(d => domain.includes(d))) {
      return true;
    }
    if (trackingSettings.blockFingerprinting && FINGERPRINTING_DOMAINS && FINGERPRINTING_DOMAINS.some(d => domain.includes(d))) {
      return true;
    }
    if (trackingSettings.blockSocialTracking && SOCIAL_TRACKING_DOMAINS && SOCIAL_TRACKING_DOMAINS.some(d => domain.includes(d))) {
      return true;
    }

    // Check against AD_PATH_KEYWORDS
    if (AD_PATH_KEYWORDS.some(keyword => path.includes(keyword))) {
      return true;
    }

    // Check custom blocklist
    if (customLists.some(item => domain.includes(item))) {
      return true;
    }
  } catch (e) {
    // Invalid URL
  }
  return false;
}

// Check if URL should be blocked (patterns + ML)
function shouldBlockURL(url) {
  // First check pattern-based rules (fast, high confidence)
  if (shouldBlockByPatterns(url)) {
    return { shouldBlock: true, method: 'pattern' };
  }

  // Fall back to ML if patterns didn't match
  const mlResult = mlClassifier.analyzeURL(url);
  if (mlResult.isAd && mlResult.confidence > mlThreshold) {
    return { shouldBlock: true, method: 'ml', confidence: mlResult.confidence };
  }

  return { shouldBlock: false, method: 'none' };
}

// Build declarativeNetRequest rules from domains and keywords (optimized)
function buildBlockRules() {
  const rules = [];
  let ruleId = 1;

  // Block rules for AD_DOMAINS (exact domain matching)
  for (const domain of AD_DOMAINS) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: domain,
        resourceTypes: ['script', 'stylesheet', 'image', 'xmlhttprequest', 'media', 'font', 'ping'],
      },
    });
  }

  // Optimized wildcard rules (more efficient than individual keywords)
  for (const pattern of WILDCARD_PATTERNS) {
    rules.push({
      id: ruleId++,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: pattern,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['script', 'stylesheet', 'image', 'xmlhttprequest', 'media'],
      },
    });
  }

  // Additional path-specific rules for high-confidence ad paths
  const HIGH_CONFIDENCE_PATHS = [
    '/pagead/*',
    '/ads/*',
    '/adserver/*',
  ];

  for (const path of HIGH_CONFIDENCE_PATHS) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: path,
        resourceTypes: ['script', 'xmlhttprequest', 'image'],
      },
    });
  }

  return rules;
}

// Initialize extension
function initializeExtension() {
  // Load settings from storage
  chrome.storage.sync.get([
    'customLists', 
    'adblockEnabled', 
    'mlThreshold', 
    'enableML',
    'blockTrackers',
    'blockAnalytics',
    'blockPixels',
    'blockFingerprinting',
    'blockSocialTracking'
  ], (data) => {
    if (data.customLists) {
      customLists = data.customLists;
    }
    if (data.adblockEnabled !== undefined) {
      adblockEnabled = data.adblockEnabled;
    }
    if (data.mlThreshold !== undefined) {
      mlThreshold = data.mlThreshold;
      console.log('[AdBlocker Plus] ML threshold loaded:', mlThreshold);
    }
    if (data.enableML !== undefined) {
      mlClassifier.mlEnabled = data.enableML;
      console.log('[AdBlocker Plus] ML enabled:', data.enableML);
    }
    
    // Load tracking settings
    if (data.blockTrackers !== undefined) trackingSettings.blockTrackers = data.blockTrackers;
    if (data.blockAnalytics !== undefined) trackingSettings.blockAnalytics = data.blockAnalytics;
    if (data.blockPixels !== undefined) trackingSettings.blockPixels = data.blockPixels;
    if (data.blockFingerprinting !== undefined) trackingSettings.blockFingerprinting = data.blockFingerprinting;
    if (data.blockSocialTracking !== undefined) trackingSettings.blockSocialTracking = data.blockSocialTracking;
    
    console.log('[AdBlocker Plus] Service worker initialized with tracking settings:', trackingSettings);
  });

  // Load blocked count
  chrome.storage.local.get(['blockedCount'], (data) => {
    if (data.blockedCount === undefined) {
      chrome.storage.local.set({ blockedCount: 0 });
    }
  });
  
  // Apply blocking rules on startup
  applyBlockingRules();
}

// Apply blocking rules (called on init and install)
async function applyBlockingRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(rule => rule.id);
    
    const newRules = buildBlockRules();
    
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds.length > 0 ? removeRuleIds : undefined,
        addRules: newRules,
      });
      console.log(`[AdBlocker Plus] Applied ${newRules.length} blocking rules`);
    }
  } catch (error) {
    console.error('[AdBlocker Plus] Error applying rules:', error);
  }
}

// Update declarativeNetRequest rules on extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[AdBlocker Plus] Extension installed/updated');
  initializeExtension();
  
  // On first install, show welcome page and request pinning
  if (details.reason === 'install') {
    // Mark that user has seen install page
    chrome.storage.sync.set({ installDate: Date.now(), hasSeenWelcome: true });
    
    // Try to show the popup (this hints the browser to show pin option)
    try {
      await chrome.action.openPopup();
      console.log('[AdBlocker Plus] Popup opened - user should see pin option in toolbar');
    } catch (error) {
      console.log('[AdBlocker Plus] Could not open popup:', error);
    }
    
    // Also open welcome page with detailed pinning instructions
    try {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL('src/options/welcome.html')
      });
      console.log('[AdBlocker Plus] Welcome page opened');
    } catch (error) {
      console.log('[AdBlocker Plus] Could not open welcome page:', error);
    }
  }
});

// Listen for blocked requests to increment counter and track details
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  console.log('[AdBlocker Plus] Rule matched:', details.rule.ruleId, details.request.url);
  
  if (details.rule.ruleId && adblockEnabled) {
    chrome.storage.local.get(['blockedCount', 'blockedHistory'], (data) => {
      const currentCount = (data.blockedCount || 0) + 1;
      let blockedHistory = data.blockedHistory || [];

      try {
        // Add blocked URL to history with details
        const blockedEntry = {
          url: details.request.url,
          timestamp: Date.now(),
          domain: new URL(details.request.url).hostname,
          resourceType: details.request.type,
          ruleId: details.rule.ruleId,
          tabId: details.request.tabId || -1,
        };

        blockedHistory.push(blockedEntry);

        // Keep only last 1000 blocked requests (prevent storage overflow)
        if (blockedHistory.length > 1000) {
          blockedHistory = blockedHistory.slice(-1000);
        }

        chrome.storage.local.set({
          blockedCount: currentCount,
          blockedHistory: blockedHistory,
        });

        console.log(`[AdBlocker Plus] Tracked blocked request: ${blockedEntry.domain} (Total: ${currentCount})`);
      } catch (error) {
        console.error('[AdBlocker Plus] Error tracking blocked request:', error);
      }
    });
  }
});

// Message handlers for popup and content scripts (with advanced features)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBlockedCount') {
    chrome.storage.local.get(['blockedCount', 'blockHistory'], (data) => {
      sendResponse({ 
        count: data.blockedCount || 0,
        history: data.blockHistory || []
      });
    });
    return true;
  } 
  else if (request.action === 'resetBlockedCount') {
    chrome.storage.local.set({ blockedCount: 0, blockHistory: [] });
    sendResponse({ success: true });
  }
  else if (request.action === 'toggleEnabled') {
    adblockEnabled = request.enabled;
    chrome.storage.sync.set({ adblockEnabled });
    sendResponse({ success: true });
  }
  else if (request.action === 'isEnabled') {
    chrome.storage.sync.get(['adblockEnabled'], (data) => {
      const enabled = data.adblockEnabled !== false;
      sendResponse({ enabled: enabled });
    });
    return true; // Keep the message channel open for async response
  }
  // Advanced features for whitelist/blacklist
  else if (request.action === 'addWhitelist') {
    chrome.storage.sync.get(['whitelist'], (data) => {
      const whitelist = data.whitelist || [];
      if (!whitelist.includes(request.domain)) {
        whitelist.push(request.domain);
        chrome.storage.sync.set({ whitelist });
      }
      sendResponse({ success: true, whitelist });
    });
    return true;
  }
  else if (request.action === 'removeWhitelist') {
    chrome.storage.sync.get(['whitelist'], (data) => {
      let whitelist = data.whitelist || [];
      whitelist = whitelist.filter(d => d !== request.domain);
      chrome.storage.sync.set({ whitelist });
      sendResponse({ success: true, whitelist });
    });
    return true;
  }
  else if (request.action === 'getWhitelist') {
    chrome.storage.sync.get(['whitelist'], (data) => {
      sendResponse({ whitelist: data.whitelist || [] });
    });
    return true;
  }
  else if (request.action === 'addCustomDomain') {
    chrome.storage.sync.get(['customDomains'], (data) => {
      const customDomains = data.customDomains || [];
      if (!customDomains.includes(request.domain)) {
        customDomains.push(request.domain);
        chrome.storage.sync.set({ customDomains });
      }
      sendResponse({ success: true, customDomains });
    });
    return true;
  }
  else if (request.action === 'removeCustomDomain') {
    chrome.storage.sync.get(['customDomains'], (data) => {
      let customDomains = data.customDomains || [];
      customDomains = customDomains.filter(d => d !== request.domain);
      chrome.storage.sync.set({ customDomains });
      sendResponse({ success: true, customDomains });
    });
    return true;
  }
  else if (request.action === 'getCustomDomains') {
    chrome.storage.sync.get(['customDomains'], (data) => {
      sendResponse({ customDomains: data.customDomains || [] });
    });
    return true;
  }
  else if (request.action === 'getStats') {
    chrome.storage.local.get(['blockedCount', 'blockHistory', 'sessionStart'], (data) => {
      const sessionStart = data.sessionStart || Date.now();
      const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);
      const blockedCount = data.blockedCount || 0;
      const blockHistory = data.blockHistory || [];
      
      // Include ML stats
      const mlStats = mlClassifier.getStats();
      
      sendResponse({
        blockedCount,
        sessionDuration,
        blockHistory,
        averagePerSecond: sessionDuration > 0 ? (blockedCount / sessionDuration).toFixed(2) : 0,
        mlStats: mlStats,
      });
    });
    return true;
  }
  else if (request.action === 'toggleML') {
    mlClassifier.toggle(request.enabled);
    sendResponse({ success: true, mlEnabled: request.enabled });
  }
  else if (request.action === 'getMLStats') {
    const mlStats = mlClassifier.getStats();
    sendResponse(mlStats);
    return true;
  }
  else if (request.action === 'resetMLStats') {
    mlClassifier.resetStats();
    sendResponse({ success: true });
  }
  else if (request.action === 'getBlockedHistory') {
    chrome.storage.local.get(['blockedHistory'], (data) => {
      const blockedHistory = data.blockedHistory || [];
      sendResponse({ blockedHistory: blockedHistory });
    });
    return true;
  }
  else if (request.action === 'clearBlockedHistory') {
    chrome.storage.local.set({ blockedHistory: [] });
    sendResponse({ success: true });
  }
  else if (request.action === 'setMLThreshold') {
    mlThreshold = request.threshold || 0.65;
    chrome.storage.sync.set({ mlThreshold: mlThreshold });
    console.log('[AdBlocker Plus] ML threshold set to', mlThreshold);
    sendResponse({ success: true, mlThreshold: mlThreshold });
  }
  else if (request.action === 'isMLEnabled') {
    sendResponse({ mlEnabled: mlClassifier.mlEnabled });
  }
  else if (request.action === 'updateTrackingSettings') {
    if (request.settings) {
      trackingSettings = {
        blockTrackers: request.settings.blockTrackers !== false,
        blockAnalytics: request.settings.blockAnalytics !== false,
        blockPixels: request.settings.blockPixels !== false,
        blockFingerprinting: request.settings.blockFingerprinting !== false,
        blockSocialTracking: request.settings.blockSocialTracking !== false,
      };
      console.log('[AdBlocker Plus] Tracking settings updated:', trackingSettings);
    }
    sendResponse({ success: true, trackingSettings: trackingSettings });
  }
  else if (request.action === 'getTrackingSettings') {
    sendResponse({ trackingSettings: trackingSettings });
  }
});

// Initialize on load
initializeExtension();
