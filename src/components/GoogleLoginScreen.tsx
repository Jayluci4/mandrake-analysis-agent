import React from 'react';
import { GoogleLogin } from './GoogleLogin';

export const GoogleLoginScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
      <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mandrake Bioworks</h1>
          <p className="text-gray-400">AI-Powered Biomedical Research Platform</p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <GoogleLogin />
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800/50 text-gray-400">Secure Authentication</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Access advanced biomedical analysis tools</p>
            <p className="mt-1">Powered by Azure GPT-4 & Claude Sonnet</p>
          </div>
        </div>
      </div>
    </div>
  );
};