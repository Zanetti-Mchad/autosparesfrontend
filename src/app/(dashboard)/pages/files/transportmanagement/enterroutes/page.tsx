"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { env } from '@/env';

// Define the API base URL
const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

interface RouteEntry {
  routeCode: string;
  routeName: string;
  dayOfWeek: string;
  startTime: string;
  routeFare: string;
}

interface ApiResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    route: {
      id: string;
      routeCode: string;
      routeName: string;
      dayOfWeek: string;
      startTime: string;
      routeFare: string;
      createdAt: string;
      updatedAt: string;
      createdById: string;
    };
  };
}

const RouteManagement: React.FC = () => {
  const [formData, setFormData] = useState<RouteEntry>({
    routeCode: '',
    routeName: '',
    dayOfWeek: '',
    startTime: '',
    routeFare: ''
  });

  const [entries, setEntries] = useState<RouteEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      routeCode: '',
      routeName: '',
      dayOfWeek: '',
      startTime: '',
      routeFare: ''
    });
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<ApiResponse> => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error("Authentication required");
    }

    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return response.json();
  };

  const addItem = async () => {
    const { routeCode, routeName, dayOfWeek, startTime, routeFare } = formData;
    
    if (!routeCode || !routeName || !dayOfWeek || !startTime || !routeFare) {
      setError("Please fill in all fields before adding an entry.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth('/transport/route', {
        method: 'POST',
        body: JSON.stringify({
          routeCode,
          routeName,
          dayOfWeek,
          startTime,
          routeFare
        })
      });

      if (response.status.returnCode === "00") {
        setEntries(prev => [...prev, {
          routeCode,
          routeName,
          dayOfWeek,
          startTime,
          routeFare
        }]);
        resetForm();
        setError(null);
      } else {
        throw new Error(response.status.returnMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add route');
    } finally {
      setLoading(false);
    }
  };

  const saveEntries = async () => {
    if (entries.length === 0) {
      setError("Please add at least one entry before saving.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save all entries
      for (const entry of entries) {
        await fetchWithAuth('/transport/route', {
          method: 'POST',
          body: JSON.stringify(entry)
        });
      }

      setError(null);
      setEntries([]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save routes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8 text-center">
        
        <h2 className="text-2xl font-bold text-gray-800">
          School Management System - Route Management
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {!error && entries.length > 0 && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Route added successfully
        </div>
      )}

      {/* Display List of Added Items */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Added Routes</h3>
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg flex flex-wrap gap-4">
              <span className="font-medium">{index + 1}.</span>
              <span>Route: {entry.routeName} (Code: {entry.routeCode})</span>
              <span>Schedule: {entry.dayOfWeek} - {entry.startTime}</span>
              <span>Fare: UGX {entry.routeFare}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Input Forms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Route Details Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Route Details</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="routeCode">
              Route Code
            </label>
            <input
              type="text"
              id="routeCode"
              value={formData.routeCode}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Route Code (e.g., R001)"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="routeName">
              Route Name
            </label>
            <input
              type="text"
              id="routeName"
              value={formData.routeName}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Route Name"
            />
          </div>
        </div>

        {/* Schedule Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Schedule</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="dayOfWeek">
              Days of Week
            </label>
            <input
              type="text"
              id="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Days (e.g., Monday, Wednesday, Friday)"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="startTime">
              Start Time
            </label>
            <input
              type="text"
              id="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Start Time (e.g., 06:30 AM)"
            />
          </div>
        </div>

        {/* Fare Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fare Information</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="routeFare">
              Route Fare (UGX)
            </label>
            <input
              type="number"
              id="routeFare"
              value={formData.routeFare}
              onChange={handleInputChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Fare Amount"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={addItem}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Route'}
        </button>
        <button
          type="button"
          onClick={saveEntries}
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </div>
  );
};

export default RouteManagement;