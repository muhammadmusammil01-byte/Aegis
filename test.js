#!/usr/bin/env node

/**
 * NexusHub Platform Test Script
 * Tests core backend functionality
 */

const http = require('http');
const { Pool } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Test 1: Check if dependencies are installed
async function testDependencies() {
  log('\n📦 Test 1: Checking dependencies...', 'blue');
  
  try {
    require('express');
    require('pg');
    require('socket.io');
    require('jsonwebtoken');
    require('bcrypt');
    require('dotenv');
    
    log('✓ All required dependencies are installed', 'green');
    results.passed++;
    results.tests.push({ name: 'Dependencies Check', status: 'PASSED' });
    return true;
  } catch (error) {
    log(`✗ Missing dependency: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Dependencies Check', status: 'FAILED', error: error.message });
    return false;
  }
}

// Test 2: Check database configuration
async function testDatabaseConfig() {
  log('\n🗄️  Test 2: Checking database configuration...', 'blue');
  
  try {
    const dbConfig = require('./config/database');
    
    if (dbConfig.pool && dbConfig.query && dbConfig.getClient) {
      log('✓ Database configuration is valid', 'green');
      results.passed++;
      results.tests.push({ name: 'Database Config', status: 'PASSED' });
      return true;
    } else {
      throw new Error('Invalid database configuration structure');
    }
  } catch (error) {
    log(`✗ Database configuration error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Database Config', status: 'FAILED', error: error.message });
    return false;
  }
}

// Test 3: Check middleware
async function testMiddleware() {
  log('\n🔐 Test 3: Checking authentication middleware...', 'blue');
  
  try {
    const auth = require('./middleware/authMiddleware');
    
    if (auth.authenticateToken && auth.checkRole && auth.generateToken) {
      log('✓ Authentication middleware is valid', 'green');
      results.passed++;
      results.tests.push({ name: 'Auth Middleware', status: 'PASSED' });
      return true;
    } else {
      throw new Error('Invalid middleware structure');
    }
  } catch (error) {
    log(`✗ Middleware error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Auth Middleware', status: 'FAILED', error: error.message });
    return false;
  }
}

// Test 4: Check routes
async function testRoutes() {
  log('\n🛣️  Test 4: Checking route files...', 'blue');
  
  const routes = [
    'authRoutes',
    'marketplaceRoutes',
    'systemAdminRoutes',
    'centerAdminRoutes',
    'mentorRoutes',
    'studentRoutes',
    'escrowRoutes'
  ];
  
  let allValid = true;
  
  for (const route of routes) {
    try {
      require(`./routes/${route}`);
      log(`  ✓ ${route} loaded`, 'green');
    } catch (error) {
      log(`  ✗ ${route} failed: ${error.message}`, 'red');
      allValid = false;
    }
  }
  
  if (allValid) {
    log('✓ All routes are valid', 'green');
    results.passed++;
    results.tests.push({ name: 'Routes Check', status: 'PASSED' });
  } else {
    log('✗ Some routes failed to load', 'red');
    results.failed++;
    results.tests.push({ name: 'Routes Check', status: 'FAILED' });
  }
  
  return allValid;
}

// Test 5: Check WebSocket implementation
async function testWebSocket() {
  log('\n🔌 Test 5: Checking WebSocket implementation...', 'blue');
  
  try {
    const ws = require('./websocket/virtualLab');
    
    if (ws.initializeWebSocket && typeof ws.initializeWebSocket === 'function') {
      log('✓ WebSocket Virtual Lab is valid', 'green');
      results.passed++;
      results.tests.push({ name: 'WebSocket', status: 'PASSED' });
      return true;
    } else {
      throw new Error('Invalid WebSocket implementation');
    }
  } catch (error) {
    log(`✗ WebSocket error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'WebSocket', status: 'FAILED', error: error.message });
    return false;
  }
}

// Test 6: Check frontend files
async function testFrontend() {
  log('\n🎨 Test 6: Checking frontend files...', 'blue');
  
  const fs = require('fs');
  const path = require('path');
  
  const files = [
    'public/nexushub-index.html',
    'public/nexushub-marketplace.html',
    'public/login.html',
    'public/register.html',
    'public/dashboards/system-admin.html',
    'public/dashboards/center-admin.html',
    'public/dashboards/mentor.html',
    'public/dashboards/student.html'
  ];
  
  let allExist = true;
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log(`  ✓ ${file} exists`, 'green');
    } else {
      log(`  ✗ ${file} missing`, 'red');
      allExist = false;
    }
  }
  
  if (allExist) {
    log('✓ All frontend files are present', 'green');
    results.passed++;
    results.tests.push({ name: 'Frontend Files', status: 'PASSED' });
  } else {
    log('✗ Some frontend files are missing', 'red');
    results.failed++;
    results.tests.push({ name: 'Frontend Files', status: 'FAILED' });
  }
  
  return allExist;
}

// Test 7: JWT Token Generation
async function testJWT() {
  log('\n🔑 Test 7: Testing JWT token generation...', 'blue');
  
  try {
    const { generateToken, verifyToken } = require('./middleware/authMiddleware');
    
    const testUser = {
      user_id: 1,
      email: 'test@example.com',
      role: 'student',
      full_name: 'Test User'
    };
    
    const token = generateToken(testUser);
    const decoded = verifyToken(token);
    
    if (decoded && decoded.email === testUser.email) {
      log('✓ JWT generation and verification works', 'green');
      results.passed++;
      results.tests.push({ name: 'JWT Test', status: 'PASSED' });
      return true;
    } else {
      throw new Error('Token verification failed');
    }
  } catch (error) {
    log(`✗ JWT test failed: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'JWT Test', status: 'FAILED', error: error.message });
    return false;
  }
}

// Run all tests
async function runTests() {
  log('\n🚀 NexusHub Platform Test Suite', 'blue');
  log('================================\n', 'blue');
  
  await testDependencies();
  await testDatabaseConfig();
  await testMiddleware();
  await testRoutes();
  await testWebSocket();
  await testFrontend();
  await testJWT();
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log('===============', 'blue');
  log(`\nTotal Tests: ${results.passed + results.failed}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  log('\nDetailed Results:');
  results.tests.forEach(test => {
    const color = test.status === 'PASSED' ? 'green' : 'red';
    log(`  ${test.status === 'PASSED' ? '✓' : '✗'} ${test.name}: ${test.status}`, color);
    if (test.error) {
      log(`    Error: ${test.error}`, 'yellow');
    }
  });
  
  log('\n');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! Platform is ready to run.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Set up PostgreSQL database: createdb nexushub');
    log('2. Run schema: psql -U postgres -d nexushub -f database/schema.sql');
    log('3. Start server: npm run dev');
    log('4. Access: http://localhost:3000\n');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please fix the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test runner error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
