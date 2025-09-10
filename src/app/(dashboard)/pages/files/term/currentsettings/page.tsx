"use client";
import React, { useState, useEffect } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { AlertCircle, Check, Calendar, FileText } from "lucide-react";

const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 border rounded ${className}`}>{children}</div>
);

interface LoadingState {
  general: boolean;
  terms: boolean;
  classes: boolean;
}

interface Class {
  id: string;
  name: string;
  grade: string;
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

interface AcademicYearResponse {
  success: boolean;
  years: AcademicYear[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const CurrentSettings = () => {
  // State declarations
  const [loading, setLoading] = useState<LoadingState>({
    general: true,
    terms: false,
    classes: false
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);

  // Fetch current settings
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        setLoading(prev => ({ ...prev, general: true }));
        setError(null);

        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("Authentication required");
        }

        // First fetch the current academic year
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const yearData: AcademicYearResponse = await yearResponse.json();
        
        if (yearData.success) {
          // Find the active academic year
          const activeYear = yearData.years.find(year => year.isActive);
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
        console.error("Error fetching settings:", error);
        // Don't set error, just set terms to null to show "Term not yet set"
        setCurrentTerm(null);
      } finally {
        setLoading(prev => ({ ...prev, general: false }));
      }
    };

    fetchCurrentSettings();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col items-center mb-6">
            
            <h1 className="text-2xl font-bold text-gray-800">Current Academic Settings</h1>
          </div>
          
          {loading.general ? (
            <div className="text-center py-8">
              <p>Loading academic settings...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Calendar className="w-6 h-6 text-green-600" />
                  <h2 className="text-lg font-semibold">Academic Year</h2>
                </div>
                <p className="text-3xl font-bold text-gray-700">
                  {currentYear?.year || 'Not set'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <FileText className="w-6 h-6 text-green-600" />
                  <h2 className="text-lg font-semibold">Current Term Status</h2>
                </div>
                {loading.terms ? (
                  <p className="text-gray-600">Loading term status...</p>
                ) : currentTerm ? (
                  <p className="text-3xl font-bold text-gray-700">{currentTerm.name}</p>
                ) : (
                  <p className="text-3xl font-bold text-amber-600">Term not yet set</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentSettings;