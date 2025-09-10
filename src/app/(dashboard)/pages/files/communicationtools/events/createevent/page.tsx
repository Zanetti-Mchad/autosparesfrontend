"use client";

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, AlertCircle, Calendar, FileText } from 'lucide-react';
import { env } from '@/env';

// Function to redirect to login page
const redirectToLogin = () => {
  window.location.href = '/login';
};

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface FormData {
  title: string;
  date: string;
  time: string;
  endTime?: string;
  targetClass: string;
  classId: string;
  details: string;
  author: string;
  tag?: string;
  tags: string[];
}

interface ClassOption {
  id: string;
  value: string;
  label: string;
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

// Add info message about authentication status
interface AuthMessage {
  type: 'info' | 'warning' | 'error';
  message: string;
}

const CreateEventsForm = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: getTodayDate(),
    time: '',
    endTime: '',
    targetClass: '',
    classId: '',
    details: '',
    author: '',
    tag: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isFetchingClasses, setIsFetchingClasses] = useState(true);
  const [authMessage, setAuthMessage] = useState<AuthMessage | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // State for authentication token
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Define fetchClasses as a useCallback so it doesn't recreate on every render
  // and can access the latest authToken
  const fetchClasses = useCallback(async (token: string | null) => {
    try {
      setIsFetchingClasses(true);
      
      // Set up headers with authorization token
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Make API request with headers
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`, {
        headers
      });
      
      const data = await response.json();
      console.log('API response for classes:', data);
      
      // Handle 401 Unauthorized error specifically
      if (data?.status?.returnCode === '401') {
        console.warn('Authentication required to fetch classes. Please log in.');
        
        // Show auth message to user
        setAuthMessage({
          type: 'warning',
          message: 'Authentication required to fetch classes. Please log in or use demo data.'
        });
        
        // Use dummy data for development that matches the structure in the example
        setClasses([
          { id: '', value: '', label: 'Select a class' },
          { id: '964b7b08-ece6-4678-833f-2f5e2b90fc30', value: 'baby class', label: 'Baby Class (Demo)' },
          { id: '97be4f0e-6ce5-48b7-b89f-c09dc79c7d74', value: 'p 1 east', label: 'P1 East (Demo)' },
          { id: '1f431c7c-0465-4f88-9e83-599622a1ba68', value: 'p 7 west', label: 'P7 West (Demo)' }
        ]);
        return;
      }
      
      // Create default first option
      const formattedClasses: ClassOption[] = [{ id: '', value: '', label: 'Select a class' }];
      
      // Handle the API response format shown in your example
      if (data?.success && Array.isArray(data?.classes)) {
        // This matches the provided JSON sample
        data.classes.forEach((cls: any) => {
          formattedClasses.push({
            id: cls.id, // Store the class ID
            value: cls.name,
            label: cls.name
          });
        });
        setClasses(formattedClasses);
      } 
      // Fallback for the status.returnCode format mentioned in errors
      else if (data?.status?.returnCode === '00' && Array.isArray(data?.data)) {
        data.data.forEach((cls: any) => {
          formattedClasses.push({
            id: cls.id, // Store the class ID
            value: cls.name,
            label: cls.name
          });
        });
        setClasses(formattedClasses);
      }
      // Direct array response
      else if (Array.isArray(data)) {
        data.forEach((cls: any) => {
          formattedClasses.push({
            id: cls.id, // Store the class ID
            value: cls.name,
            label: cls.name
          });
        });
        setClasses(formattedClasses);
      }
      // If we can't determine the format, display a meaningful error
      else {
        console.error('Unexpected API response format:', data);
        throw new Error(`Invalid response format from API: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([
        { id: '', value: '', label: 'Select a class' },
        { id: 'error', value: 'Error', label: 'Failed to load classes' }
      ]);
      setAuthMessage({
        type: 'error',
        message: 'Failed to fetch classes. Please try again or contact support.'
      });
    } finally {
      setIsFetchingClasses(false);
    }
  }, []);

  // Get authentication token from localStorage on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken'); 
    setAuthToken(token);
    
    // Also try to get user information
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    if (!token) {
      setAuthMessage({
        type: 'warning',
        message: 'You are not logged in. Please log in to create Events items.'
      });
    } else {
      setAuthMessage(null);
      
      // Call fetchClasses with the token we just retrieved
      fetchClasses(token);
      
      // Also fetch academic settings
      fetchAcademicSettings(token);
    }
  }, [fetchClasses]);
  
  // Function to fetch current academic year and term
  const fetchAcademicSettings = async (token: string) => {
    try {
      setIsLoadingSettings(true);
      
      // Fetch the current academic year
      const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const yearData = await yearResponse.json();
      
      if (yearData.success) {
        // Find the active academic year
        const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
        setCurrentYear(activeYear || null);
      }

      // Then fetch the current term
      const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const termData = await termResponse.json();
      
      if (termData.success && termData.term) {
        setCurrentTerm(termData.term);
      } else {
        setCurrentTerm(null);
      }
    } catch (error) {
      console.error("Error fetching academic settings:", error);
      setCurrentYear(null);
      setCurrentTerm(null);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Special handling for targetClass to also store the class ID
    if (name === 'targetClass') {
      const selectedClass = classes.find(c => c.value === value);
      if (selectedClass) {
        setFormData(prev => ({
          ...prev,
          targetClass: value,
          classId: selectedClass.id
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          targetClass: value,
          classId: ''
        }));
      }
    } else {
      // Normal handling for other fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Please enter a title.');
      return false;
    }
    if (!formData.date) {
      setError('Please select a date.');
      return false;
    }
    if (!formData.time) {
      setError('Please select a time.');
      return false;
    }
    // Modified validation for targetClass to allow "All Classes"
    if (!formData.targetClass) {
      setError('Please select a class or All Classes.');
      return false;
    }
    if (!formData.details.trim()) {
      setError('Please enter Events details.');
      return false;
    }
    if (!formData.author.trim()) {
      setError('Please enter the author name.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Check if user is authenticated
    if (!authToken) {
      setAuthMessage({
        type: 'error',
        message: 'You must be logged in to create an Events item'
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare data for API
      const apiData = {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime || null,
        classId: formData.targetClass === "All Classes" ? null : formData.classId, // Explicit null for All Classes
        targetClass: formData.targetClass,
        details: formData.details,
        author: formData.author || (user ? `${user.first_name} ${user.last_name}` : ''),
        tags: formData.tag || '', // Send single tag value
        eventType: 'Events',
        isActive: true,
        academicYearId: currentYear?.id || null,
        termId: currentTerm?.id || null,
        ...(user && user.id ? { createdById: user.id } : {}) // Add creator ID if available
      };

      // Send data to API
      console.log('Sending Events data:', apiData);
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Events/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiData)
      });

      // Safely try to parse the response
      let result;
      try {
        result = await response.json();
        console.log('API response for Events creation:', result);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        // If we can't parse the response, create an error object
        result = { 
          success: false,
          message: `Failed to parse server response: ${response.status} ${response.statusText}`
        };
      }

      // More flexible success check to handle different API response formats
      if (response.ok && (result.success || result?.status?.returnCode === '00')) {
        // Success case
        setShowSuccess(true);
        
        // Reset form but keep the date
        setFormData({
          title: '',
          date: getTodayDate(), // Keep today's date
          time: '',
          endTime: '',
          targetClass: '',
          classId: '',
          details: '',
          author: user ? `${user.first_name} ${user.last_name || ''}` : '', // Keep author
          tag: '',
          tags: []
        });
        setTagInput('');

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        // Error case - handle different error message formats
        const errorMessage = result.message || result?.status?.returnMessage || 'Failed to create Events. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('API error:', err);
      
      // More specific error message based on the error type
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Network error: Could not connect to the server. Please check your connection.');
      } else if (err instanceof SyntaxError) {
        setError('Server returned an invalid response. Please contact support.');
      } else {
        setError('An error occurred while creating the Events. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fill the author field with user name if available
  useEffect(() => {
    if (user && user.first_name && formData.author === '') {
      setFormData(prev => ({
        ...prev,
        author: `${user.first_name} ${user.last_name || ''}`
      }));
    }
  }, [user, formData.author]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
      {!authToken ? (
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">You need to be logged in to create an Events item.</p>
          <button 
            onClick={redirectToLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Create a New Events</h2>

          {/* Current Academic Settings */}
          <div className="grid md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-md">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Academic Year: {isLoadingSettings 
                  ? 'Loading...' 
                  : (currentYear?.year || 'Not set')}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Current Term: {isLoadingSettings 
                  ? 'Loading...' 
                  : (currentTerm?.name || 'Not set')}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          {authMessage && (
            <div className={`mb-4 p-3 rounded-md text-center flex items-center gap-2 ${
              authMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              authMessage.type === 'error' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              <AlertCircle className="w-5 h-5" />
              {authMessage.message}
              {!authToken && (
                <a 
                  href="/login" 
                  className="ml-2 underline text-blue-600 hover:text-blue-800"
                >
                  Log In
                </a>
              )}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Events title"
              />
            </div>

            {/* Class Selection */}
            <div className="mb-4">
              <label htmlFor="targetClass" className="block text-sm font-medium text-gray-700">
                Select Class
              </label>
              <select
                id="targetClass"
                name="targetClass"
                value={formData.targetClass}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  
                  if (selectedValue === "All Classes") {
                    // When "All Classes" is selected
                    setFormData(prev => ({
                      ...prev,
                      targetClass: "All Classes",
                      classId: "" // Clear specific classId
                    }));
                  } else {
                    // When a specific class is selected
                    const selectedClass = classes.find(c => c.value === selectedValue);
                    setFormData(prev => ({
                      ...prev,
                      targetClass: selectedValue,
                      classId: selectedClass?.id || ""
                    }));
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isFetchingClasses}
              >
                {isFetchingClasses ? (
                  <option value="">Loading classes...</option>
                ) : (
                  <>
                    <option value="">Select a class</option>
                    <option value="All Classes">All Classes</option>
                    {classes.map(option => (
                      option.value && option.value !== "" && ( // Only render non-empty values
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Details Input */}
            <div className="mb-4">
              <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                Details
              </label>
              <textarea
                id="details"
                name="details"
                rows={4}
                value={formData.details}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter details about the Events"
              />
            </div>

            {/* Tags Input - Simplified */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag (Category)
              </label>
              <select
                name="tag"
                value={formData.tag || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tag: e.target.value,
                  tags: e.target.value ? [e.target.value] : [] // Set tags array with single value
                }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a tag</option>
                <option value="soccer">Soccer</option>
                <option value="health">Health</option>
                <option value="academic">Academic</option>
                <option value="sports">Sports</option>
                <option value="general">General</option>
                <option value="meeting">Meeting</option>
                <option value="event">Event</option>
              </select>
            </div>

            {/* Author Input */}
            <div className="mb-4">
              <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                Author
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter author name"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Events
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Success Message */}
          {showSuccess && (
            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-center flex items-center gap-2 justify-center">
              <Check className="w-5 h-5" />
              Events has been successfully created!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateEventsForm;