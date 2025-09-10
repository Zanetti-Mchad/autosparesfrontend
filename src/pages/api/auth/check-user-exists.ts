import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/env';

/**
 * API handler for checking if a user exists in the backend database
 * This is a proxy to your actual backend to verify users
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { identifier, type } = req.body;

    // Validate required fields
    if (!identifier || !type) {
      return res.status(400).json({ 
        message: 'Identifier and type are required',
        exists: false
      });
    }

    // For phone number verification, we want to check with the integration/user endpoint
    // This endpoint should verify if the phone number exists in your database
    const apiEndpoint = `${env.BACKEND_API_URL}/api/v1/integration/user`;
    
    // Make a request to your actual backend API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        // Send the phone number in the format your API expects
        [type === 'phone' ? 'phoneNumber' : 'email']: identifier
      }),
    });

    const data = await response.json();
    console.log('User verification response from backend:', data);
    
    // If there's an error with the backend request
    if (!response.ok) {
      // If user not found or inactive
      if (response.status === 404 || 
          data.message?.includes('not exist') || 
          data.message?.includes('not active') ||
          data.status?.returnCode !== "00") {
        return res.status(404).json({
          exists: false,
          message: data.message || data.status?.returnMessage || 'User not found or inactive'
        });
      }
      
      // For other backend errors
      return res.status(response.status).json({
        exists: false,
        message: data.message || data.status?.returnMessage || 'Error checking user status'
      });
    }

    // User exists if we receive a successful response and there's user data
    const userExists = response.ok && (data.user || data.data?.user || data.exists === true);
    
    return res.status(200).json({
      exists: userExists,
      message: userExists ? 'User found' : 'User not found',
      userId: data.user?.id || data.data?.user?.id // Include user ID if available
    });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return res.status(500).json({
      exists: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
} 