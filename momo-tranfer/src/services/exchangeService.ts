import type { ExchangeVendor, ExchangeRate, ExchangeTransaction, CurrencyPair } from '../types/exchange';

class ExchangeService {
  // Mock data for vendors
  private mockVendors: ExchangeVendor[] = [
    {
      id: 'vendor_1',
      name: 'James Kato',
      businessName: 'Kato Exchange Point',
      location: 'Kampala Central',
      address: 'Speke Road, near Shoprite',
      phone: '+256782123456',
      rating: 4.8,
      totalReviews: 142,
      verified: true,
      activeHours: '8:00 AM - 6:00 PM',
      safetyScore: 95,
      trustLevel: 'high',
      lastActive: new Date(),
      specialties: ['USD', 'EUR', 'GBP'],
      isOnline: true
    },
    {
      id: 'vendor_2',
      name: 'Sarah Nakato',
      businessName: 'Quick Money Exchange',
      location: 'Wandegeya Market',
      address: 'Wandegeya Market, Shop 45',
      phone: '+256783234567',
      rating: 4.6,
      totalReviews: 89,
      verified: true,
      activeHours: '7:00 AM - 7:00 PM',
      safetyScore: 88,
      trustLevel: 'high',
      lastActive: new Date(),
      specialties: ['USD', 'KES', 'TZS'],
      isOnline: true
    },
    {
      id: 'vendor_3',
      name: 'Peter Ssemakula',
      businessName: 'City Forex Bureau',
      location: 'Garden City Mall',
      address: 'Garden City Mall, Ground Floor',
      phone: '+256784345678',
      rating: 4.3,
      totalReviews: 67,
      verified: true,
      activeHours: '9:00 AM - 9:00 PM',
      safetyScore: 82,
      trustLevel: 'medium',
      lastActive: new Date(),
      specialties: ['USD', 'EUR', 'ZAR'],
      isOnline: false
    },
    {
      id: 'vendor_4',
      name: 'Grace Namusoke',
      businessName: 'Express Exchange',
      location: 'Owino Market',
      address: 'Owino Market, Block C',
      phone: '+256785456789',
      rating: 4.7,
      totalReviews: 156,
      verified: true,
      activeHours: '6:00 AM - 8:00 PM',
      safetyScore: 91,
      trustLevel: 'high',
      lastActive: new Date(),
      specialties: ['USD', 'GBP', 'CAD'],
      isOnline: true
    },
    {
      id: 'vendor_5',
      name: 'Moses Kiprotich',
      businessName: 'Border Exchange',
      location: 'Busia Border',
      address: 'Busia Town, Main Street',
      phone: '+256786567890',
      rating: 4.1,
      totalReviews: 34,
      verified: false,
      activeHours: '5:00 AM - 10:00 PM',
      safetyScore: 75,
      trustLevel: 'medium',
      lastActive: new Date(),
      specialties: ['KES', 'USD'],
      isOnline: true
    }
  ];

  // Mock exchange rates
  private mockRates: ExchangeRate[] = [
    // USD rates
    { vendorId: 'vendor_1', fromCurrency: 'USD', toCurrency: 'UGX', buyRate: 3720, sellRate: 3750, spread: 30, lastUpdated: new Date(), minimumAmount: 50, maximumAmount: 5000, availableAmount: 15000 },
    { vendorId: 'vendor_2', fromCurrency: 'USD', toCurrency: 'UGX', buyRate: 3715, sellRate: 3755, spread: 40, lastUpdated: new Date(), minimumAmount: 100, maximumAmount: 3000, availableAmount: 8500 },
    { vendorId: 'vendor_3', fromCurrency: 'USD', toCurrency: 'UGX', buyRate: 3710, sellRate: 3760, spread: 50, lastUpdated: new Date(), minimumAmount: 200, maximumAmount: 10000, availableAmount: 25000 },
    { vendorId: 'vendor_4', fromCurrency: 'USD', toCurrency: 'UGX', buyRate: 3718, sellRate: 3752, spread: 34, lastUpdated: new Date(), minimumAmount: 50, maximumAmount: 7500, availableAmount: 12000 },
    { vendorId: 'vendor_5', fromCurrency: 'USD', toCurrency: 'UGX', buyRate: 3700, sellRate: 3770, spread: 70, lastUpdated: new Date(), minimumAmount: 100, maximumAmount: 2000, availableAmount: 3500 },
    
    // EUR rates
    { vendorId: 'vendor_1', fromCurrency: 'EUR', toCurrency: 'UGX', buyRate: 4050, sellRate: 4090, spread: 40, lastUpdated: new Date(), minimumAmount: 50, maximumAmount: 3000, availableAmount: 8000 },
    { vendorId: 'vendor_3', fromCurrency: 'EUR', toCurrency: 'UGX', buyRate: 4040, sellRate: 4100, spread: 60, lastUpdated: new Date(), minimumAmount: 100, maximumAmount: 5000, availableAmount: 15000 },
    
    // GBP rates
    { vendorId: 'vendor_1', fromCurrency: 'GBP', toCurrency: 'UGX', buyRate: 4680, sellRate: 4720, spread: 40, lastUpdated: new Date(), minimumAmount: 50, maximumAmount: 2000, availableAmount: 6000 },
    { vendorId: 'vendor_4', fromCurrency: 'GBP', toCurrency: 'UGX', buyRate: 4675, sellRate: 4725, spread: 50, lastUpdated: new Date(), minimumAmount: 100, maximumAmount: 3000, availableAmount: 4500 },
    
    // KES rates
    { vendorId: 'vendor_2', fromCurrency: 'KES', toCurrency: 'UGX', buyRate: 25.2, sellRate: 25.8, spread: 0.6, lastUpdated: new Date(), minimumAmount: 1000, maximumAmount: 100000, availableAmount: 250000 },
    { vendorId: 'vendor_5', fromCurrency: 'KES', toCurrency: 'UGX', buyRate: 25.0, sellRate: 26.0, spread: 1.0, lastUpdated: new Date(), minimumAmount: 2000, maximumAmount: 50000, availableAmount: 180000 }
  ];

  private currencies: CurrencyPair[] = [
    { from: 'USD', to: 'UGX', flag: '🇺🇸', symbol: '$', name: 'US Dollar' },
    { from: 'EUR', to: 'UGX', flag: '🇪🇺', symbol: '€', name: 'Euro' },
    { from: 'GBP', to: 'UGX', flag: '🇬🇧', symbol: '£', name: 'British Pound' },
    { from: 'KES', to: 'UGX', flag: '🇰🇪', symbol: 'KSh', name: 'Kenyan Shilling' },
    { from: 'TZS', to: 'UGX', flag: '🇹🇿', symbol: 'TSh', name: 'Tanzanian Shilling' },
    { from: 'ZAR', to: 'UGX', flag: '🇿🇦', symbol: 'R', name: 'South African Rand' }
  ];

  async getVendors(): Promise<ExchangeVendor[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockVendors;
  }

  async getExchangeRates(fromCurrency?: string): Promise<ExchangeRate[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (fromCurrency) {
      return this.mockRates.filter(rate => rate.fromCurrency === fromCurrency);
    }
    return this.mockRates;
  }

  async getCurrencies(): Promise<CurrencyPair[]> {
    return this.currencies;
  }

  async getVendorById(vendorId: string): Promise<ExchangeVendor | null> {
    return this.mockVendors.find(vendor => vendor.id === vendorId) || null;
  }

  async getRatesForVendor(vendorId: string): Promise<ExchangeRate[]> {
    return this.mockRates.filter(rate => rate.vendorId === vendorId);
  }

  async initiateTrade(
    vendorId: string,
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<ExchangeTransaction> {
    const vendor = await this.getVendorById(vendorId);
    const rate = this.mockRates.find(
      r => r.vendorId === vendorId && r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );

    if (!vendor || !rate) {
      throw new Error('Vendor or rate not found');
    }

    const toAmount = amount * rate.sellRate;
    const safetyCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return {
      id: 'tx_' + Date.now(),
      vendorId,
      buyerId: 'current_user_id',
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount,
      rate: rate.sellRate,
      status: 'pending',
      safetyCode,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async searchVendors(location?: string, currency?: string): Promise<ExchangeVendor[]> {
    let vendors = this.mockVendors;
    
    if (location) {
      vendors = vendors.filter(vendor => 
        vendor.location.toLowerCase().includes(location.toLowerCase()) ||
        vendor.address.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    if (currency) {
      vendors = vendors.filter(vendor => 
        vendor.specialties.includes(currency)
      );
    }
    
    return vendors;
  }

  async getTopVendors(limit: number = 5): Promise<ExchangeVendor[]> {
    return this.mockVendors
      .filter(vendor => vendor.verified)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  formatRate(rate: number, currency: string): string {
    if (currency === 'UGX') {
      return rate.toLocaleString('en-UG');
    }
    return rate.toFixed(2);
  }

  calculateExchange(amount: number, rate: number): number {
    return amount * rate;
  }
}

export const exchangeService = new ExchangeService();