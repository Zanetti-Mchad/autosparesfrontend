"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, Mail, Phone, Clock, Key, LogOut, Camera,
  AlertCircle, Check, RefreshCw, Loader2
} from 'lucide-react';

import { fetchApi, buildApiUrl } from '@/lib/apiConfig';

// Log interface to match API response
interface SecurityLog {
  id: string;
  action: string;
  status: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

// Frontend log format
interface UILog {
  id: string | number;
  action: string;
  timestamp: string;
}

const ProfilePage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    location: '',
    avatar: '',
    role: '',
    photo: ''
  });

  // Helper function to get Supabase image URL
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopsettings-photos/photos/${path}`;
  };
  
  // Function to fetch user data from database
  const fetchUserData = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const result = await fetchApi(`/integration/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        } as any,
      });
      return (result as any).data || result;
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  // Get user data from localStorage and database
  useEffect(() => {
    const loadUserData = async () => {
    try {
      const userDataStr = localStorage.getItem('user');
      if (!userDataStr) {
        // No user data found, redirect to login
          router.push('/');
        return;
      }
      
      const userData = JSON.parse(userDataStr);
        
        // Try to fetch fresh data from database to get photo
        const dbUserData = await fetchUserData(userData.id);
        
        // Use database data if available, otherwise fall back to localStorage
        const finalUserData = dbUserData || userData;
      
      // Extract initials for avatar
        const firstInitial = finalUserData.firstName ? finalUserData.firstName[0] : '';
        const lastInitial = finalUserData.lastName ? finalUserData.lastName[0] : '';
        const nameInitial = finalUserData.name ? finalUserData.name[0] : '';
      const avatarText = (firstInitial + lastInitial) || nameInitial || 'U';
      
        // Handle role - it can be a string or an object
        const userRole = typeof finalUserData.role === 'string' 
          ? finalUserData.role 
          : finalUserData.role?.name || finalUserData.role?.description || 'User';
        
      setProfileData({
          firstName: finalUserData.firstName || '',
          lastName: finalUserData.lastName || '',
          email: finalUserData.email || '',
          phone: finalUserData.phone || 'Not provided',
          position: userRole,
          department: finalUserData.department || 'Not specified',
          location: finalUserData.location || 'Not specified',
        avatar: avatarText.toUpperCase(),
          role: userRole,
          photo: finalUserData.photo || ''
      });
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoaded(true);
    }
    };

    loadUserData();
  }, [router]);
  
  // Fetch logs when the logs tab is opened
  useEffect(() => {
    if (activeTab === 'logs') {
      setCurrentPage(1); // Reset to first page when tab is opened
      fetchUserLogs();
    }
  }, [activeTab]);
  
  // Function to fetch user logs from API
  const fetchUserLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError('');
    
    try {
      // Get user ID and token
      const userDataStr = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      
      if (!userDataStr || !token) {
        throw new Error('Authentication data missing. Please log in again.');
      }
      
      const userData = JSON.parse(userDataStr);
      const userId = userData.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // For debug purposes - log token format
      console.log('Token format check:', { 
        tokenExists: !!token,
        tokenLength: token.length,
        firstChars: token.substring(0, 10) + '...',
        userId: userId 
      });
      
      // Call the logs API - use hardcoded URL for consistency with other API calls
      const serverHost = 'http://localhost:4210'; // Hard-coded for now
      const url = `${serverHost}/api/v1/logs/${userId}`;
      
      console.log('Fetching logs from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // For debugging - log API response
      console.log('Logs API response status:', response.status);
      
      // Handle response based on status
      if (response.status === 401) {
        throw new Error('Authentication failed. Your session may have expired. Please log in again.');
      } else if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Logs API response:', data);
      
      // Handle API errors
      if (data.status?.returnCode !== '00') {
        throw new Error(data.status?.returnMessage || 'Failed to fetch logs');
      }
      
      // Transform API logs to UI format
      const transformedLogs = (data.data || []).map((log: SecurityLog) => ({
        id: log.id,
        action: log.action,
        timestamp: log.createdAt,
      }));
      
      setLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogsError(error instanceof Error ? error.message : 'Failed to load activity logs');
      
      // If auth error, show a mock log for demonstration
      if (String(error).includes('Authentication failed') || String(error).includes('401')) {
        setLogs([
          { 
            id: 'local-1',
            action: 'Last login',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const [logs, setLogs] = useState<UILog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 5;

  // Get current logs for pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.max(1, Math.ceil(logs.length / logsPerPage));

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'logs', name: 'Activity Logs', icon: Clock },
    { id: 'security', name: 'Password Reset', icon: Key },
  ];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // OTP-based password reset state
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [verificationContact, setVerificationContact] = useState('');
  const [otp, setOtp] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Lightweight message modal
  const [message, setMessage] = useState('');
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const showMessage = (msg: string) => {
    setMessage(msg);
    setIsMessageOpen(true);
    setTimeout(() => setIsMessageOpen(false), 4000);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 4 characters long');
      return;
    }
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setPasswordError('Authentication token missing. Please log in again.');
        return;
      }
      
      // API call to update the password
      const data = await fetchApi('/auth/change-password', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        } as any,
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      if ((data as any).status?.returnCode < 400) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // After password change, refresh logs to show the new password change activity
        if (activeTab === 'logs') {
          fetchUserLogs();
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => setPasswordSuccess(''), 5000);
      } else {
        setPasswordError(data.status?.returnMessage || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('An error occurred while updating your password');
    }
  };

  // OTP-based password reset functions
  const handleSendOTP = async () => {
    if (!verificationContact) {
      showMessage('Please enter your email or phone number');
      return;
    }

    setIsSendingOtp(true);
    setError('');

    try {
      // Determine if the contact is an email or phone
      const isEmail = verificationMethod === 'email';
      
      // Prepare the request body based on the verification method
      const requestBody = isEmail
        ? { email: verificationContact, type: 'email' }
        : { 
            phone: verificationContact.startsWith('256') 
              ? verificationContact 
              : `256${verificationContact.replace(/^0/, '')}`, 
            type: 'phone' 
          };

      console.log('Sending OTP request:', requestBody);

      // Use the OTP API endpoint we created
      const response = await fetch('/api/email/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('OTP response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      setOtpSent(true);
      showMessage(`Verification code sent to your ${isEmail ? 'email' : 'phone'}!`);
      
      // In development, log the OTP for testing
      if (process.env.NODE_ENV === 'development' && data.otp) {
        console.log('DEV: Your OTP is', data.otp);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code. Please try again.';
      setError(msg);
      showMessage(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage('New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 4) {
      showMessage('Password must be at least 4 characters long');
      return;
    }

    setPasswordLoading(true);
    setError('');

    try {
      const accessToken = localStorage.getItem('accessToken') || '';
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const requestBody = {
        token: otp,
        newPassword
      };

      const data = await fetchApi('/auth/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      if ((data as any).status && (data as any).status.returnCode !== '00') {
        throw new Error((data as any).message || ((data as any).status?.returnMessage) || 'Password reset failed');
      }

      // Create log for successful password reset
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      try {
        await fetchApi('/logs/logs', {
          method: 'POST',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          } as any,
          body: JSON.stringify({ userId, action: 'PASSWORD_RESET', status: 'SUCCESS' })
        });
      } catch (_) {
        // ignore log errors
      }

      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      showMessage('Password has been successfully changed! Redirecting to login...');
      localStorage.clear();
      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(msg);
      showMessage(msg);
    } finally {
      setPasswordLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-gray-600 text-lg">View your account details and activity</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 backdrop-blur-sm">
            <div className="space-y-3">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-left transition-all duration-300 transform hover:scale-105 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
                  } ${isLoaded ? 'animate-slide-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="font-semibold text-lg">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Avatar Section */}
                  <div className="md:col-span-1 flex flex-col items-center space-y-6">
                    <div className="relative group">
                      {profileData.photo ? (
                        <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 ring-4 ring-white ring-offset-4 ring-offset-gray-50">
                          <Image 
                            src={getImageUrl(profileData.photo)} 
                            alt={`${profileData.firstName} ${profileData.lastName}`}
                            width={160}
                            height={160}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              console.error('Image failed to load:', e);
                              console.error('Image URL:', getImageUrl(profileData.photo));
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-6xl font-bold text-white shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 ring-4 ring-white ring-offset-4 ring-offset-gray-50">
                        {isLoaded ? profileData.avatar : '...'}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold text-gray-800">{profileData.firstName} {profileData.lastName}</h2>
                      <p className="text-blue-600 font-semibold text-lg">{profileData.position}</p>
                      <div className="flex items-center justify-center space-x-2 text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="md:col-span-2">
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                            <User className="w-4 h-4 mr-2 text-blue-500" />
                            First Name
                          </label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={profileData.firstName} 
                              disabled={true} 
                              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-800 font-medium focus:border-blue-500 focus:bg-white transition-all duration-300" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                            <User className="w-4 h-4 mr-2 text-blue-500" />
                            Last Name
                          </label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={profileData.lastName} 
                              disabled={true} 
                              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-800 font-medium focus:border-blue-500 focus:bg-white transition-all duration-300" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-blue-500" />
                          Email Address
                        </label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={profileData.email} 
                            disabled={true} 
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-800 font-medium focus:border-blue-500 focus:bg-white transition-all duration-300" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-blue-500" />
                          Phone Number
                        </label>
                        <div className="relative">
                          <input 
                            type="tel" 
                            value={profileData.phone} 
                            disabled={true} 
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-800 font-medium focus:border-blue-500 focus:bg-white transition-all duration-300" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                          <Key className="w-4 h-4 mr-2 text-blue-500" />
                          Role
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={profileData.role} 
                            disabled={true} 
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-800 font-medium focus:border-blue-500 focus:bg-white transition-all duration-300" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Logs Tab */}
            {activeTab === 'logs' && (
              <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                      <Clock className="w-6 h-6 mr-3 text-blue-500" />
                      Activity Logs
                    </h3>
                    <p className="text-gray-600">Track your account activity and security events</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentPage(1); // Reset to first page when refreshing
                      fetchUserLogs();
                    }} 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center space-x-2 font-semibold"
                    disabled={isLoadingLogs}
                  >
                    {isLoadingLogs ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-4">
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : logsError && logs.length === 0 ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                          <p>{logsError}</p>
                        </div>
                      </div>
                      
                      {/* Suggestion for API issues */}
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting Tips</h4>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          <li>Check if the backend server is running</li>
                          <li>Your session may have expired, try logging in again</li>
                          <li>The logs API might not be implemented yet on the backend</li>
                        </ul>
                      </div>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No activity logs found.</p>
                    </div>
                  ) : (
                    <>
                      {logsError && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-2 rounded-lg mb-4 text-sm">
                          <div className="flex">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                            <p>Warning: {logsError}</p>
                          </div>
                        </div>
                      )}
                      
                      {currentLogs.map((log, index) => (
                        <div key={log.id} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-lg">{log.action}</p>
                              <p className="text-gray-600 mt-2 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination */}
                      <div className="text-center text-sm text-muted-foreground mt-4">
                        Showing {Math.min(logs.length, indexOfFirstLog + 1)}-{Math.min(logs.length, indexOfLastLog)} of {logs.length} log entries
                      </div>
                      
                      {logs.length > logsPerPage && (
                        <div className="flex items-center justify-center space-x-2 mt-4">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg ${currentPage === 1 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-primary hover:bg-primary/10'}`}
                          >
                            Previous
                          </button>
                          
                          <div className="flex items-center">
                            {[...Array(totalPages)].map((_, idx) => {
                              const pageNumber = idx + 1;
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => setCurrentPage(pageNumber)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-1 ${
                                    currentPage === pageNumber
                                      ? 'bg-primary text-white' 
                                      : 'hover:bg-primary/10'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg ${currentPage === totalPages 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-primary hover:bg-primary/10'}`}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Password Reset Tab */}
            {activeTab === 'security' && (
              <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="space-y-2 mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Key className="w-6 h-6 mr-3 text-blue-500" />
                    Password
                  </h3>
                  <p className="text-gray-600">Update your password or reset via verification code</p>
                </div>

                {/* Message Modal (bottom-right) */}
                {isMessageOpen && (
                  <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-white border border-gray-200 shadow-xl rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-gray-800">{message}</div>
                    </div>
                  </div>
                )}

                {/* OTP Password Reset Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Reset via Verification Code</h4>
                  <div className="space-y-4 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Send verification code to:</p>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('email');
                          setVerificationContact(profileData.email);
                        }}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          verificationMethod === 'email'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Mail className="w-5 h-5" />
                        <span>Email</span>
                        {verificationMethod === 'email' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {profileData.email}
                          </span>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('phone');
                          setVerificationContact(profileData.phone === 'Not provided' ? '' : profileData.phone);
                        }}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          verificationMethod === 'phone'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        disabled={profileData.phone === 'Not provided'}
                      >
                        <Phone className="w-5 h-5" />
                        <span>Phone</span>
                        {verificationMethod === 'phone' && profileData.phone !== 'Not provided' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {profileData.phone}
                          </span>
                        )}
                      </button>
                    </div>
                    {verificationMethod === 'phone' && profileData.phone === 'Not provided' && (
                      <p className="text-sm text-red-500 mt-2">
                        Phone number not available. Please use email or update your profile with a phone number.
                      </p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {verificationMethod === 'email' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={verificationContact}
                          onChange={(e) => setVerificationContact(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          disabled={otpSent || isSendingOtp}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">+256</span>
                          </div>
                          <input
                            type="tel"
                            value={verificationContact.replace(/^256/, '')}
                            onChange={(e) => {
                              // Only allow numbers and auto-format as user types
                              const digits = e.target.value.replace(/\D/g, '');
                              setVerificationContact(digits ? `256${digits}` : '');
                            }}
                            placeholder="7XXXXXXXX"
                            className="w-full pl-16 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            disabled={otpSent || isSendingOtp || profileData.phone === 'Not provided'}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Enter phone number without the country code (e.g., 7XXXXXXXX)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={!verificationContact || isSendingOtp || (verificationMethod === 'phone' && profileData.phone === 'Not provided')}
                      className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2 ${
                        !verificationContact || isSendingOtp || (verificationMethod === 'phone' && profileData.phone === 'Not provided')
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-[1.02] active:scale-95 shadow-md'
                      }`}
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : otpSent ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Code Sent</span>
                        </>
                      ) : (
                        <span>Send Verification Code</span>
                      )}
                    </button>
                  </div>

                  {otpSent && (
                    <form onSubmit={handleOtpResetPassword} className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Enter the code"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Enter new password"
                            minLength={4}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Confirm new password"
                            minLength={4}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="w-full bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          {passwordLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Reset Password</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                {/* Classic change password form removed to avoid duplication. Using OTP reset flow above. */}
                
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                      <Check className="w-6 h-6 mr-3 text-green-500" />
                      Security Tips
                    </h4>
                    <ul className="space-y-4">
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Use Strong Passwords</p>
                          <p className="text-gray-600 text-sm">Use a strong, unique password that you don&apos;t use elsewhere</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Password Manager</p>
                          <p className="text-gray-600 text-sm">Consider using a password manager to generate and store your passwords</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Regular Updates</p>
                          <p className="text-gray-600 text-sm">Regularly update your password for better security</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
