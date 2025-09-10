"use client";
import React, { useState, useEffect } from "react";
import { env } from '@/env';

const CreateClass = () => {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user data and access token
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
          
          // Check if the user has an admin role in the token payload
          const adminInRoles = 
            tokenPayload.roles && 
            Array.isArray(tokenPayload.roles) && 
            tokenPayload.roles.includes('admin');
            
          // If admin role is already in the token, use it
          if (adminInRoles) {
            console.log("Admin role found in token");
            setUserRole('admin');
          } else {
            // If no admin role in token, fetch from API
            fetchUserRole(tokenPayload.id, token);
          }
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

  // Fetch user role from API
  const fetchUserRole = async (userId: string, token: string) => {
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("User API response:", data);
      
      if (data.data?.user) {
        const user = data.data.user;
        
        // Check for admin role in the user data
        let isAdmin = false;
        
        if (user.roles && Array.isArray(user.roles)) {
          isAdmin = user.roles.includes('admin');
        } else if (typeof user.roles === 'string') {
          isAdmin = user.roles === 'admin';
        } else if (user.role) {
          isAdmin = user.role === 'admin';
        }
        
        console.log("Is user admin?", isAdmin);
        setUserRole(isAdmin ? 'admin' : null);
      } else {
        console.error("No user data found in API response");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    console.log("Attempting to create class with:");
    console.log("- Access Token:", accessToken ? "Present (hidden)" : "Missing");
    console.log("- User ID:", userId);
    console.log("- User Role:", userRole);

    if (!accessToken) {
      setErrorMessage("Authentication token not found. Please log in again.");
      setLoading(false);
      return;
    }

    if (!userId) {
      setErrorMessage("User identification not found. Please log in again.");
      setLoading(false);
      return;
    }

    // Client-side role check
    if (userRole !== 'admin') {
      setErrorMessage("Only administrators can create classes. You don't have sufficient permissions.");
      setLoading(false);
      return;
    }

    try {
      // Prepare request with section in lowercase to match backend expectations
      const requestBody = {
        name: className,
        section: section.toLowerCase(),
        isActive: true
      };
      
      console.log("Sending request body:", requestBody);

      // Send the API request
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/add-class`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log("API response status:", response.status);
      
      const data = await response.json();
      console.log("API response data:", data);
      
      if (response.ok) {
        // Success - show message and reset form
        setClassName("P1 East");
        setSection("Lower Primary");
        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 3000);
      } else {
        // Error - show appropriate message
        const errorMsg = data.error || 
                         (data.status && data.status.returnMessage) || 
                         "Failed to create class";
                         
        console.error("Error creating class:", errorMsg);
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error("Network or unexpected error:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md w-[500px]">
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Create Classes
        </h2>

        {errorMessage && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleAddClass} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Name
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., P1 East"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            >
              <option value="select">Select</option>
              <option value="nursery">Nursery</option>
              <option value="lower Primary">Lower Primary</option>
              <option value="upper Primary">Upper Primary</option>
            </select>
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Class"}
          </button>
        </form>

        {successMessage && (
          <div className="mt-4 p-2 bg-green-100 text-green-700 rounded-md text-center">
            Class created successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateClass;