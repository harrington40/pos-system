import { parsePhoneNumber } from 'libphonenumber-js';

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  currency: string;
  mobileMoneyProvider?: string;
}

// Comprehensive country database with mobile money providers
export const COUNTRIES: Record<string, CountryInfo> = {
  UG: {
    code: 'UG',
    name: 'Uganda',
    flag: '🇺🇬',
    currency: 'UGX',
    mobileMoneyProvider: 'MTN MoMo'
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    mobileMoneyProvider: 'M-Pesa'
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    currency: 'TZS',
    mobileMoneyProvider: 'M-Pesa'
  },
  RW: {
    code: 'RW',
    name: 'Rwanda',
    flag: '🇷🇼',
    currency: 'RWF',
    mobileMoneyProvider: 'MTN MoMo'
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currency: 'GHS',
    mobileMoneyProvider: 'MTN MoMo'
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    mobileMoneyProvider: 'Opay'
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    mobileMoneyProvider: 'MTN MoMo'
  },
  ZM: {
    code: 'ZM',
    name: 'Zambia',
    flag: '🇿🇲',
    currency: 'ZMW',
    mobileMoneyProvider: 'MTN MoMo'
  },
  CM: {
    code: 'CM',
    name: 'Cameroon',
    flag: '🇨🇲',
    currency: 'XAF',
    mobileMoneyProvider: 'MTN MoMo'
  },
  CI: {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    flag: '🇨🇮',
    currency: 'XOF',
    mobileMoneyProvider: 'MTN MoMo'
  }
};

// Phone number to country mapping
export const PHONE_COUNTRY_MAP: Record<string, string> = {
  '256': 'UG', // Uganda
  '254': 'KE', // Kenya
  '255': 'TZ', // Tanzania
  '250': 'RW', // Rwanda
  '233': 'GH', // Ghana
  '234': 'NG', // Nigeria
  '27': 'ZA',  // South Africa
  '260': 'ZM', // Zambia
  '237': 'CM', // Cameroon
  '225': 'CI', // Côte d'Ivoire
};

// GPS coordinates to country mapping (simplified)
export const GPS_COUNTRY_MAP = [
  {
    country: 'UG',
    bounds: {
      north: 4.2,
      south: -1.5,
      west: 29.5,
      east: 35.0
    }
  },
  {
    country: 'KE',
    bounds: {
      north: 5.0,
      south: -4.7,
      west: 33.9,
      east: 41.9
    }
  },
  {
    country: 'TZ',
    bounds: {
      north: -0.95,
      south: -11.7,
      west: 29.3,
      east: 40.4
    }
  },
  {
    country: 'RW',
    bounds: {
      north: -1.0,
      south: -2.8,
      west: 28.9,
      east: 30.9
    }
  },
  {
    country: 'GH',
    bounds: {
      north: 11.2,
      south: 4.7,
      west: -3.3,
      east: 1.2
    }
  },
  {
    country: 'NG',
    bounds: {
      north: 13.9,
      south: 4.3,
      west: 2.7,
      east: 14.7
    }
  }
];

export class CountryDetectionService {
  /**
   * Detect country from phone number
   */
  static detectFromPhoneNumber(phoneNumber: string): CountryInfo | null {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      if (parsed && parsed.country) {
        return COUNTRIES[parsed.country] || null;
      }

      // Fallback: try to match country code manually
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      for (const [code, country] of Object.entries(PHONE_COUNTRY_MAP)) {
        if (cleanNumber.startsWith(code)) {
          return COUNTRIES[country] || null;
        }
      }
    } catch (error) {
      console.warn('Error parsing phone number:', error);
    }
    return null;
  }

  /**
   * Detect country from GPS coordinates
   */
  static detectFromGPS(latitude: number, longitude: number): CountryInfo | null {
    for (const region of GPS_COUNTRY_MAP) {
      const { bounds } = region;
      if (
        latitude >= bounds.south &&
        latitude <= bounds.north &&
        longitude >= bounds.west &&
        longitude <= bounds.east
      ) {
        return COUNTRIES[region.country] || null;
      }
    }
    return null;
  }

  /**
   * Get user's current location
   */
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Smart country detection using multiple methods
   */
  static async detectCountry(phoneNumber?: string): Promise<CountryInfo | null> {
    // Method 1: Try phone number detection first
    if (phoneNumber) {
      const phoneCountry = this.detectFromPhoneNumber(phoneNumber);
      if (phoneCountry) {
        return phoneCountry;
      }
    }

    // Method 2: Try GPS detection
    const location = await this.getCurrentLocation();
    if (location) {
      const gpsCountry = this.detectFromGPS(location.latitude, location.longitude);
      if (gpsCountry) {
        return gpsCountry;
      }
    }

    // Method 3: Fallback to default (Uganda)
    return COUNTRIES.UG;
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phoneNumber: string, country?: string): string {
    try {
      const parsed = parsePhoneNumber(phoneNumber, country as any);
      return parsed ? parsed.formatInternational() : phoneNumber;
    } catch {
      return phoneNumber;
    }
  }

  /**
   * Validate phone number
   */
  static validatePhoneNumber(phoneNumber: string, country?: string): boolean {
    try {
      const parsed = parsePhoneNumber(phoneNumber, country as any);
      return parsed ? parsed.isValid() : false;
    } catch {
      return false;
    }
  }
}