# TradeShield Privacy Policy

**Last Updated:** November 24, 2025

## Overview

TradeShield ("the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use TradeShield - Advanced Threat Protection.

## Key Principle
**We do NOT collect, transmit, or store any personal data about you.** TradeShield operates entirely offline on your computer.

## Information We Do NOT Collect

- Personal identification information (name, email, phone, address)
- Browsing history or visited websites
- IP address or geolocation data
- Device identifiers or hardware information
- Behavioral data or usage analytics
- Cookies or tracking tokens
- Payment information

## Information Stored Locally (On Your Computer Only)

TradeShield stores the following data **locally in your browser** for functionality:

### 1. Blocked History
- URLs of blocked requests (stored temporarily)
- Domain names
- Resource types (script, image, xhr, etc.)
- Timestamps of blocks
- **Purpose**: Show you what was blocked in the detailed report
- **User Control**: You can clear this history anytime with the "Clear History" button
- **Storage**: Browser's local storage, never transmitted

### 2. User Preferences
- ML enable/disable toggle status
- ML confidence threshold setting (0.5-0.95)
- Tracking protection toggles (5 categories):
  - Block trackers
  - Block analytics
  - Block pixels
  - Block fingerprinting
  - Block social tracking
- Whitelist/blacklist entries
- **Purpose**: Remember your settings between sessions
- **Storage**: Chrome sync storage (encrypted by Chrome)
- **Transmission**: Only to your other Chrome devices (if sync enabled)

### 3. ML Statistics
- Number of URLs analyzed by ML classifier
- Number of URLs blocked by ML
- Average confidence scores
- ML cache statistics
- **Purpose**: Display performance metrics in options page
- **User Control**: You can export and reset statistics anytime
- **Storage**: Local browser storage only

## What We Never Do

✗ We never send your data to external servers
✗ We never create user accounts or profiles
✗ We never track which websites you visit
✗ We never use analytics or telemetry
✗ We never place ads in the extension
✗ We never sell or share your data
✗ We never use dark patterns or deception
✗ We never require registration or login

## Why We Request Permissions

TradeShield requests the following Chrome permissions:

### `storage`
- **Why**: To store your preferences and blocked history locally
- **Scope**: Only your browser, not transmitted

### `webRequest` & `declarativeNetRequest`
- **Why**: To identify and block tracking requests
- **Scope**: Network requests you make

### `tabs`
- **Why**: To check what website you're currently viewing
- **Scope**: Only to determine context for blocking rules

### `scripting`
- **Why**: To inject the ad-blocking script into webpages
- **Scope**: Only the content script that blocks ads locally

### `webNavigation`
- **Why**: To detect when pages load and apply rules
- **Scope**: Monitoring navigation events only

### `<all_urls>`
- **Why**: To protect you on any website
- **Scope**: Content blocking happens locally on your device

## Open Source & Transparency

TradeShield uses an **open-source ML algorithm** that you can inspect:
- No black-box AI models
- 28 ad keywords and 11 regex patterns
- 5000-URL local cache for performance
- Confidence scoring fully transparent
- Source code available for review

## Data Security

All data is protected by:
- **Local-only storage**: No transmission to external servers
- **Browser encryption**: Chrome encrypts sync data
- **No third-party services**: We don't use analytics, CRM, or tracking tools
- **Code review**: Extension code is simple and reviewable

## Your Rights & Control

You have complete control:
- **Export data**: Click "Export Report" to download your blocked history
- **Clear data**: Click "Clear History" to remove all blocked entries
- **Disable features**: Toggle any protection on/off in options
- **Whitelist sites**: Add domains to whitelist to skip blocking
- **Uninstall anytime**: Completely remove the extension and all data

## Changes to This Policy

We may update this policy occasionally. We will notify you of any significant changes by updating the "Last Updated" date and posting the new policy.

## Contact & Support

For privacy concerns or questions about this policy:
- **GitHub Issues**: [Report on GitHub](https://github.com/yourusername/TradeShield)
- **Email**: [your-email@example.com]

## Children's Privacy

TradeShield is not intended for children under 13. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately.

## Compliance

- **GDPR Compliant**: No personal data collection
- **CCPA Compliant**: No personal data collection
- **Chrome Web Store**: Compliant with all policies
- **Privacy by Design**: Privacy built into every feature

## Summary

**Bottom Line**: We believe you should have privacy by default. TradeShield doesn't track you, profile you, or monetize your data. All your protection happens on your device, managed only by you.

---

**Questions?** The extension operates entirely offline on your computer. No data leaves your device unless you explicitly export it.

Last Updated: November 24, 2025
Version: 1.0.0
