/*
 * AdBlocker Plus - ML-Based URL Pattern Classifier
 * 
 * Uses machine learning to detect ad-like patterns in URLs that don't match
 * known ad domains. Runs locally for privacy.
 */

class MLURLClassifier {
  constructor() {
    this.modelLoaded = false;
    this.cache = new Map(); // Simple in-memory cache for results
    this.cacheSize = 5000; // Max cache entries
    this.mlEnabled = true;
    this.stats = {
      mlBlocked: 0,
      mlConfidenceSum: 0,
      mlAnalyzed: 0,
    };
    
    // Ad-related keywords that indicate likely ad requests
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

    // Suspicious patterns that indicate tracking/ads
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

    this.loadSettings();
  }

  /**
   * Load ML settings from storage
   */
  loadSettings() {
    chrome.storage.sync.get(['mlEnabled'], (data) => {
      this.mlEnabled = data.mlEnabled !== false;
    });
  }

  /**
   * Analyze a URL and return ad likelihood score (0-1)
   * @param {string} url - The URL to analyze
   * @returns {object} { isAd: boolean, confidence: number, reason: string }
   */
  analyzeURL(url) {
    if (!this.mlEnabled || !url) {
      return { isAd: false, confidence: 0, reason: 'ML disabled' };
    }

    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    try {
      const result = this._classifyURL(url);
      
      // Cache the result
      if (this.cache.size >= this.cacheSize) {
        // Simple LRU: remove oldest entry
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(url, result);

      // Update stats
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

  /**
   * Internal URL classification logic
   */
  _classifyURL(url) {
    let score = 0;
    const reasons = [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const query = urlObj.search.toLowerCase();
      const fullUrl = `${domain}${path}${query}`;

      // 1. Check for ad keywords in domain (high weight)
      const domainKeywordMatches = this.adKeywords.filter(keyword =>
        domain.includes(keyword)
      ).length;
      if (domainKeywordMatches > 0) {
        score += Math.min(domainKeywordMatches * 0.15, 0.5);
        reasons.push(`domain has ${domainKeywordMatches} ad keywords`);
      }

      // 2. Check for suspicious patterns in full URL (medium weight)
      const patternMatches = this.suspiciousPatterns.filter(pattern =>
        pattern.test(fullUrl)
      ).length;
      if (patternMatches > 0) {
        score += Math.min(patternMatches * 0.12, 0.4);
        reasons.push(`matched ${patternMatches} suspicious patterns`);
      }

      // 3. Analyze domain structure (indicates tracking domain)
      if (domain.split('.').length > 3) {
        score += 0.05; // Subdomains often used for tracking
        reasons.push('deep subdomain structure');
      }

      // 4. Check query parameters (tracking indicators)
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

      // 5. Check for numeric IDs (common in ad servers)
      const numericIdMatch = fullUrl.match(/[?&/](\d{6,})[&/]?/);
      if (numericIdMatch) {
        score += 0.08;
        reasons.push('contains numeric identifier');
      }

      // 6. Check for common ad server paths
      const adPaths = ['/ads/', '/adserver/', '/pagead/', '/googleads/', '/adsense/'];
      if (adPaths.some(adPath => path.includes(adPath))) {
        score += 0.3;
        reasons.push('known ad server path');
      }

      // 7. Penalize if domain looks legitimate (reduce false positives)
      const legitimateDomains = [
        'google.com', 'facebook.com', 'twitter.com', 'amazon.com',
        'github.com', 'stackoverflow.com', 'wikipedia.org'
      ];
      if (legitimateDomains.some(legit => domain.endsWith(legit))) {
        score *= 0.5; // Reduce score for major platforms
        reasons.push('legitimate platform detected');
      }

    } catch (error) {
      console.error('[AdBlocker Plus ML] URL parse error:', error);
      return { isAd: false, confidence: 0, reason: 'invalid URL' };
    }

    // Normalize score to 0-1 range
    const normalizedScore = Math.min(score, 1);
    
    return {
      isAd: normalizedScore > 0.5, // Threshold for considering something an ad
      confidence: normalizedScore,
      reason: reasons.length > 0 ? reasons.join('; ') : 'no ad indicators',
    };
  }

  /**
   * Get ML statistics
   */
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

  /**
   * Reset ML statistics
   */
  resetStats() {
    this.stats = {
      mlBlocked: 0,
      mlConfidenceSum: 0,
      mlAnalyzed: 0,
    };
    this.cache.clear();
  }

  /**
   * Toggle ML on/off
   */
  toggle(enabled) {
    this.mlEnabled = enabled;
    chrome.storage.sync.set({ mlEnabled: enabled });
  }
}

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLURLClassifier;
}
