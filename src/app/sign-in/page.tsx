"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ArrowLeft, Loader2, CheckCircle, Phone } from 'lucide-react';
import { sendSMS } from '@/lib/smsService';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { env } from '@/env';
import dataCache from "../../utils/dataCache";

type FormData = {
  email: string;
  password: string;
  phone?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
  forgotEmail?: string;
  // New fields for OTP flow
  identifier?: string;
  identifierType?: 'email' | 'phone';
};

type ViewType = 'signin' | 'forgot' | 'otp' | 'reset' | 'success';
type ViewState = {
  current: ViewType;
  previous: ViewType | null;
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0, y: -20 }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const Login = () => {
  const [viewState, setViewState] = useState<ViewState>({
    current: 'signin',
    previous: null
  });
  
  // Helper function to update view state
  const setCurrentView = (view: ViewType) => {
    setViewState(prev => ({
      current: view,
      previous: prev.current
    }));
  };
  
  const currentView = viewState.current;
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  
  const { register, handleSubmit, watch, formState: { errors }, reset: resetForm } = useForm<FormData>();

  // Resend OTP and restart countdown
  const startCountdown = async () => {
    setCountdown(600);
    try {
      const otpDataStr = localStorage.getItem('otpData');
      if (!otpDataStr) return;
      const otpData = JSON.parse(otpDataStr);
      const identifier: string | undefined = otpData?.identifier;
      const type: 'email' | 'phone' | undefined = otpData?.type;
      if (!identifier || !type) return;

      await fetch('/api/email/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: type === 'email' ? identifier : undefined,
          phone: type === 'phone' ? identifier : undefined,
          type
        })
      });
    } catch (err) {
      console.warn('Failed to resend OTP:', err);
    }
  };

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(countdownInterval);
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    // Short delay for better UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (currentView === 'signin') {
      try {
        interface LoginResponse {
          status?: { 
            returnMessage?: string;
            returnCode?: string;
            [key: string]: any;
          };
          data?: {
            user?: {
              id?: string;
              _id?: string;
              role?: string | { name: string };
              [key: string]: any;
            };
            [key: string]: any;
          };
          accessToken?: string;
          refreshToken?: string;
          user?: {
            id?: string;
            _id?: string;
            role?: string | { name: string };
            [key: string]: any;
          };
          [key: string]: any;
        }

        const response: Response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            identifier: data.email,
            password: data.password
          }),
        });

        const responseData: LoginResponse = await response.json();
        console.log('Login response:', responseData);

        if (!response.ok) {
          throw new Error(responseData.status?.returnMessage || 'Login failed');
        }

        // Extract tokens and user data
        const { accessToken, refreshToken, data: responseDataUser, user: userFromRoot } = responseData;
        // Try to get user data from different possible locations
        const userData = userFromRoot || responseDataUser?.user || responseDataUser || responseData;

        if (!accessToken || !refreshToken || !userData) {
          console.error('Missing required data in response:', { accessToken: !!accessToken, refreshToken: !!refreshToken, userData });
          throw new Error('Invalid login credentials');
        }

        // Extract user ID and role from the response
        const userId = userData.id || userData._id; // Try both id and _id
        const userRole = userData.role?.name || userData.role || '';

        if (!userId) {
          console.error('User ID not found in response:', userData);
          throw new Error('User ID not found in response');
        }

        // Store tokens and user data in local storage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userId', userId.toString());
        
        // Clear any existing cache on login
        dataCache.handleLogin();

        // Create login log (wrapped in try-catch to prevent blocking login on failure)
        try {
          // Only attempt to log if the endpoint exists
          if (process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false') {
            const logResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                userId: userId,
                action: "LOGIN",
                status: "SUCCESS"
              })
            });

            if (!logResponse.ok) {
              // If the endpoint doesn't exist, log a warning but don't throw
              console.warn('Logging endpoint not available (HTTP ' + logResponse.status + ')');
            } else {
              const logData = await logResponse.json();
              console.log('Login log created:', logData);
            }
          }
        } catch (logError) {
          console.warn('Non-critical error creating login log:', logError);
          // Continue with login even if logging fails
        }

        // Continue with redirect
        if (responseData.status?.returnCode === "00" || response.ok) {
          if (userData.role) {
            const roleName = userData.role.name || userData.role;
            const redirectUrl = `/${roleName.trim().toLowerCase()}`;
            console.log(`Role found: '${roleName}'. Redirecting to: ${redirectUrl}`);
            window.location.href = redirectUrl;
          } else {
            console.log('No role found for user:');
          }
        } else {
          setErrorMessage(responseData.status?.returnMessage || 'Login failed');
        }
        
        setIsLoading(false);
        return;
      } catch (err: any) {
        console.error('Login error:', err);
        const message = err instanceof Error ? err.message : 'Login failed';
        setErrorMessage(message);
      }
    } else if (currentView === 'forgot') {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const identifierInput = data.forgotEmail?.trim() || '';
        if (!identifierInput) {
          throw new Error('Please enter your email or phone number');
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierInput);
        const identifierType: 'email' | 'phone' = isEmail ? 'email' : 'phone';
        let formattedIdentifier = identifierInput;

        if (!isEmail) {
          const digits = identifierInput.replace(/\D/g, '').replace(/^0+/, '');
          if (digits.startsWith('0')) {
            formattedIdentifier = `256${digits.substring(1)}`;
          } else if (!digits.startsWith('256')) {
            formattedIdentifier = `256${digits}`;
          } else {
            formattedIdentifier = digits;
          }
          if (formattedIdentifier.length !== 12) {
            console.error('Invalid phone number length:', formattedIdentifier.length, 'digits');
            throw new Error('Please enter a valid phone number (e.g., 07XXXXXXXX)');
          }
        }

        console.log('Sending OTP request with:', {
          email: isEmail ? identifierInput : undefined,
          phone: !isEmail ? formattedIdentifier : undefined,
          type: identifierType
        });
        
        const response = await fetch('/api/email/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: isEmail ? identifierInput : undefined,
            phone: !isEmail ? formattedIdentifier : undefined,
            type: identifierType
          })
        });

        const responseData = await response.json();
        console.log('OTP API response:', { status: response.status, responseData });
        
        if (!response.ok) {
          const errorMessage = responseData.error || responseData.message || 'Failed to send verification code';
          console.error('OTP API error:', { status: response.status, error: errorMessage });
          throw new Error(errorMessage);
        }

        localStorage.setItem('otpData', JSON.stringify({
          identifier: isEmail ? identifierInput : formattedIdentifier,
          type: identifierType,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }));

        setCurrentView('otp');
        resetForm({ ...data, otp: '' });
      } catch (err: any) {
        const message = err instanceof Error ? err.message : 'Failed to send verification code';
        setErrorMessage(message);
      }
    } else if (currentView === 'otp') {
      try {
        // Get stored data about the email and OTP
        const otpDataStr = localStorage.getItem('otpData');
        if (!otpDataStr) {
          setErrorMessage('Session expired. Please try again.');
          setCurrentView('forgot');
          return;
        }
        
        const otpData = JSON.parse(otpDataStr);
        
        // Store the verified OTP and move to reset password view
        localStorage.setItem('otpData', JSON.stringify({
          ...otpData,
          verifiedOtp: data.otp  // Store the verified OTP
        }));
        
        // Move to password reset view
        setCurrentView('reset');
      } catch (error) {
        console.error('OTP verification error:', error);
        setErrorMessage('Failed to verify code');
      }
    } else if (currentView === 'reset') {
      try {
        const otpDataStr = localStorage.getItem('otpData');
        
        if (!otpDataStr) {
          setErrorMessage('Session expired. Please restart the password reset process.');
          setCurrentView('forgot');
          return;
        }
        
        const otpData = JSON.parse(otpDataStr);
        
        if (!otpData.verifiedOtp) {
          setErrorMessage('OTP not verified. Please start the process again.');
          setCurrentView('forgot');
          return;
        }
        
        console.log('Sending reset password request with:', {
          token: otpData.verifiedOtp,
          newPassword: data.newPassword,
          identifier: otpData.identifier
        });
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            token: otpData.verifiedOtp,
            newPassword: data.newPassword,
            identifier: otpData.identifier
          }),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.status?.returnMessage || 'Failed to reset password');
        }
        
        if (responseData.status?.returnCode === 200) {
          // Clear all stored data related to password reset
          localStorage.removeItem('otpData');
          setCurrentView('success');
        } else {
          setErrorMessage(responseData.status?.returnMessage || 'Failed to reset password');
        }
      } catch (error) {
        console.error('Password reset error:', error);
        setErrorMessage('Failed to reset password. Please try again.');
      }
    }
    
    setIsLoading(false);
  };
  
  
  const handleForgotPassword = () => {
    resetForm();
    setCurrentView('forgot');
  };
  
  const goBack = () => {
    resetForm();
    if (viewState.previous) {
      setCurrentView(viewState.previous);
    } else {
      setCurrentView('signin');
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundImage: `url('/shop.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        zIndex: 9999,
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white border-opacity-20"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentView === 'signin' && 'Welcome Back'}
                {currentView === 'forgot' && 'Reset Password'}
                {currentView === 'otp' && 'Enter OTP'}
                {currentView === 'reset' && 'New Password'}
                {currentView === 'success' && 'Password Updated'}
              </h1>
              <p className="text-gray-600">
                {currentView === 'signin' && 'Sign in to your account to continue'}
                {currentView === 'forgot' && 'Enter your email or phone number to receive a verification code'}
                {currentView === 'otp' && 'We sent a 6-digit code to your email/phone'}
                {currentView === 'reset' && 'Create a new password'}
                {currentView === 'success' && 'Your password has been updated successfully!'}
              </p>
            </motion.div>

            {/* Back button */}
            {currentView !== 'signin' && currentView !== 'success' && (
              <motion.button
                variants={itemVariants}
                onClick={goBack}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </motion.button>
            )}

            {/* Success Message */}
            {currentView === 'success' ? (
              <motion.div 
                variants={itemVariants}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-gray-700 mb-6">You can now sign in with your new password</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentView('signin')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Back to Sign In
                </motion.button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Error Message */}
                {errorMessage && (
                  <motion.div
                    variants={itemVariants}
                    className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                  >
                    {errorMessage}
                  </motion.div>
                )}
                {/* Email/Phone Input */}
                {currentView === 'signin' && (
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email or Phone
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          type="text"
                          autoComplete="email tel"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your email or phone"
                          {...register('email', { required: 'Email or phone is required' })}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="••••••••"
                          {...register('password', { required: 'Password is required' })}
                        />
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Forgot Password - Email/Phone Input */}
                {currentView === 'forgot' && (
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email or Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="forgotEmail"
                          type="text"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your email or phone"
                          {...register('forgotEmail', { required: 'Email or phone is required' })}
                        />
                      </div>
                      {errors.forgotEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.forgotEmail.message}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* OTP Input */}
                {currentView === 'otp' && (
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Enter 6-digit code
                      </label>
                      <div className="relative">
                        <input
                          id="otpCode"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          className="block w-full px-4 py-3 text-center text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="• • • • • •"
                          {...register('otp', {
                            required: 'Verification code is required',
                            pattern: {
                              value: /^[0-9]{6}$/,
                              message: 'Please enter a valid 6-digit code'
                            }
                          })}
                        />
                      </div>
                      {errors.otp && (
                        <p className="mt-1 text-sm text-red-600">{errors.otp.message}</p>
                      )}
                      <div className="mt-2 text-sm text-gray-600">
                        {countdown > 0 ? (
                          <span>Resend code in {countdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={startCountdown}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                          >
                            Resend code
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Reset Password */}
                {currentView === 'reset' && (
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label htmlFor="resetNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="resetNewPassword"
                          type="password"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter new password"
                          {...register('newPassword', {
                            required: 'New password is required',
                            minLength: {
                              value: 4,
                              message: 'Password must be at least 4 characters'
                            }
                          })}
                        />
                      </div>
                      {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="resetConfirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="resetConfirmPassword"
                          type="password"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Confirm new password"
                          {...register('confirmPassword', {
                            validate: (value) =>
                              value === watch('newPassword') || 'Passwords do not match'
                          })}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {currentView === 'signin' && 'Sign In'}
                        {currentView === 'forgot' && 'Send Verification Code'}
                        {currentView === 'otp' && 'Verify Code'}
                        {currentView === 'reset' && 'Reset Password'}
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            )}

            {/* Footer Links */}
            {currentView === 'signin' && (
              <motion.div variants={itemVariants} className="mt-6 text-center">
                {/* Social Media Icons */}
                <div className="flex justify-center space-x-4 mb-4">
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
                
                {/* Website Link */}
                <div className="text-sm text-gray-600">
                  <a 
                    href="https://www.autospares.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    www.autospares.com
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
