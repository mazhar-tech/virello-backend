#!/usr/bin/env node

/**
 * Test script to verify keep-alive functionality
 * This script tests the health endpoint and keep-alive service
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://virello-backend.onrender.com';
const HEALTH_ENDPOINT = '/health';

async function testHealthEndpoint() {
  console.log('🔍 Testing health endpoint...');
  console.log(`📡 URL: ${BACKEND_URL}${HEALTH_ENDPOINT}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(`${BACKEND_URL}${HEALTH_ENDPOINT}`, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Keep-Alive-Test/1.0',
      }
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Health endpoint test successful!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.log('❌ Health endpoint test failed!');
    console.log(`🚨 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Response data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('🚨 No response received - possible network issue or server down');
    }
    
    return false;
  }
}

async function testKeepAliveService() {
  console.log('\n🔍 Testing keep-alive service...');
  
  try {
    const KeepAliveService = require('./keep-alive.js');
    const keepAlive = new KeepAliveService();
    
    console.log('📊 Keep-alive service status:', keepAlive.getStatus());
    
    // Test a single ping
    console.log('🔍 Testing single ping...');
    const pingResult = await keepAlive.pingBackend();
    
    if (pingResult) {
      console.log('✅ Single ping test successful!');
    } else {
      console.log('❌ Single ping test failed!');
    }
    
    return pingResult;
  } catch (error) {
    console.log('❌ Keep-alive service test failed!');
    console.log(`🚨 Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Keep-Alive Test Suite');
  console.log('========================');
  
  const healthTest = await testHealthEndpoint();
  const keepAliveTest = await testKeepAliveService();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Health Endpoint: ${healthTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Keep-Alive Service: ${keepAliveTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (healthTest && keepAliveTest) {
    console.log('\n🎉 All tests passed! Keep-alive should work correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testHealthEndpoint, testKeepAliveService };
