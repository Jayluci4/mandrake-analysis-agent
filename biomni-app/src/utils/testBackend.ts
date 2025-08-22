/**
 * Test backend connection
 */

import biomniApi from '../services/biomniApi';

export const testBackendConnection = async () => {
  console.log('🔍 Testing Biomni Backend Connection...');
  console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:8000');
  
  try {
    // Test session creation
    console.log('Testing session creation...');
    const session = await biomniApi.session.create('Test Session');
    console.log('✅ Session created:', session);
    
    // Test listing sessions
    console.log('Testing session listing...');
    const sessions = await biomniApi.session.list();
    console.log('✅ Sessions:', sessions);
    
    // Test tools listing
    console.log('Testing tools listing...');
    const tools = await biomniApi.tools.list();
    console.log('✅ Available tools:', tools);
    
    console.log('🎉 Backend connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    console.log('Make sure the Biomni backend is running on', import.meta.env.VITE_API_URL);
    return false;
  }
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testBackend = testBackendConnection;
}