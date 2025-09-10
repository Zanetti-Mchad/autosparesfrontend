"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, AlertCircle, Check, Loader2 } from "lucide-react";
import { supabase } from '../../../../../lib/supabaseClient';

// Define Student interface to match API response
interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  class_assigned: string;
  student_photo: string;
  status: string;
}

const DeactivateStudents = () => {
  // State for tabs
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  
  // State for students and UI
  const [students, setStudents] = useState<Student[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [activationReason, setActivationReason] = useState("");

  // Handle authentication error
  const handleAuthError = () => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
  };

  // Fetch students from API with active/inactive filtering
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      // Add status filter to API call
      const statusParam = activeTab === 'active' ? 'active' : 'deactivated';
      const response = await fetch(
        `${env.BACKEND_API_URL}/api/v1/students/filter?status=${statusParam}&pageSize=10000${searchValue ? `&search=${searchValue}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch students: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.status?.returnCode === "00") {
        setStudents(result.data.students || []);
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchValue]);

  // Load students on tab change and search
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Open deactivate dialog
  const openDeactivateDialog = (student: Student) => {
    setSelectedStudent(student);
    setDeactivationReason("");
    setIsDeactivateDialogOpen(true);
  };

  // Open activate dialog
  const openActivateDialog = (student: Student) => {
    setSelectedStudent(student);
    setActivationReason("");
    setIsActivateDialogOpen(true);
  };

  // Handle deactivate student
  const handleDeactivateStudent = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${selectedStudent.id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: deactivationReason })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Failed to deactivate student: ${response.status}`;
        } catch {
          errorMessage = `Failed to deactivate student: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Deactivate response:', result);
      
      if (result.status?.returnCode === "00") {
        setSuccess(`Successfully deactivated ${selectedStudent.first_name} ${selectedStudent.last_name}`);
        fetchStudents(); // Refresh the list
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to deactivate student');
      }
    } catch (err) {
      console.error('Error deactivating student:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deactivating the student');
    } finally {
      setLoading(false);
      setIsDeactivateDialogOpen(false);
      setSelectedStudent(null);
    }
  };

  // Handle activate student
  const handleActivateStudent = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${selectedStudent.id}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: activationReason })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Failed to activate student: ${response.status}`;
        } catch {
          errorMessage = `Failed to activate student: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Activate response:', result);
      
      if (result.status?.returnCode === "00") {
        setSuccess(`Successfully activated ${selectedStudent.first_name} ${selectedStudent.last_name}`);
        fetchStudents(); // Refresh the list
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to activate student');
      }
    } catch (err) {
      console.error('Error activating student:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while activating the student');
    } finally {
      setLoading(false);
      setIsActivateDialogOpen(false);
      setSelectedStudent(null);
    }
  };

  // Handle search
  const handleSearch = () => {
    fetchStudents();
  };

  // Filter students based on search input (client-side filtering as backup)
  const filteredStudents = students.filter(
    (student) =>
      student.first_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      student.class_assigned?.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Function to get proper class display name
  const getClassDisplayName = (classValue: string) => {
    const classMap: Record<string, string> = {
      'baby_class': 'Baby Class',
      'middle_class': 'Middle Class',
      'top_class': 'Top Class',
      'p1': 'P1',
      'p2': 'P2',
      'p3': 'P3',
      'p4': 'P4',
      'p5': 'P5',
      'p6': 'P6',
      'p7': 'P7',
      'Form 3': 'Form 3'
    };
    
    return classMap[classValue] || classValue;
  };

  // Student avatar component
  const StudentAvatar = ({ student }: { student: Student }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!student.student_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(student.student_photo, 3600);
        
        if (error) {
          console.error("Error creating signed URL for deactivate student page:", error);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
        
        setIsLoading(false);
      };
      
      getSignedUrl();
    }, [student.student_photo]);

    // Show a loading shimmer while fetching the URL
    if (isLoading) {
      return (
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
      );
    }
    
    // If we have a valid URL, show the image
    if (imageUrl) {
      return (
        <div className="flex-shrink-0 h-10 w-10 relative">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            <Image
              src={imageUrl}
              alt={`${student.first_name} ${student.last_name}`}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized // Important for external URLs like those from Supabase
            />
          </div>
        </div>
      );
    }

    // Otherwise, show the fallback initials
    return (
      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
        {student.first_name?.[0] || ''}{student.last_name?.[0] || ''}
      </div>
    );
  };

  return (
    <div className="container p-4 mx-auto">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-2xl font-bold">Student Status Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex border-b mb-4">
            <button 
              className={`py-2 px-4 font-medium ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('active')}
            >
              Active Students
            </button>
            <button 
              className={`py-2 px-4 font-medium ${activeTab === 'inactive' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('inactive')}
            >
              Inactive Students
            </button>
          </div>

          {/* Search and Filter Row */}
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or class..."
                className="pl-8 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
          
          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 bg-red-100 text-red-800 p-4 rounded flex items-center">
              <AlertCircle className="mr-2" size={20} />
              Error: {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-100 text-green-800 p-4 rounded flex items-center">
              <Check className="mr-2" size={20} />
              {success}
            </div>
          )}

          {/* Deactivate Confirmation Dialog */}
          {isDeactivateDialogOpen && selectedStudent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Deactivate Student</h2>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to deactivate <span className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</span>?
                </p>
                <div className="mb-4">
                  <label htmlFor="deactivationReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for deactivation (required)
                  </label>
                  <textarea
                    id="deactivationReason"
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setIsDeactivateDialogOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeactivateStudent}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium flex items-center"
                    disabled={loading || !deactivationReason.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : 'Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activate Confirmation Dialog */}
          {isActivateDialogOpen && selectedStudent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Activate Student</h2>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to activate <span className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</span>?
                </p>
                <div className="mb-4">
                  <label htmlFor="activationReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for activation (required)
                  </label>
                  <textarea
                    id="activationReason"
                    value={activationReason}
                    onChange={(e) => setActivationReason(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setIsActivateDialogOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleActivateStudent}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium flex items-center"
                    disabled={loading || !activationReason.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && !isDeactivateDialogOpen && !isActivateDialogOpen && (
            <div className="flex justify-center my-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Responsive Student List */}
          {students.length > 0 ? (
            <div className="mt-4">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto rounded-md shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <StudentAvatar student={student} />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.first_name} {student.middle_name || ''} {student.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.id?.substring(0, 8) || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getClassDisplayName(student.class_assigned)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {student.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {student.status === 'active' ? (
                            <button
                              onClick={() => openDeactivateDialog(student)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => openActivateDialog(student)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div className="flex items-center mb-4">
                      <StudentAvatar student={student} />
                      <div className="ml-4">
                        <p className="text-md font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-500">ID: {student.id?.substring(0, 8) || '-'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Class:</span> {getClassDisplayName(student.class_assigned)}</p>
                      <p><span className="font-medium">Status:</span>
                        <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {student.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      {student.status === 'active' ? (
                        <button
                          onClick={() => openDeactivateDialog(student)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors w-full"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => openActivateDialog(student)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors w-full"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !loading ? (
            <div className="text-center py-8 text-gray-500">
              No {activeTab === 'active' ? 'active' : 'inactive'} students found. {activeTab === 'inactive' && 'All students are active.'}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeactivateStudents;
