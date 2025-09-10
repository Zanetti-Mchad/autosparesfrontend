"use client";
import React, { useState, useEffect } from "react";
import { env } from '@/env';

interface Subject {
  id: string;
  name: string;
  code?: string;
  isCompulsory?: boolean;
  subjectId?: string;
  activityType?: string;
}

const ACTIVITY_TYPES = {
  SUBJECT: 'subject',
  EXTRACURRICULAR: 'extracurricular'
};

const CreateSubjectActivity = () => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState(ACTIVITY_TYPES.SUBJECT);
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState<any>(null);
  
  // Add state for token and user ID
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load token and extract user ID on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      setAccessToken(token);
      
      try {
        // Extract user ID directly from token
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log("Token payload:", tokenPayload);
        
        if (tokenPayload.id) {
          setUserId(tokenPayload.id);
        } else {
          console.error("No user ID found in token");
        }
      } catch (error) {
        console.error("Error extracting token data:", error);
      }
    } else {
      console.error("No access token found in local storage");
    }
  }, []);

  // Reset form and states when switching activity type
  useEffect(() => {
    setName("");
    setCode("");
    setErrorMessage("");
    setSuccessMessage("");
    setDuplicateFound(null);
    setIsCompulsory(true);
  }, [type]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setDuplicateFound(null);

    if (name.trim()) {
      // Check token and user ID from state instead of localStorage
      if (!accessToken || !userId) {
        setErrorMessage("Authentication required");
        setLoading(false);
        return;
      }

      try {
        // Updated endpoint based on activity type
        const endpoint = type === ACTIVITY_TYPES.SUBJECT 
          ? `${env.BACKEND_API_URL}/api/v1/subjects/add-subject`
          : `${env.BACKEND_API_URL}/api/v1/activities/create`;
        
        // Create payload based on activity type
        const payload = type === ACTIVITY_TYPES.SUBJECT 
          ? { 
              name, 
              code,
              isCompulsory
            }
          : { 
              name,
            };

        console.log("Sending request with payload:", payload);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload),
        });

        console.log("Response status:", response.status);
        
        const data = await response.json();
        console.log("Response data:", data);
        
        // Check for conflict status (409) which indicates a duplicate
        if (response.status === 409) {
          setDuplicateFound(type === ACTIVITY_TYPES.SUBJECT ? data.subject : data.activity);
          setErrorMessage(data.error || `A ${type === ACTIVITY_TYPES.SUBJECT ? 'subject' : 'activity'} with this name already exists`);
        } else if (response.ok) {
          if (data.success) {
            setName("");
            setCode("");
            setSuccessMessage(`${type === ACTIVITY_TYPES.SUBJECT ? 'Subject' : 'Extracurricular activity'} created successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
          } else {
            setErrorMessage(data.message || `Failed to create ${type === ACTIVITY_TYPES.SUBJECT ? 'subject' : 'activity'}`);
          }
        } else {
          const errorMsg = data.error || 
                          (data.status && data.status.returnMessage) || 
                          `Failed to create ${type === ACTIVITY_TYPES.SUBJECT ? 'subject' : 'activity'}`;
          setErrorMessage(errorMsg);
        }
      } catch (error) {
        console.error(`Error creating ${type}:`, error);
        setErrorMessage("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md w-[500px]">
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Create Subjects & Activities
        </h2>
        
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-center">
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-md text-center">
            {successMessage}
          </div>
        )}
        
        <div className="mb-4">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setType(ACTIVITY_TYPES.SUBJECT)}
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                type === ACTIVITY_TYPES.SUBJECT
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Subject
            </button>
            <button
              type="button"
              onClick={() => setType(ACTIVITY_TYPES.EXTRACURRICULAR)}
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                type === ACTIVITY_TYPES.EXTRACURRICULAR
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Extracurricular Activity
            </button>
          </div>
        </div>
        
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === ACTIVITY_TYPES.SUBJECT ? 'Subject Name' : 'Activity Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === ACTIVITY_TYPES.SUBJECT ? "Subject Name" : "Activity Name"}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          {type === ACTIVITY_TYPES.SUBJECT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Subject Code (optional)"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Type
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subjectType"
                      value="compulsory"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={isCompulsory}
                      onChange={() => setIsCompulsory(true)}
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">Compulsory Subject</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subjectType"
                      value="optional"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={!isCompulsory}
                      onChange={() => setIsCompulsory(false)}
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">Optional Subject</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {isCompulsory 
                    ? "Compulsory subjects are required for all students"
                    : "Optional subjects can be chosen by students based on their interests"}
                </p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            className={`w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Adding..." : `Add ${type === ACTIVITY_TYPES.SUBJECT ? 'Subject' : 'Activity'}`}
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Examples:
          </h3>
          <div className="text-xs text-gray-500">
            {type === ACTIVITY_TYPES.SUBJECT ? (
              <p>Mathematics, English, Lit 1 A, Science...</p>
            ) : (
              <p>Swimming, Football, Chess Club, Drama, Debate, Music, Art, Dance...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSubjectActivity;