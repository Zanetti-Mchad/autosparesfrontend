"use client";
import React, { useState, useEffect, useCallback } from "react";
import { env } from "@/env"; // Assuming env.ts is in src
import Link from 'next/link';
import Image from 'next/image';
import NewPagination from '@/components/NewPagination';
import { supabase } from '@/lib/supabaseClient';

// Types for our data structures
interface UserData {
  id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  initials?: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  section?: string;
  role: string;
  salary?: string;
  utility?: string;
  nameOfBank?: string;
  accountNumber?: string;
  mobileMoneyNumber?: string;
  registeredName?: string;
  staffPhoto?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SecurityLog {
  id: string;
  date: string;
  action: string;
  status: 'Successful' | 'Failed';
}

interface LoginLog {
  id: string;
  timestamp: string;
  action: string;
  status: string;
}

// Add interface for log data from API
interface LogData {
  id?: string;
  timestamp?: string;
  date?: string;
  action?: string;
  status?: string;
}

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('profile-section');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    address: '',
    role: '',
    salary: '',
  });
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Password reset states
  const [verificationMethod, setVerificationMethod] = useState('email');
  const [verificationContact, setVerificationContact] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Function to get Supabase URL for staff photos
  const getStaffPhotoUrl = useCallback(async (photoFileName: string | null) => {
    if (!photoFileName) return null;
    
    try {
      const { data, error } = await supabase.storage
        .from('staff-photos')
        .createSignedUrl(photoFileName, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL for staff photo:', error);
        return null;
      }
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting staff photo URL:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const rawToken = localStorage.getItem('accessToken');
    console.log('[Profile Page] Raw token from localStorage on mount:', rawToken);

    if (rawToken && rawToken !== "null" && rawToken !== "undefined" && rawToken.trim() !== "") {
      setAccessToken(rawToken);
      console.log('[Profile Page] Valid token set to state:', rawToken);
    } else {
      console.warn('[Profile Page] No valid token found in localStorage or token is invalid string.');
      setAccessToken(null); // Explicitly set to null if invalid
      setError('Authentication token is missing or invalid. Please log in again.');
      setUserData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        address: '',
        role: '',
        salary: '',
      });
      setProfilePhoto(null);
      setIsLoading(false);
    }

    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user && user.staffPhoto && user.staffPhoto !== 'undefined' && user.staffPhoto !== null && user.staffPhoto !== '') {
          // For existing local photos, we'll handle them in fetchProfileData
          // This is just for initial load from localStorage
          const photoPath = user.staffPhoto.startsWith('http')
            ? user.staffPhoto
            : user.staffPhoto.startsWith('/')
              ? user.staffPhoto
              : `/images/staff/${user.staffPhoto}`;
          setProfilePhoto(photoPath);
        }
      } catch (e) {
        console.error('[Profile Page] Error parsing user from localStorage:', e);
      }
    }
  }, []);

  // Memoize fetchProfileData with useCallback
  const fetchProfileData = useCallback(async () => {
    console.log('[Profile Page] fetchProfileData called. Current accessToken from state:', accessToken);
    if (!accessToken) {
      console.warn('[Profile Page] fetchProfileData: accessToken is null or empty in state. Aborting fetch.');
      // setError('Authentication token not available. Please log in again.'); // Already handled by initial load potentially
      setIsLoading(false); // Ensure loading state is reset if we abort
      return;
    }

    console.log('[Profile Page] Token is present. Validating structure:', accessToken);
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      console.error('[Profile Page] Invalid JWT structure:', accessToken);
      setError('Invalid token structure. Please log in again.');
      setIsLoading(false);
      return;
    }

    let userId;
    try {
      const tokenPayloadString = atob(tokenParts[1]);
      const tokenPayload = JSON.parse(tokenPayloadString);
      userId = tokenPayload.id;
      if (!userId) {
        console.error('[Profile Page] Could not extract userId from token payload:', tokenPayload);
        throw new Error('User ID not found in token.');
      }
    } catch (parseError: any) {
      console.error('[Profile Page] Error parsing token or extracting userId:', parseError.message);
      setError('Failed to parse token. Please log in again.');
      setIsLoading(false);
      setUserData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        address: '',
        role: '',
        salary: '',
      });
      setProfilePhoto(null);
      setVerificationContact('');
    }
    console.log('[Profile Page] Token parsed successfully. UserId:', userId);

    // Original main try block for API calls starts here
    try {
      setIsLoading(true);
      setError(''); // Clear previous errors before new attempt
      // The original code from here (fetching user data, logs) should use the `userId` variable defined above.
      
      console.log('Fetching user data with:', { userId, accessToken });
      
      // Fetch user data
      const userResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userDataApiResponse = await userResponse.json();
      console.log('[Profile Page] User data API response:', userDataApiResponse);

      if (userDataApiResponse && userDataApiResponse.status?.returnCode === "00" && userDataApiResponse.data) {
        const apiProfileData = userDataApiResponse.data.user; // <-- FIXED: extract user object

        // Map API data to UserData state (camelCase)
        const finalUserProfile: UserData = {
          id: apiProfileData.id || userId,
          firstName: apiProfileData.first_name || '',
          lastName: apiProfileData.last_name || '',
          middleName: apiProfileData.middle_name || '',
          initials: apiProfileData.initials || '',
          email: apiProfileData.email || '',
          phone: apiProfileData.phone || '',
          gender: apiProfileData.gender || '',
          address: apiProfileData.address || '',
          role: apiProfileData.role || '',
          section: apiProfileData.section || '',
          salary: apiProfileData.salary || '',
          utility: apiProfileData.utility || '',
          nameOfBank: apiProfileData.name_of_bank || '',
          accountNumber: apiProfileData.account_number || '',
          mobileMoneyNumber: apiProfileData.mobile_money_number || '',
          registeredName: apiProfileData.registered_name || '',
          staffPhoto: apiProfileData.staff_photo || '', // Filename from API
          emailVerified: apiProfileData.email_verified || false,
          isActive: apiProfileData.is_active !== undefined ? apiProfileData.is_active : (apiProfileData.isActive !== undefined ? apiProfileData.isActive : false),
          createdAt: apiProfileData.createdAt || apiProfileData.created_at || '',
          updatedAt: apiProfileData.updatedAt || apiProfileData.updated_at || ''
        };

        setUserData(finalUserProfile);

        // Handle staff photo - get Supabase URL if it exists
        if (finalUserProfile.staffPhoto) {
          const photoUrl = await getStaffPhotoUrl(finalUserProfile.staffPhoto);
          if (photoUrl) {
            setProfilePhoto(photoUrl);
          } else {
            // Fallback to default profile picture if Supabase URL fails
            setProfilePhoto('/profile-picture.jpg');
          }
        } else {
          // No photo available, use default
          setProfilePhoto('/profile-picture.jpg');
        }
        
        if (finalUserProfile.email) {
          setVerificationContact(finalUserProfile.email);
        }
      } else {
        const errorMessage = userDataApiResponse?.status?.returnMessage || 'Failed to process user data or invalid data structure.';
        console.error('[Profile Page] Error processing user data:', errorMessage, userDataApiResponse);
        setError(errorMessage); // Set error state for UI
        throw new Error(errorMessage);
      }

      // Fetch logs with pagination
      try {
        const logsResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/logs/logs/${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!logsResponse.ok) {
          throw new Error('Failed to fetch logs');
        }

        const logsData = await logsResponse.json();
        console.log('Raw logs data:', logsData);

        if (logsData && logsData.status?.returnCode === "00") {
          // Ensure we're getting an array of logs
          const logs = Array.isArray(logsData.data) ? logsData.data : [];
          
          // Format the logs to ensure consistent structure
          const formattedLogs = logs.map((log: LogData) => ({
            id: log.id || String(Date.now()),
            date: log.date || log.timestamp || new Date().toISOString(),
            action: log.action || 'UNKNOWN',
            status: (log.status === 'SUCCESS' || log.status === 'SUCCESSFUL') ? 'Success' : 'Failed'
          }));

          // Sort logs by date in descending order (newest first)
          formattedLogs.sort((a: SecurityLog, b: SecurityLog) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // Calculate pagination
          const itemsPerPage = 5;
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          
          // Get the logs for the current page
          const paginatedLogs = formattedLogs.slice(startIndex, endIndex);
          
          setSecurityLogs(paginatedLogs);
          setTotalItems(formattedLogs.length);
          setTotalPages(Math.ceil(formattedLogs.length / itemsPerPage));
        }
      } catch (logError) {
        console.error('Error fetching logs:', logError);
        setSecurityLogs([]);
        setTotalItems(0);
        setTotalPages(1);
      }

    } catch (error) {
      console.error('Error in fetchProfileData:', error);
      showMessage('Failed to fetch profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, accessToken, getStaffPhotoUrl]); // Add getStaffPhotoUrl as dependency

  // Update useEffect to use the memoized function
  useEffect(() => {
    console.log('[Profile Page] Effect to call fetchProfileData. Current accessToken from state:', accessToken);
    if (accessToken) {
      console.log('[Profile Page] AccessToken is present in state, calling fetchProfileData.');
      fetchProfileData();
    } else {
      console.warn('[Profile Page] AccessToken is NOT present in state, NOT calling fetchProfileData yet.');
      // setError('Waiting for authentication token...'); // Inform user
      // setIsLoading(false); // If we are waiting, don't show loading for fetch
    }
  }, [accessToken, fetchProfileData]); // fetchProfileData's own dependencies (accessToken, currentPage) will trigger it correctly

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };


  

  const closeModal = () => {
    setShowModal(false);
    setModalMessage('');
  };

  const showMessage = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

  // OTP-based password reset functions
  const handleSendOTP = async () => {
    if (!verificationContact) {
      showMessage('Please enter your email or phone number');
      return;
    }
    
    setPasswordLoading(true);
    setError('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const requestBody = {
        identifier: verificationContact,
        ...(verificationMethod === 'email' && { baseUrl: 'http://yourwebsite.com' })
      };
      
      console.log('Sending password reset request with:', requestBody);
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/auth/request-password-reset`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: headers,
      });
      
      const data = await response.json();
      console.log('Password reset request response:', data);
      
      if (!response.ok || (data.status && data.status.returnCode !== "00")) {
        throw new Error(data.message || (data.status && data.status.returnMessage) || 'Failed to send verification code');
      }
      
      setOtpSent(true);
      showMessage('Verification code sent successfully! Please check your ' + 
        (verificationMethod === 'email' ? 'email' : 'phone') + ' for the code.');
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');
      showMessage(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOtpResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showMessage('New password and confirm password do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      showMessage('Password must be at least 8 characters long');
      return;
    }
    
    setPasswordLoading(true);
    setError('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const requestBody = {
        token: otp,
        newPassword
      };
      
      console.log('Sending password reset request:', requestBody);
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      console.log('Password reset API response:', data);
      
      if (!response.ok || (data.status && data.status.returnCode !== "00")) {
        throw new Error(data.message || (data.status?.returnMessage) || 'Password reset failed');
      }
      
      // Create log for successful password reset
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const logResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/logs/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId,
          action: "PASSWORD_RESET",
          status: "SUCCESS"
        })
      });

      const logData = await logResponse.json();
      console.log('Log creation response:', logData);

      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      
      // Show success message and redirect after a short delay
      showMessage('Password has been successfully changed! Redirecting to login...');
      
      // Clear local storage
      localStorage.clear();
      
      // Redirect to sign-in page after 2 seconds
      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 2000);
      
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Password reset failed. Please try again.');
      showMessage(err.message || 'Password reset failed. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Test log creation directly
  const createSecurityLog = async (userId: string, action: string, status: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/logs/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId,
          action,
          status
        })
      });

      const data = await response.json();
      console.log('Log creation test:', data);
      return data;
    } catch (error) {
      console.error('Log creation test error:', error);
      return null;
    }
  };

  // Add this function to test log creation
  const testLogCreation = async () => {
    const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
    const accessToken = localStorage.getItem('accessToken');
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/logs/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: userId,
          action: "TEST_LOG",
          status: "SUCCESSFUL"
        })
      });

      const data = await response.json();
      console.log('Test log response:', data);
      return data;
    } catch (error) {
      console.error('Test log error:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      
      <div className="container mx-auto px-4 py-2 max-w-4xl flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-1/4">
          <div className="flex flex-col space-y-4">
            {['Profile', 'Password', 'Logs'].map((tab) => (
              <button 
                key={tab}
                onClick={() => handleTabChange(`${tab.toLowerCase()}-section`)}
                className={`w-full px-4 py-2 rounded-md transition duration-200 ${
                  activeTab === `${tab.toLowerCase()}-section`
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                {`My ${tab}`}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full md:w-3/4">
          {/* Profile Section */}
          {activeTab === 'profile-section' && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-40 h-40 mb-4">
                  <Image
                    src={profilePhoto || '/profile-picture.jpg'}
                    alt="Profile Picture"
                    className="rounded-full object-cover"
                    fill
                    priority
                    unoptimized // Important for external URLs like those from Supabase
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-center">
                    {userData.firstName} {userData.middleName} {userData.lastName}
                  </h2>
                  <p className="text-gray-600 text-center">{userData.role}</p>
                </div>
                
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4 pb-2 border-b">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {[
                        userData.firstName,
                        userData.middleName,
                        userData.lastName
                      ].filter(Boolean).join(' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initials</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.initials || 'N/A'}</p>
                  </div>
                 
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.gender}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.address}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4 pb-2 border-b">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Section</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.section || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Salary</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.salary || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Utility</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.utility || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${userData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {userData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Banking Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4 pb-2 border-b">Banking Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.nameOfBank || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.accountNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Money Number</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.mobileMoneyNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registered Name</label>
                    <p className="mt-1 text-gray-900 font-medium">{userData.registeredName || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 pb-2 border-b">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Verified</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${userData.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {userData.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Created</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {userData.createdAt ? formatDate(userData.createdAt) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {userData.updatedAt ? formatDate(userData.updatedAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Section */}
          {activeTab === 'password-section' && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-6">Change Password</h2>
              <p className="text-sm text-gray-600 mb-6">
                Change your password by providing verification through a code sent to your email or phone.
              </p>
              
              {/* OTP-based password reset form */}
              <form onSubmit={handleOtpResetPassword} className="max-w-md mx-auto">
                <div className="space-y-4">
                  {/* Verification Method Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Method
                    </label>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-md ${
                          verificationMethod === 'email'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => {
                          setVerificationMethod('email');
                          if (userData && userData.email) setVerificationContact(userData.email);
                        }}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-md ${
                          verificationMethod === 'phone'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => {
                          setVerificationMethod('phone');
                          if (userData && userData.phone) setVerificationContact(userData.phone);
                        }}
                      >
                        Phone
                      </button>
                    </div>
                  </div>

                  {/* Contact Input */}
                  <div>
                    <label htmlFor="verification-contact" className="block text-sm font-medium text-gray-700">
                      {verificationMethod === 'email' ? 'Email Address' : 'Phone Number'}
                    </label>
                    <input
                      type={verificationMethod === 'email' ? 'email' : 'tel'}
                      id="verification-contact"
                      value={verificationContact}
                      onChange={(e) => setVerificationContact(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Request OTP Button */}
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={passwordLoading || !verificationContact}
                      className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 disabled:opacity-50"
                    >
                      {passwordLoading ? 'Sending...' : 'Request Verification Code'}
                    </button>
                  )}

                  {/* OTP and New Password Fields */}
                  {otpSent && (
                    <>
                      <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                          Verification Code
                        </label>
                        <div className="mt-1 flex">
                          <input
                            type="text"
                            id="otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                          >
                            Resend
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Enter the verification code sent to your {verificationMethod === 'email' ? 'email' : 'phone'}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Password must be at least 8 characters long
                        </p>
                      </div>

                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 disabled:opacity-50"
                      >
                        {passwordLoading ? 'Changing Password...' : 'Change Password'}
                      </button>
                    </>
                  )}

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Security Logs Section */}
          {activeTab === 'logs-section' && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <div className="logs-container">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Activity Log</h2>
                  <button 
                    onClick={() => {
                      setIsLoading(true);
                      fetchProfileData();
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Refresh Logs'}
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : securityLogs && securityLogs.length > 0 ? (
                  <>
                    <div className="text-sm text-gray-500 mb-4">
                      Showing {((currentPage - 1) * 5) + 1} to {Math.min(currentPage * 5, totalItems)} of {totalItems} results
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {securityLogs.map((log: SecurityLog) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(log.date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.action}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              log.status === 'Successful' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {log.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-4 flex justify-center">
                      <NewPagination 
                          currentPage={currentPage}
                          totalPages={Math.ceil(totalItems / 5)}
                          onPageChange={setCurrentPage} pageSize={0} totalCount={0}                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No activity logs available.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for messages */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 md:w-1/3">
            <span className="text-gray-500 float-right cursor-pointer" onClick={closeModal}>&times;</span>
            <p className="text-center text-lg text-gray-800">{modalMessage}</p>
            <div className="flex justify-center mt-4">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Page() {
  return <UserProfile />;
}