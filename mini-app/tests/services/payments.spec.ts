/**
 * Payments Service Tests
 * ======================
 * Unit tests for Telegram Stars payments service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: PAY-001 (in-app purchases)
 *
 * Coverage targets:
 * - Payment availability detection
 * - Product catalog management
 * - Invoice opening
 * - Payment status handling
 * - Price formatting
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock haptics service
vi.mock('../../src/services/haptics', () => ({
  haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
  },
}));

// Store callback reference outside mock for test access
const callbackStore = { current: null as ((status: string) => void) | null };

// Mock WebApp
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'mock-init-data',
    openInvoice: vi.fn((_url: string, callback: (status: string) => void) => {
      // Store callback for test verification
      callbackStore.current = callback;
    }),
  },
}));

// Import after mock setup
import {
  payments,
  PRODUCTS,
  type ProductId,
  type Product,
} from '../../src/services/payments';
import { haptics } from '../../src/services/haptics';
import WebApp from '@twa-dev/sdk';

describe('PaymentsService', () => {
  beforeEach(() => {
    // Clear specific mocks rather than all mocks to preserve mock implementations
    (haptics.impact as ReturnType<typeof vi.fn>).mockClear();
    (haptics.notification as ReturnType<typeof vi.fn>).mockClear();
    (WebApp.openInvoice as ReturnType<typeof vi.fn>).mockClear();
    callbackStore.current = null;
  });

  afterEach(() => {
    // Don't reset implementations
  });

  describe('Availability', () => {
    it('should report payments available when in Telegram context', () => {
      expect(payments.canMakePayments()).toBe(true);
    });
  });

  describe('Product Catalog', () => {
    it('should have all expected products', () => {
      const productIds: ProductId[] = [
        'premium_weekly',
        'premium_monthly',
        'premium_yearly',
        'breathing_pack_calm',
        'breathing_pack_energy',
        'breathing_pack_sleep',
        'theme_pack_nature',
        'donation_small',
        'donation_medium',
        'donation_large',
      ];

      productIds.forEach((id) => {
        expect(PRODUCTS[id]).toBeDefined();
      });
    });

    it('should get product by ID', () => {
      const product = payments.getProduct('premium_monthly');

      expect(product).not.toBeNull();
      expect(product!.id).toBe('premium_monthly');
      expect(product!.priceStars).toBe(149);
      expect(product!.type).toBe('subscription');
    });

    it('should return null for unknown product', () => {
      const product = payments.getProduct('unknown' as ProductId);
      expect(product).toBeNull();
    });

    it('should get subscriptions', () => {
      const subscriptions = payments.getSubscriptions();

      expect(subscriptions.length).toBe(3);
      subscriptions.forEach((p: Product) => {
        expect(p.type).toBe('subscription');
        expect(p.duration).toBeDefined();
      });
    });

    it('should get one-time purchases', () => {
      const oneTime = payments.getOneTimePurchases();

      expect(oneTime.length).toBe(4);
      oneTime.forEach((p: Product) => {
        expect(p.type).toBe('one_time');
      });
    });

    it('should get products by type', () => {
      const donations = payments.getProductsByType('donation');

      expect(donations.length).toBe(3);
      donations.forEach((p: Product) => {
        expect(p.type).toBe('donation');
      });
    });
  });

  describe('Product Pricing', () => {
    it('should have valid prices for all products', () => {
      Object.values(PRODUCTS).forEach((product) => {
        expect(product.priceStars).toBeGreaterThan(0);
        expect(product.priceStars).toBeLessThanOrEqual(10000);
      });
    });

    it('should have yearly price less than 12x monthly', () => {
      const monthly = PRODUCTS.premium_monthly.priceStars;
      const yearly = PRODUCTS.premium_yearly.priceStars;

      // Yearly should be a discount
      expect(yearly).toBeLessThan(monthly * 12);
    });

    it('should have subscription durations', () => {
      expect(PRODUCTS.premium_weekly.duration).toBe(7);
      expect(PRODUCTS.premium_monthly.duration).toBe(30);
      expect(PRODUCTS.premium_yearly.duration).toBe(365);
    });
  });

  describe('Invoice Opening', () => {
    it('should open invoice with correct URL', () => {
      const invoiceLink = 'https://t.me/$invoice123';
      const callback = vi.fn();

      payments.openInvoice(invoiceLink, 'premium_monthly', callback);

      expect(WebApp.openInvoice).toHaveBeenCalledWith(invoiceLink, expect.any(Function));
      expect(haptics.impact).toHaveBeenCalledWith('medium');
    });

    it('should call callback on successful payment', () => {
      const callback = vi.fn();

      payments.openInvoice('https://t.me/$invoice', 'premium_monthly', callback);

      // Simulate successful payment by calling the captured callback
      expect(callbackStore.current).not.toBeNull();
      callbackStore.current?.('paid');

      expect(callback).toHaveBeenCalledWith('paid', 'premium_monthly');
      expect(haptics.notification).toHaveBeenCalledWith('success');
    });

    it('should call callback on cancelled payment', () => {
      const callback = vi.fn();

      payments.openInvoice('https://t.me/$invoice', 'premium_monthly', callback);

      // Simulate cancelled payment
      expect(callbackStore.current).not.toBeNull();
      callbackStore.current?.('cancelled');

      expect(callback).toHaveBeenCalledWith('cancelled', 'premium_monthly');
      expect(haptics.impact).toHaveBeenCalledWith('light');
    });

    it('should call callback on failed payment', () => {
      const callback = vi.fn();

      payments.openInvoice('https://t.me/$invoice', 'premium_monthly', callback);

      // Simulate failed payment
      expect(callbackStore.current).not.toBeNull();
      callbackStore.current?.('failed');

      expect(callback).toHaveBeenCalledWith('failed', 'premium_monthly');
      expect(haptics.notification).toHaveBeenCalledWith('error');
    });

    it('should work without callback', () => {
      expect(() => {
        payments.openInvoice('https://t.me/$invoice', 'premium_monthly');
      }).not.toThrow();
    });
  });

  describe('Price Formatting', () => {
    it('should format price as XTR', () => {
      expect(payments.formatPrice(149)).toBe('149 XTR');
    });

    it('should format price with symbol', () => {
      expect(payments.formatPriceWithSymbol(149)).toBe('⭐ 149');
    });

    it('should format large prices', () => {
      expect(payments.formatPrice(999)).toBe('999 XTR');
      expect(payments.formatPriceWithSymbol(999)).toBe('⭐ 999');
    });
  });

  describe('Purchase Product Flow', () => {
    it('should fail for unknown product', async () => {
      const callback = vi.fn();

      await payments.purchaseProduct('unknown' as ProductId, 'https://api.example.com', callback);

      expect(callback).toHaveBeenCalledWith('failed', 'unknown');
    });

    it('should request invoice from backend', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invoiceLink: 'https://t.me/$test' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await payments.purchaseProduct('premium_monthly', 'https://api.example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/payments/create-invoice',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'tma mock-init-data',
          }),
          body: JSON.stringify({ productId: 'premium_monthly' }),
        })
      );

      vi.unstubAllGlobals();
    });

    it('should handle backend error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const callback = vi.fn();
      await payments.purchaseProduct('premium_monthly', 'https://api.example.com', callback);

      expect(callback).toHaveBeenCalledWith('failed', 'premium_monthly');
      expect(haptics.notification).toHaveBeenCalledWith('error');

      vi.unstubAllGlobals();
    });

    it('should handle missing invoice link in response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      const callback = vi.fn();
      await payments.purchaseProduct('premium_monthly', 'https://api.example.com', callback);

      expect(callback).toHaveBeenCalledWith('failed', 'premium_monthly');

      vi.unstubAllGlobals();
    });
  });
});
