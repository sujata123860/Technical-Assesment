const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Base URL for the API
const BASE_URL = 'http://localhost:3000/api';

// Test functions
async function testHealthCheck() {
  try {
    console.log('\n=== Testing Health Check ===');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testFileUpload() {
  try {
    console.log('\n=== Testing File Upload ===');
    
    // Check if sample file exists
    const sampleFile = path.join(__dirname, 'sample-data.csv');
    if (!fs.existsSync(sampleFile)) {
      console.log('❌ Sample file not found:', sampleFile);
      return false;
    }
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(sampleFile));
    
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('✅ File Upload Success:');
    console.log('   Message:', response.data.message);
    console.log('   Stats:', response.data.stats);
    return true;
  } catch (error) {
    console.log('❌ File Upload Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPolicySearch() {
  try {
    console.log('\n=== Testing Policy Search ===');
    const response = await axios.get(`${BASE_URL}/policies/search/Alice`);
    console.log('✅ Policy Search Success:');
    console.log('   User:', response.data.user);
    console.log('   Policies Count:', response.data.policies.length);
    return true;
  } catch (error) {
    console.log('❌ Policy Search Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAggregatedPolicies() {
  try {
    console.log('\n=== Testing Aggregated Policies ===');
    const response = await axios.get(`${BASE_URL}/policies/aggregated`);
    console.log('✅ Aggregated Policies Success:');
    console.log('   Total Users with Policies:', response.data.length);
    if (response.data.length > 0) {
      console.log('   Sample User:', {
        name: response.data[0].userName,
        totalPolicies: response.data[0].totalPolicies,
        categories: response.data[0].categories
      });
    }
    return true;
  } catch (error) {
    console.log('❌ Aggregated Policies Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testScheduleMessage() {
  try {
    console.log('\n=== Testing Schedule Message ===');
    
    // Schedule a message for 1 minute from now
    const futureDate = new Date(Date.now() + 60000); // 1 minute from now
    const day = futureDate.toISOString().split('T')[0];
    const time = futureDate.toTimeString().split(' ')[0];
    
    const response = await axios.post(`${BASE_URL}/schedule-message`, {
      message: 'Test scheduled message from API test',
      day: day,
      time: time
    });
    
    console.log('✅ Schedule Message Success:');
    console.log('   Message:', response.data.message);
    console.log('   Scheduled for:', `${day} ${time}`);
    return true;
  } catch (error) {
    console.log('❌ Schedule Message Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAllAPIs() {
  console.log('🚀 Starting API Tests...');
  console.log('Make sure the server is running on http://localhost:3000');
  
  const results = {
    healthCheck: await testHealthCheck(),
    fileUpload: await testFileUpload(),
    policySearch: await testPolicySearch(),
    aggregatedPolicies: await testAggregatedPolicies(),
    scheduleMessage: await testScheduleMessage()
  };
  
  console.log('\n=== Test Results Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the server logs for more details.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAllAPIs().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testFileUpload,
  testPolicySearch,
  testAggregatedPolicies,
  testScheduleMessage,
  testAllAPIs
};