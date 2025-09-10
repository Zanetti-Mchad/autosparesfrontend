'use client';

import React, { useEffect, useState } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { Calendar, FileText } from 'lucide-react';

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
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

interface GradingRow {
  endMarks: number;
  grade: number;
  comment: string;
}

interface ClassDetails {
  id: string | number;
  name: string;
  section?: string;
}

interface GradingScaleData {
  academicYearId?: string;
  termId?: string;
  gradingRows: GradingRow[];
}

const GradingControlPanel: React.FC = () => {
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');
  const [gradingData, setGradingData] = useState<GradingRow[]>([
    { endMarks: 39, grade: 9, comment: 'Strive to Improve' },
    { endMarks: 49, grade: 8, comment: 'Double Efforts' },
    { endMarks: 54, grade: 7, comment: 'Focus Up' },
    { endMarks: 59, grade: 6, comment: 'Fair' },
    { endMarks: 64, grade: 5, comment: 'Quite Good' },
    { endMarks: 69, grade: 4, comment: 'Good' },
    { endMarks: 79, grade: 3, comment: 'Very Good' },
    { endMarks: 89, grade: 2, comment: 'Superb' },
    { endMarks: 100, grade: 1, comment: 'Remarkable' }
  ]);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchClassDetails = async () => {
      console.log('GradingControlPanel: fetchClassDetails started');
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        const classId = params.get('classId');
        console.log('GradingControlPanel: classId from URL:', classId);
        
        if (!classId) {
          console.error('GradingControlPanel: classId is missing from URL');
          setError('No class selected. Please go back and select a class.');
          setLoading(false);
          return;
        }

        // Get token from localStorage for authentication
        const token = localStorage.getItem('accessToken');
        console.log('GradingControlPanel: Auth token found:', !!token);
        if (!token) {
          console.error('GradingControlPanel: Auth token not found');
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }

        // Fetch class details from API
        const apiUrl = `${env.BACKEND_API_URL}/api/v1/classes/${classId}`;
        console.log('GradingControlPanel: Fetching from API:', apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('GradingControlPanel: API response status:', response.status);

        if (!response.ok) {
           console.error('GradingControlPanel: API fetch failed with status', response.status);
          throw new Error(`Failed to fetch class details: ${response.status}`);
        }

        const data = await response.json();
        console.log('GradingControlPanel: Raw API response data:', data);
        
        // Handle different API response formats more robustly
        let classData = null;
        if (data && data.data && typeof data.data === 'object') {
            classData = data.data;
            console.log('GradingControlPanel: Found class data under "data" key');
        } else if (data && data.class && typeof data.class === 'object') { 
            classData = data.class;
            console.log('GradingControlPanel: Found class data under "class" key');
        } else if (data && typeof data === 'object' && data.id) { 
            classData = data; 
            console.log('GradingControlPanel: Assuming direct object response');
        } else {
             console.error('GradingControlPanel: Could not find valid class data in response:', data);
        }

        console.log('GradingControlPanel: Extracted classData:', classData);
        
        if (classData) { 
            setClassDetails({
              id: classId,
              name: classData.name || 'Unknown Class', 
              section: classData.section
            });
            console.log('GradingControlPanel: Set classDetails state:', { id: classId, name: classData.name, section: classData.section });
            
            // After getting class details, try to fetch existing grading scale for this class
            await fetchExistingGradingScale(classId, token);
        } else {
             setError('Failed to parse class information from API response.');
             console.error('GradingControlPanel: Setting error because classData is null or invalid.');
        }
      } catch (err) {
        console.error('GradingControlPanel: Error in fetchClassDetails:', err);
        setError('Failed to load class information. Please try again.');
      } finally {
        setLoading(false);
        console.log('GradingControlPanel: fetchClassDetails finished');
      }
    };

    const fetchCurrentSettings = async () => {
      try {
        setLoadingSettings(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Fetch current academic year
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const yearData: AcademicYearResponse = await yearResponse.json();
        
        if (yearData.success) {
          const activeYear = yearData.years.find(year => year.isActive);
          setCurrentYear(activeYear || null);
        }

        // Fetch current term
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
        console.error('Error fetching current settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    const fetchExistingGradingScale = async (classId: string | number, token: string) => {
      try {
        console.log('GradingControlPanel: Attempting to fetch existing grading scale');
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/grading-scales/class/${classId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // If a grading scale exists, use it
        if (response.ok) {
          const data = await response.json();
          console.log('GradingControlPanel: Existing grading scale found:', data);
          
          if (data && data.gradingScale && data.gradingScale.gradingRows) {
            // Sort grading rows by end marks
            const sortedRows = [...data.gradingScale.gradingRows].sort((a, b) => a.endMarks - b.endMarks);
            
            // Map to our GradingRow format
            const mappedRows = sortedRows.map(row => ({
              endMarks: row.endMarks,
              grade: row.grade,
              comment: row.comment
            }));
            
            console.log('GradingControlPanel: Setting grading data from API:', mappedRows);
            setGradingData(mappedRows);
            setSaveMessage('Loaded existing grading scale');
            setSaveMessageType('success');
            
            // Auto-clear message after 3 seconds
            setTimeout(() => setSaveMessage(null), 3000);
          }
        } else {
          // No existing grading scale found - using default data is fine
          console.log('GradingControlPanel: No existing grading scale found, using defaults');
        }
      } catch (err) {
        console.error('GradingControlPanel: Error fetching existing grading scale:', err);
        // Don't set error state here, just use default data
      }
    };

    fetchClassDetails();
    fetchCurrentSettings();
  }, []);

  const handleSave = async (): Promise<void> => {
    try {
      if (!classDetails?.id) {
        throw new Error('Class ID is missing');
      }

      setSaveMessage('Saving grading scale...');
      setSaveMessageType('success');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/grading-scales/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: classDetails.id,
          academicYearId: currentYear?.id || null,
          termId: currentTerm?.id || null,
          gradingRows: gradingData
        })
      });
      
      const data = await response.json();

      // Directly use the API's message if available
      if (data.returnMessage) {
        setSaveMessage(data.returnMessage);
        setSaveMessageType(data.returnCode === 500 ? 'error' : 'success');
        return;
      }

      // Fallback to standard success/error handling
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save grading scale');
      }

      // Default success message if API doesn't provide a specific message
      setSaveMessage(`Grading scale saved successfully for ${classDetails?.name || 'Unknown Class'}!`);
      setSaveMessageType('success');
    } catch (err) {
      console.error('Error saving grading scale:', err);
      setSaveMessageType('error');
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save grading scale. Please try again.');
    } finally {
      // Auto-clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  const handleInputChange = (
    index: number,
    field: keyof GradingRow,
    value: string
  ): void => {
    const newData = [...gradingData];
    newData[index] = {
      ...newData[index],
      [field]: field === 'comment' ? value : Number(value)
    };
    setGradingData(newData);
  };

  const getDisplayName = () => {
    if (!classDetails) return 'Loading...';
    return classDetails.section 
      ? `${classDetails.name} - ${classDetails.section}`
      : classDetails.name;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600">Loading class details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md w-full hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center pt-20">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-lg p-6">
        <div className="space-y-4">
          <div className="bg-green-600 text-white py-4 rounded-md">
            <h2 className="text-2xl font-semibold text-center">
              Grading Systems Control Panel
            </h2>
            <h2 className="text-2xl font-semibold text-center">{getDisplayName()}</h2>
          </div>

          <div className="mt-6">
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
                  <h2 className="text-lg font-semibold">Current Term</h2>
                </div>
                {loadingSettings ? (
                  <p className="text-gray-600">Loading term...</p>
                ) : currentTerm ? (
                  <p className="text-3xl font-bold text-gray-700">{currentTerm.name}</p>
                ) : (
                  <p className="text-3xl font-bold text-amber-600">Term not yet set</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <span className="font-semibold">End marks</span>
              <span className="font-semibold">Grade</span>
              <span className="font-semibold">Comment</span>
            </div>

            <div className="space-y-4">
              {gradingData.map((row, index) => (
                <div key={index} className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={row.endMarks}
                    onChange={(e) => handleInputChange(index, 'endMarks', e.target.value)}
                    className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                  />
                  <input
                    type="number"
                    value={row.grade}
                    onChange={(e) => handleInputChange(index, 'grade', e.target.value)}
                    className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                  />
                  <input
                    type="text"
                    value={row.comment}
                    onChange={(e) => handleInputChange(index, 'comment', e.target.value)}
                    className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                  />
                </div>
              ))}

              {saveMessage && (
                <div className={`p-3 rounded-md mt-4 text-center ${saveMessageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {saveMessage}
                </div>
              )}

              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-md w-full mt-4 hover:bg-green-700 shadow-md"
              >
                Save Grading Scale
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingControlPanel;