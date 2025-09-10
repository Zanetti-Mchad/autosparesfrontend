"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { env } from "@/env";

interface AcademicYearData {
  success: boolean;
  academicYear?: {
    id: string;
    year: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  status?: {
    returnCode: string;
    returnMessage: string;
  };
}

const SelectYear = () => {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(""); // Selected year
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const router = useRouter();

  // Populate the years when the component loads
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2022;
    const numberOfFutureYears = 5;
    const yearList = [];

    for (let year = startYear; year <= currentYear + numberOfFutureYears; year++) {
      yearList.push(year);
    }

    setYears(yearList);
  }, []);

  // Fetch user data and access token - similar to CreateClass
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
          setError("Authentication required - No user ID in token");
        }
      } catch (error) {
        console.error("Error extracting token data:", error);
        setError("Authentication error - Invalid token format");
      }
    } else {
      console.error("No access token found in local storage");
      setError("Authentication required - Please log in");
    }
  }, []);

  useEffect(() => {
    const fetchCurrentYear = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          throw new Error("Authentication required. Please log in.");
        }

        console.log("Fetching current academic year...");
        
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/current`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("Academic year API response status:", response.status);
        
        const data: AcademicYearData = await response.json();
        console.log("Academic year API response:", data);

        if (!response.ok) {
          throw new Error(
            data.message || 
            data.status?.returnMessage || 
            `Academic year Not Yet Set `
          );
        }

        if (data.success && data.academicYear) {
          console.log("Setting academic year:", data.academicYear.year);
          setAcademicYear(data.academicYear.year);
          
          // If you need to store additional academic year data
          // setAcademicYearDetails(data.academicYear);
        } else if (!data.academicYear) {
          console.log("No current academic year found");
          setAcademicYear(null); // or whatever default state you want
        } else {
          throw new Error(data.message || "Failed to fetch academic year data");
        }

      } catch (error) {
        console.error("Error in fetchCurrentYear:", error);
        setError(
          error instanceof Error 
            ? error.message 
            : "Could not load academic year"
        );
        setAcademicYear(null); // Reset academic year on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentYear();

    // Optional: Clean up function
    return () => {
      setLoading(false);
      setError(null);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null); // Reset success message

    try {
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      if (!userId) {
        throw new Error("User identification not found. Please log in again.");
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          year: selectedYear,
          createdById: userId,
          isActive: true
        })
      });

      const data = await response.json();
      console.log("API response data:", data);

      if (!response.ok) {
        throw new Error(data.message || `Failed to create academic year (HTTP ${response.status})`);
      }

      if (data.success) {
        // Show success message
        setSuccess("Academic year set successfully!");
        // Clear the form
        setSelectedYear("");
        // Refresh the page data without navigation
        router.refresh();
      } else {
        throw new Error(data.message || "Failed to create academic year");
      }

    } catch (err) {
      console.error("Error in academic year creation:", err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen !mt-0">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md !mt-0">
        
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-4">
          Select Academic Year
        </h2>

        {/* Show success message */}
        {success && (
          <div className="mb-4 text-center text-green-600 font-semibold bg-green-50 p-2 rounded">
            {success}
          </div>
        )}

        {/* Show error message */}
        {error && (
          <div className="mb-4 text-center text-red-600 font-semibold bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="year"
              className="block text-gray-600 font-medium"
            >
              Choose Academic Year
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Year --</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !accessToken || !userId}
            className="w-full bg-green-600 text-white py-2 rounded-md font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SelectYear;