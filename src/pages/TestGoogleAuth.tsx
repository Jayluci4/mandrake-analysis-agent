// AIDEV-NOTE: Test page for Google OAuth debugging
// This page helps verify OAuth configuration and troubleshoot 403 errors
// Client ID: 998207005259-5bthp799gd6mcsbumuf0v9jjt5j8h0nk.apps.googleusercontent.com

import React, { useState } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

const TestGoogleAuth: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useGoogleAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const runDiagnostics = () => {
    const results: string[] = [];

    // Check environment variables
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    results.push(`✅ Google Client ID configured: ${clientId ? 'Yes' : 'No'}`);
    if (clientId) {
      results.push(`   Client ID: ${clientId.substring(0, 20)}...`);
    }

    // Check current URL
    results.push(`✅ Current origin: ${window.location.origin}`);
    results.push(`   This URL must be in Google Cloud Console authorized origins`);

    // Check localStorage
    const storedUser = localStorage.getItem('google_user');
    const storedToken = localStorage.getItem('google_access_token');
    results.push(`✅ Stored user session: ${storedUser ? 'Found' : 'Not found'}`);
    results.push(`✅ Stored access token: ${storedToken ? 'Found' : 'Not found'}`);

    // Check auth state
    results.push(`✅ Authentication status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    results.push(`✅ Loading state: ${isLoading ? 'Loading' : 'Ready'}`);

    setTestResults(results);
  };

  const testProfileImage = async () => {
    if (user?.picture) {
      try {
        const response = await fetch(user.picture, {
          mode: 'no-cors'
        });
        console.log('Profile image test completed');
        setTestResults(prev => [...prev, `✅ Profile image URL accessible: ${user.picture}`]);
      } catch (error) {
        console.error('Profile image test failed:', error);
        setTestResults(prev => [...prev, `❌ Profile image URL error: ${error}`]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Google OAuth Test Page</h1>

        {/* Authentication Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          {isLoading ? (
            <p>Loading authentication state...</p>
          ) : isAuthenticated && user ? (
            <div className="space-y-2">
              <p>✅ Authenticated as: {user.name}</p>
              <p>Email: {user.email}</p>
              <p>User ID: {user.id}</p>
              {user.picture && (
                <div>
                  <p>Profile Picture URL:</p>
                  <code className="text-xs bg-gray-700 p-1 rounded break-all">{user.picture}</code>
                  <div className="mt-2">
                    <img
                      src={user.picture}
                      alt="Profile"
                      className="w-20 h-20 rounded-full border-2 border-green-500"
                      onError={(e) => {
                        console.error('Image load error in test page');
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0Qjc1OTkiLz4KPHRleHQgeD0iNDAiIHk9IjQ1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj57dXNlci5uYW1lID8gdXNlci5uYW1lWzBdLnRvVXBwZXJDYXNlKCkgOiAnVSd9PC90ZXh0Pgo8L3N2Zz4=';
                      }}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>❌ Not authenticated</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            {!isAuthenticated ? (
              <button
                onClick={login}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Sign in with Google
              </button>
            ) : (
              <button
                onClick={logout}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            )}
            <button
              onClick={runDiagnostics}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Run Diagnostics
            </button>
            {user?.picture && (
              <button
                onClick={testProfileImage}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Test Profile Image
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Results */}
        {testResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting Guide */}
        <div className="mt-8 bg-blue-900/30 rounded-lg p-6 border border-blue-700">
          <h2 className="text-xl font-semibold mb-4">📋 Troubleshooting 403 Error</h2>
          <ol className="space-y-3 list-decimal list-inside">
            <li>
              Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Cloud Console</a>
            </li>
            <li>Select your project</li>
            <li>Navigate to APIs & Services → Credentials</li>
            <li>Click on your OAuth 2.0 Client ID</li>
            <li>Add these to Authorized JavaScript origins:
              <ul className="ml-6 mt-2 space-y-1">
                <li><code className="bg-gray-700 px-2 py-1 rounded">http://localhost:3000</code></li>
                <li><code className="bg-gray-700 px-2 py-1 rounded">http://localhost:3001</code></li>
                <li><code className="bg-gray-700 px-2 py-1 rounded">http://localhost:3002</code></li>
                <li><code className="bg-gray-700 px-2 py-1 rounded">{window.location.origin}</code> (current)</li>
              </ul>
            </li>
            <li>Save changes and wait 5-10 minutes for propagation</li>
            <li>Clear browser cache and try again</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestGoogleAuth;