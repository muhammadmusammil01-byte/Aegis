/**
 * Payment Gateway Service
 * Integrates with Stripe for secure payment processing
 */

const stripe = require('stripe');

class PaymentService {
  constructor() {
    this.configured = false;
    this.stripe = null;
    
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey === 'your_stripe_secret_key_here') {
      console.warn('⚠️  Stripe API key not configured. Payment processing will be disabled.');
      return;
    }
    
    try {
      this.stripe = stripe(apiKey);
      this.configured = true;
      console.log('✓ Payment service initialized with Stripe');
    } catch (error) {
      console.error('✗ Payment service initialization failed:', error.message);
    }
  }

  /**
   * Create a payment intent for project purchase
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (default: usd)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm a payment
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>}
   */
  async confirmPayment(paymentIntentId) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from cents
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a refund
   * @param {string} paymentIntentId - Payment intent ID
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Promise<Object>}
   */
  async createRefund(paymentIntentId, amount = null) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const refundData = { payment_intent: paymentIntentId };
      
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a transfer to center's connected account
   * @param {string} destinationAccountId - Stripe connected account ID
   * @param {number} amount - Amount to transfer
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  async createTransfer(destinationAccountId, amount, metadata = {}) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: destinationAccountId,
        metadata
      });

      return {
        success: true,
        transferId: transfer.id,
        amount: transfer.amount / 100,
        destination: transfer.destination
      };
    } catch (error) {
      console.error('Transfer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a customer
   * @param {string} email - Customer email
   * @param {string} name - Customer name
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  async createCustomer(email, name, metadata = {}) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        success: true,
        customerId: customer.id,
        email: customer.email
      };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve payment details
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>}
   */
  async getPaymentDetails(paymentIntentId) {
    if (!this.configured) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        payment: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          created: new Date(paymentIntent.created * 1000),
          metadata: paymentIntent.metadata
        }
      };
    } catch (error) {
      console.error('Payment details retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Webhook signature verification
   * @param {string} payload - Request body
   * @param {string} signature - Stripe signature header
   * @returns {Object|null}
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.configured) {
      return null;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return null;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      return event;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return null;
    }
  }

  /**
   * Calculate platform fee and distribution
   * @param {number} amount - Total amount
   * @param {number} platformFeePercent - Platform fee percentage (default: 5%)
   * @returns {Object}
   */
  calculateFees(amount, platformFeePercent = 5) {
    const platformFee = (amount * platformFeePercent) / 100;
    const centerAmount = amount - platformFee;

    return {
      totalAmount: amount,
      platformFee: Math.round(platformFee * 100) / 100,
      centerAmount: Math.round(centerAmount * 100) / 100,
      platformFeePercent
    };
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.configured;
  }
}

// Singleton instance
let paymentServiceInstance = null;

/**
 * Get Payment Service instance
 * @returns {PaymentService}
 */
function getPaymentService() {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}

module.exports = {
  PaymentService,
  getPaymentService
};
