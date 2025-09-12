"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { fetchApi } from '@/lib/apiConfig';

const LogoutPage = () => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Get the access token and user ID before clearing storage
      const accessToken = localStorage.getItem('accessToken');
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      
      // Call the logout API endpoint (which also logs the action)
      await fetchApi('/logout/logout', {
        method: 'POST',
        body: JSON.stringify({ 
          userId, 
          status: "SUCCESSFUL" 
        })
      });
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to sign-in page
      router.push('/sign-in');
      
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Try to log the failed logout attempt
      try {
        const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
        const accessToken = localStorage.getItem('accessToken');
        
        await fetchApi('/logout/logout', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            status: "FAILED"
          })
        });
      } catch (logError) {
        console.error('Failed to create logout log:', logError);
      }
      
      setIsLoggingOut(false);
      alert('Failed to logout. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center pt-20">
      <Card className="w-96">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6">Sign Out</h2>
          <p className="text-center mb-6">Are you sure you want to sign out?</p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleCancel}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Page() {
  return <LogoutPage />;
}