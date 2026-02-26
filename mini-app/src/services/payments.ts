/**
 * Telegram Stars Payments Service
 * ================================
 * In-app purchases using Telegram Stars for Premium features.
 *
 * Payment Flow:
 * 1. Mini App calls openInvoice() with invoice_link
 * 2. Bot receives pre_checkout_query, responds within 10s
 * 3. Bot receives successful_payment update
 * 4. Mini App receives callback with status
 *
 * Stars Pricing (2025):
 * - Currency code: "XTR" (Telegram Stars)
 * - provider_token: empty for digital goods
 * - Min: 1 XTR, Max: 10000 XTR
 *
 * IEC 62304 Compliance:
 * - §5.5.3: Software unit verification
 * - Traceability: PAY-001 (in-app purchases)
 *
 * @see https://core.telegram.org/bots/payments-stars
 * @module @sleepcore/mini-app/services
 */

import WebApp from '@twa-dev/sdk';
import { haptics } from './haptics';

// Invoice status from Telegram
export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

// Product types for SleepCore
export type ProductId =
  | 'premium_weekly'
  | 'premium_monthly'
  | 'premium_yearly'
  | 'breathing_pack_calm'
  | 'breathing_pack_energy'
  | 'breathing_pack_sleep'
  | 'theme_pack_nature'
  | 'donation_small'
  | 'donation_medium'
  | 'donation_large';

// Product definitions (prices in Stars)
export interface Product {
  id: ProductId;
  name: string;
  description: string;
  priceStars: number;
  type: 'subscription' | 'one_time' | 'donation';
  duration?: number; // days for subscriptions
}

// Catalog of available products
export const PRODUCTS: Record<ProductId, Product> = {
  // Subscriptions
  premium_weekly: {
    id: 'premium_weekly',
    name: 'Premium Weekly',
    description: 'All breathing patterns, offline mode, no ads',
    priceStars: 49,
    type: 'subscription',
    duration: 7,
  },
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    description: 'All breathing patterns, offline mode, no ads',
    priceStars: 149,
    type: 'subscription',
    duration: 30,
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    description: 'All breathing patterns, offline mode, no ads (best value)',
    priceStars: 999,
    type: 'subscription',
    duration: 365,
  },

  // Breathing packs (one-time)
  breathing_pack_calm: {
    id: 'breathing_pack_calm',
    name: 'Calm Pack',
    description: '5 calming breathing patterns for anxiety relief',
    priceStars: 79,
    type: 'one_time',
  },
  breathing_pack_energy: {
    id: 'breathing_pack_energy',
    name: 'Energy Pack',
    description: '5 energizing breathing patterns for focus',
    priceStars: 79,
    type: 'one_time',
  },
  breathing_pack_sleep: {
    id: 'breathing_pack_sleep',
    name: 'Sleep Pack',
    description: '5 sleep-inducing breathing patterns',
    priceStars: 79,
    type: 'one_time',
  },

  // Theme packs
  theme_pack_nature: {
    id: 'theme_pack_nature',
    name: 'Nature Themes',
    description: 'Forest, Ocean, Mountain visual themes',
    priceStars: 49,
    type: 'one_time',
  },

  // Donations
  donation_small: {
    id: 'donation_small',
    name: 'Support SleepCore',
    description: 'Small donation to support development',
    priceStars: 50,
    type: 'donation',
  },
  donation_medium: {
    id: 'donation_medium',
    name: 'Support SleepCore',
    description: 'Medium donation to support development',
    priceStars: 150,
    type: 'donation',
  },
  donation_large: {
    id: 'donation_large',
    name: 'Support SleepCore',
    description: 'Large donation to support development',
    priceStars: 500,
    type: 'donation',
  },
};

// Payment result callback
export type PaymentCallback = (status: InvoiceStatus, productId: ProductId) => void;

/**
 * Payments Service
 * Handles Telegram Stars payments for Premium features
 */
class PaymentsService {
  private pendingCallbacks = new Map<string, PaymentCallback>();
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Check if payments are available
   * Requires Telegram Mini App context
   */
  private checkAvailability(): boolean {
    try {
      // Check if we're in Telegram context
      return Boolean(WebApp.initData);
    } catch {
      return false;
    }
  }

  /**
   * Check if payments feature is available
   */
  canMakePayments(): boolean {
    return this.isAvailable;
  }

  /**
   * Get product by ID
   */
  getProduct(productId: ProductId): Product | null {
    return PRODUCTS[productId] ?? null;
  }

  /**
   * Get all products of a specific type
   */
  getProductsByType(type: Product['type']): Product[] {
    return Object.values(PRODUCTS).filter((p) => p.type === type);
  }

  /**
   * Get subscription products
   */
  getSubscriptions(): Product[] {
    return this.getProductsByType('subscription');
  }

  /**
   * Get one-time purchase products
   */
  getOneTimePurchases(): Product[] {
    return this.getProductsByType('one_time');
  }

  /**
   * Open invoice for a product
   *
   * The invoice_link must be generated by the backend using Bot API:
   * ```
   * bot.createInvoiceLink({
   *   title: product.name,
   *   description: product.description,
   *   payload: JSON.stringify({ productId, userId }),
   *   currency: 'XTR',
   *   prices: [{ label: product.name, amount: product.priceStars }],
   *   provider_token: '', // Empty for digital goods
   * })
   * ```
   *
   * @param invoiceLink - Invoice link from backend
   * @param productId - Product being purchased (for callback tracking)
   * @param onComplete - Callback when payment completes/cancels
   */
  openInvoice(
    invoiceLink: string,
    productId: ProductId,
    onComplete?: PaymentCallback
  ): void {
    if (!this.isAvailable) {
      console.error('[Payments] Not available outside Telegram');
      onComplete?.('failed', productId);
      return;
    }

    // Store callback for later
    if (onComplete) {
      this.pendingCallbacks.set(productId, onComplete);
    }

    try {
      WebApp.openInvoice(invoiceLink, (status) => {
        this.handleInvoiceResult(status as InvoiceStatus, productId);
      });

      // Haptic feedback for opening payment
      haptics.impact('medium');
    } catch (e) {
      console.error('[Payments] Failed to open invoice:', e);
      this.handleInvoiceResult('failed', productId);
    }
  }

  /**
   * Handle invoice result from Telegram
   */
  private handleInvoiceResult(status: InvoiceStatus, productId: ProductId): void {
    console.log(`[Payments] Invoice result: ${status} for ${productId}`);

    // Provide haptic feedback based on result
    switch (status) {
      case 'paid':
        haptics.notification('success');
        break;
      case 'cancelled':
        haptics.impact('light');
        break;
      case 'failed':
        haptics.notification('error');
        break;
    }

    // Call stored callback
    const callback = this.pendingCallbacks.get(productId);
    if (callback) {
      callback(status, productId);
      this.pendingCallbacks.delete(productId);
    }
  }

  /**
   * Request invoice link from backend and open payment
   *
   * @param productId - Product to purchase
   * @param apiBaseUrl - Backend API URL
   * @param onComplete - Callback when payment completes
   */
  async purchaseProduct(
    productId: ProductId,
    apiBaseUrl: string,
    onComplete?: PaymentCallback
  ): Promise<void> {
    const product = this.getProduct(productId);
    if (!product) {
      console.error('[Payments] Unknown product:', productId);
      onComplete?.('failed', productId);
      return;
    }

    try {
      // Request invoice link from backend
      const response = await fetch(`${apiBaseUrl}/payments/create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${WebApp.initData}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { invoiceLink: string };

      if (!data.invoiceLink) {
        throw new Error('No invoice link in response');
      }

      // Open the invoice
      this.openInvoice(data.invoiceLink, productId, onComplete);
    } catch (e) {
      console.error('[Payments] Failed to create invoice:', e);
      haptics.notification('error');
      onComplete?.('failed', productId);
    }
  }

  /**
   * Format price for display
   */
  formatPrice(priceStars: number): string {
    return `${priceStars} XTR`;
  }

  /**
   * Format price with currency symbol
   */
  formatPriceWithSymbol(priceStars: number): string {
    return `⭐ ${priceStars}`;
  }
}

// Export singleton instance
export const payments = new PaymentsService();

// Export type for testing
export type { PaymentsService };
