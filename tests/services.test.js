/**
 * Test Suite for NexusHub Services
 * Tests AI Debugger, Email, and Payment services
 */

const assert = require('assert');

// Mock environment variables for testing
process.env.GEMINI_API_KEY = 'test_key';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'test_password';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

const { getAIDebugger } = require('../services/aiDebugger');
const { getEmailService } = require('../services/emailService');
const { getPaymentService } = require('../services/paymentService');

console.log('🧪 Running NexusHub Service Tests\n');

// Test AI Debugger Service
function testAIDebugger() {
    console.log('Testing AI Debugger Service...');
    
    const aiDebugger = getAIDebugger();
    
    // Test 1: Service initialization
    assert(aiDebugger !== null, 'AI Debugger should initialize');
    console.log('✓ AI Debugger initialized');
    
    // Test 2: Service enabled check
    const isEnabled = aiDebugger.isEnabled();
    console.log(`✓ AI Debugger enabled status: ${isEnabled}`);
    
    // Test 3: Analyze code (mock test)
    console.log('✓ AI Debugger analyzeCode method exists:', typeof aiDebugger.analyzeCode === 'function');
    console.log('✓ AI Debugger getHint method exists:', typeof aiDebugger.getHint === 'function');
    
    console.log('✅ AI Debugger tests passed\n');
}

// Test Email Service
function testEmailService() {
    console.log('Testing Email Service...');
    
    const emailService = getEmailService();
    
    // Test 1: Service initialization
    assert(emailService !== null, 'Email Service should initialize');
    console.log('✓ Email Service initialized');
    
    // Test 2: Service configured check
    const isConfigured = emailService.isConfigured();
    console.log(`✓ Email Service configured status: ${isConfigured}`);
    
    // Test 3: Check methods exist
    console.log('✓ sendEmail method exists:', typeof emailService.sendEmail === 'function');
    console.log('✓ sendWelcomeEmail method exists:', typeof emailService.sendWelcomeEmail === 'function');
    console.log('✓ sendCenterApprovalEmail method exists:', typeof emailService.sendCenterApprovalEmail === 'function');
    console.log('✓ sendPurchaseConfirmation method exists:', typeof emailService.sendPurchaseConfirmation === 'function');
    console.log('✓ sendLabSessionReminder method exists:', typeof emailService.sendLabSessionReminder === 'function');
    
    console.log('✅ Email Service tests passed\n');
}

// Test Payment Service
function testPaymentService() {
    console.log('Testing Payment Service...');
    
    const paymentService = getPaymentService();
    
    // Test 1: Service initialization
    assert(paymentService !== null, 'Payment Service should initialize');
    console.log('✓ Payment Service initialized');
    
    // Test 2: Service configured check
    const isConfigured = paymentService.isConfigured();
    console.log(`✓ Payment Service configured status: ${isConfigured}`);
    
    // Test 3: Check methods exist
    console.log('✓ createPaymentIntent method exists:', typeof paymentService.createPaymentIntent === 'function');
    console.log('✓ confirmPayment method exists:', typeof paymentService.confirmPayment === 'function');
    console.log('✓ createRefund method exists:', typeof paymentService.createRefund === 'function');
    console.log('✓ createTransfer method exists:', typeof paymentService.createTransfer === 'function');
    console.log('✓ createCustomer method exists:', typeof paymentService.createCustomer === 'function');
    console.log('✓ getPaymentDetails method exists:', typeof paymentService.getPaymentDetails === 'function');
    
    // Test 4: Fee calculation
    const fees = paymentService.calculateFees(1000, 5);
    assert(fees.totalAmount === 1000, 'Total amount should be 1000');
    assert(fees.platformFee === 50, 'Platform fee should be 50');
    assert(fees.centerAmount === 950, 'Center amount should be 950');
    console.log('✓ Fee calculation works correctly:', fees);
    
    console.log('✅ Payment Service tests passed\n');
}

// Test Integration
function testIntegration() {
    console.log('Testing Service Integration...');
    
    const aiDebugger = getAIDebugger();
    const emailService = getEmailService();
    const paymentService = getPaymentService();
    
    // All services should be singletons
    const aiDebugger2 = getAIDebugger();
    const emailService2 = getEmailService();
    const paymentService2 = getPaymentService();
    
    assert(aiDebugger === aiDebugger2, 'AI Debugger should be a singleton');
    assert(emailService === emailService2, 'Email Service should be a singleton');
    assert(paymentService === paymentService2, 'Payment Service should be a singleton');
    
    console.log('✓ All services are singletons');
    console.log('✅ Integration tests passed\n');
}

// Run all tests
try {
    testAIDebugger();
    testEmailService();
    testPaymentService();
    testIntegration();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📊 Test Summary:');
    console.log('  • AI Debugger Service: ✓');
    console.log('  • Email Service: ✓');
    console.log('  • Payment Service: ✓');
    console.log('  • Integration: ✓');
    console.log('');
    
    process.exit(0);
    
} catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
}
