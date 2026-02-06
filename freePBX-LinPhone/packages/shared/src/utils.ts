/**
 * Format phone number to E.164 format
 */
export function formatE164(phoneNumber: string, countryCode: string = '+1'): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith(countryCode.replace('+', ''))) {
    return `+${cleaned}`;
  }
  
  return `${countryCode}${cleaned}`;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Validate SIP URI
 */
export function isValidSipUri(uri: string): boolean {
  const sipUriRegex = /^sip:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return sipUriRegex.test(uri);
}

/**
 * Parse SIP URI
 */
export function parseSipUri(uri: string): { user: string; domain: string } | null {
  if (!isValidSipUri(uri)) {
    return null;
  }
  
  const parts = uri.replace('sip:', '').split('@');
  return {
    user: parts[0],
    domain: parts[1]
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Country codes and phone formats
 */
export const COUNTRY_CODES = {
  US: { code: '+1', format: '(###) ###-####', flag: '🇺🇸', name: 'United States' },
  CA: { code: '+1', format: '(###) ###-####', flag: '🇨🇦', name: 'Canada' },
  UK: { code: '+44', format: '#### ### ####', flag: '🇬🇧', name: 'United Kingdom' },
  AU: { code: '+61', format: '#### ### ###', flag: '🇦🇺', name: 'Australia' },
  DE: { code: '+49', format: '### ########', flag: '🇩🇪', name: 'Germany' },
  FR: { code: '+33', format: '# ## ## ## ##', flag: '🇫🇷', name: 'France' },
  IN: { code: '+91', format: '##### #####', flag: '🇮🇳', name: 'India' },
  CN: { code: '+86', format: '### #### ####', flag: '🇨🇳', name: 'China' },
  JP: { code: '+81', format: '##-####-####', flag: '🇯🇵', name: 'Japan' },
  BR: { code: '+55', format: '(##) #####-####', flag: '🇧🇷', name: 'Brazil' },
};

/**
 * Detect country from phone number
 */
export function detectCountry(phoneNumber: string): keyof typeof COUNTRY_CODES | null {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  for (const [country, data] of Object.entries(COUNTRY_CODES)) {
    if (cleaned.startsWith(data.code.replace('+', ''))) {
      return country as keyof typeof COUNTRY_CODES;
    }
  }
  
  return null;
}

/**
 * Format phone number with country-specific formatting
 */
export function formatPhoneNumber(phoneNumber: string, country?: keyof typeof COUNTRY_CODES): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const detectedCountry = country || detectCountry(phoneNumber);
  
  if (!detectedCountry) {
    return phoneNumber; // Return original if country can't be detected
  }
  
  const countryData = COUNTRY_CODES[detectedCountry];
  const format = countryData.format;
  const code = countryData.code.replace('+', '');
  
  // Remove country code from number
  let number = cleaned.startsWith(code) ? cleaned.slice(code.length) : cleaned;
  
  // Apply formatting
  let formatted = '';
  let numberIndex = 0;
  
  for (let i = 0; i < format.length && numberIndex < number.length; i++) {
    if (format[i] === '#') {
      formatted += number[numberIndex++];
    } else {
      formatted += format[i];
    }
  }
  
  return `${countryData.code} ${formatted}`;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Parse email address
 */
export function parseEmail(email: string): { local: string; domain: string; name?: string } | null {
  if (!isValidEmail(email)) {
    return null;
  }
  
  const parts = email.split('@');
  return {
    local: parts[0],
    domain: parts[1],
    name: parts[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
}

/**
 * Extract email from text
 */
export function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Extract phone number from text
 */
export function extractPhoneNumber(text: string): string | null {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
}

/**
 * Generate avatar URL from name or use default
 */
export function generateAvatar(name: string, email?: string): string {
  // Use UI Avatars API for generating avatar
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
}

/**
 * Email capture algorithm - Parse incoming email and extract contact info
 */
export function captureEmailContact(emailData: {
  from: string;
  subject: string;
  body: string;
  timestamp: Date;
}): {
  email: string;
  name: string;
  phone?: string;
  subject: string;
  message: string;
  timestamp: Date;
  type: 'email';
} | null {
  const email = extractEmail(emailData.from);
  if (!email) return null;
  
  const parsedEmail = parseEmail(email);
  if (!parsedEmail) return null;
  
  // Extract phone from body if present
  const phone = extractPhoneNumber(emailData.body);
  
  // Extract name from email header (e.g., "John Doe <john@example.com>")
  const nameMatch = emailData.from.match(/^([^<]+)</);
  const name = nameMatch ? nameMatch[1].trim() : parsedEmail.name || parsedEmail.local;
  
  return {
    email,
    name,
    phone: phone || undefined,
    subject: emailData.subject,
    message: emailData.body,
    timestamp: emailData.timestamp,
    type: 'email'
  };
}

/**
 * SMS capture algorithm - Parse incoming SMS and extract contact info
 */
export function captureSMSContact(smsData: {
  from: string;
  body: string;
  timestamp: Date;
}): {
  phone: string;
  formattedPhone: string;
  country?: keyof typeof COUNTRY_CODES;
  message: string;
  timestamp: Date;
  type: 'sms';
} | null {
  const phone = extractPhoneNumber(smsData.from) || smsData.from;
  const country = detectCountry(phone);
  
  return {
    phone: phone.replace(/\D/g, ''),
    formattedPhone: formatPhoneNumber(phone, country || undefined),
    country: country || undefined,
    message: smsData.body,
    timestamp: smsData.timestamp,
    type: 'sms'
  };
}

/**
 * Smart contact matching algorithm
 */
export function matchContact(
  query: string,
  contacts: Array<{
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }>
): Array<{ contact: any; score: number }> {
  const queryLower = query.toLowerCase();
  
  return contacts
    .map(contact => {
      let score = 0;
      
      // Name match (highest priority)
      if (contact.name.toLowerCase().includes(queryLower)) {
        score += 50;
        if (contact.name.toLowerCase().startsWith(queryLower)) {
          score += 30;
        }
      }
      
      // Email match
      if (contact.email?.toLowerCase().includes(queryLower)) {
        score += 30;
      }
      
      // Phone match (normalize numbers)
      const queryDigits = query.replace(/\D/g, '');
      const contactDigits = contact.phone?.replace(/\D/g, '') || '';
      if (queryDigits && contactDigits.includes(queryDigits)) {
        score += 40;
      }
      
      // Company match
      if (contact.company?.toLowerCase().includes(queryLower)) {
        score += 20;
      }
      
      return { contact, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);
}
