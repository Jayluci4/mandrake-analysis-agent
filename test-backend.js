// Quick test script to check Railway backend
const backendUrl = 'https://web-production-bcffa.up.railway.app';

async function testBackend() {
  console.log('Testing backend at:', backendUrl);
  
  try {
    // Test root
    console.log('\n1. Testing root endpoint...');
    const rootResponse = await fetch(backendUrl);
    console.log('Root status:', rootResponse.status);
    console.log('Root headers:', Object.fromEntries(rootResponse.headers.entries()));
    const rootText = await rootResponse.text();
    console.log('Root response (first 200 chars):', rootText.substring(0, 200));
    
    // Test /health
    console.log('\n2. Testing /health endpoint...');
    const healthResponse = await fetch(`${backendUrl}/health`);
    console.log('Health status:', healthResponse.status);
    console.log('Health headers:', Object.fromEntries(healthResponse.headers.entries()));
    const healthText = await healthResponse.text();
    console.log('Health response:', healthText);
    
    // Test /api/health (in case it's prefixed)
    console.log('\n3. Testing /api/health endpoint...');
    const apiHealthResponse = await fetch(`${backendUrl}/api/health`);
    console.log('API Health status:', apiHealthResponse.status);
    const apiHealthText = await apiHealthResponse.text();
    console.log('API Health response:', apiHealthText);
    
  } catch (error) {
    console.error('Error testing backend:', error);
  }
}

testBackend();