"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, AlertCircle, Check, Loader2 } from "lucide-react";
import { supabase } from '../../../../../lib/supabaseClient';

// Define Teacher interface to match API response
interface Teacher {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  staff_photo?: string;
  role: string;
  gender: string;
  section?: string;
  status?: string;
  classesAssigned?: string[];
  subjectsAssigned?: string[];
  hasAccess: boolean; // Controls system login access
  isActive: boolean;  // Controls whether the user is active in the system
  address?: string;
  salary?: string;
  utility?: string;
  name_of_bank?: string;
  account_number?: string;
  mobile_money_number?: string;
  registered_name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeactivateTeachers = () => {
  // State for tabs
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  
  // State for teachers and UI
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [activationReason, setActivationReason] = useState("");

  // Handle authentication error - simplified approach
  const handleAuthError = useCallback(() => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
    
    // Redirect to login after showing the error message
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  }, []);

  // Fetch users from API with active/inactive filtering
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      // Use the backend's status filter capability with the correct parameter name
      const status = activeTab === 'active' ? 'active' : 'inactive';
      console.log(`Fetching users with status=${status}`);
      
      const response = await fetch(
        `${env.BACKEND_API_URL}/api/v1/integration/users?status=${status}&pageSize=1000${searchValue ? `&search=${searchValue}` : ''}`,
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
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.status?.returnCode === "00") {
        // Ensure UI status and buttons are consistent with the tab we're viewing
        // This pattern follows the subject management approach
        const usersWithConsistentUI = (result.data.users || []).map((user: Teacher) => ({
          ...user,
          // Force isActive to match the current tab for UI display consistency
          isActive: activeTab === 'active'
        }));
        setTeachers(usersWithConsistentUI);
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchValue, handleAuthError]);

  // Load teachers on tab change and search
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Open deactivate dialog
  const openDeactivateDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeactivationReason("");
    setIsDeactivateDialogOpen(true);
  };

  // Open activate dialog
  const openActivateDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setActivationReason("");
    setIsActivateDialogOpen(true);
  };

  // Handle deactivate teacher
  const handleDeactivateTeacher = async () => {
    if (!selectedTeacher) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${selectedTeacher.id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: deactivationReason || 'No reason provided'
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to deactivate teacher: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status?.returnCode === "00") {
        setSuccess(`Teacher ${selectedTeacher.first_name} ${selectedTeacher.last_name} has been deactivated.`);
        setIsDeactivateDialogOpen(false);
        // Refresh the teacher list
        fetchTeachers();
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to deactivate teacher');
      }
    } catch (err) {
      console.error('Error deactivating teacher:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate teacher');
    } finally {
      setLoading(false);
    }
  };

  // Handle activate teacher
  const handleActivateTeacher = async () => {
    if (!selectedTeacher) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${selectedTeacher.id}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: activationReason || 'No reason provided'
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to activate teacher: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status?.returnCode === "00") {
        setSuccess(`Teacher ${selectedTeacher.first_name} ${selectedTeacher.last_name} has been activated.`);
        setIsActivateDialogOpen(false);
        // Refresh the teacher list
        fetchTeachers();
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to activate teacher');
      }
    } catch (err) {
      console.error('Error activating teacher:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate teacher');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    // Reset to first page and trigger search
    fetchTeachers();
  };

  // Teacher avatar component
  const TeacherAvatar = ({ teacher }: { teacher: Teacher }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!teacher.staff_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('staff-photos')
          .createSignedUrl(teacher.staff_photo, 3600);

        if (error) {
          console.error('Error getting signed URL:', error);
          setIsLoading(false);
          return;
        }

        setImageUrl(data.signedUrl);
        setIsLoading(false);
      };

      getSignedUrl();
    }, [teacher.staff_photo]);

    // Generate a color based on teacher's name for avatar background if no photo is available
    const generateColor = (name: string) => {
      const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500',
        'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div className="flex-shrink-0 h-10 w-10">
        {isLoading ? (
          // Loading state with shimmer effect
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
        ) : imageUrl ? (
          // Show the actual photo from Supabase
          <Image 
            src={imageUrl}
            width={40} 
            height={40} 
            alt={`${teacher.first_name} ${teacher.last_name}`} 
            className="h-10 w-10 rounded-full object-cover" 
          />
        ) : (
          // Fallback to colored initials
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${generateColor(teacher.first_name + teacher.last_name)}`}>
            {teacher.first_name.charAt(0).toUpperCase()}{teacher.last_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Deactivate Dialog */}
      {isDeactivateDialogOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Deactivate Teacher</h3>
            <p className="mb-4">Are you sure you want to deactivate {selectedTeacher.first_name} {selectedTeacher.last_name}?</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deactivation (optional)</label>
              <textarea 
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter reason for deactivation"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setIsDeactivateDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeactivateTeacher}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Dialog */}
      {isActivateDialogOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Activate Teacher</h3>
            <p className="mb-4">Are you sure you want to activate {selectedTeacher.first_name} {selectedTeacher.last_name}?</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for activation (optional)</label>
              <textarea 
                value={activationReason}
                onChange={(e) => setActivationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter reason for activation"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setIsActivateDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleActivateTeacher}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Activate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Teacher Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-800 p-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 text-green-800 p-3 rounded-md flex items-center">
              <Check className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex -mb-px space-x-8">
              <button
                className={`py-2 px-1 font-medium text-sm ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                onClick={() => setActiveTab('active')}
              >
                Active Users
              </button>
              <button
                className={`py-2 px-1 font-medium text-sm ${activeTab === 'inactive' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                onClick={() => setActiveTab('inactive')}
              >
                Inactive Users
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex space-x-2 mb-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, ID, or role"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1 ml-1">
            <span className="font-semibold text-red-600">A A</span> Please search NAME IN CAPITAL LETTERS
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Teacher Table - Desktop Only */}
          <div className="hidden lg:block overflow-x-auto rounded-md shadow mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((teacher: Teacher, index: number) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <TeacherAvatar teacher={teacher} />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {teacher.first_name} {teacher.middle_name || ''} {teacher.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{teacher.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.id?.substring(0, 8) || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {teacher.isActive ? (
                        <button
                          onClick={() => openDeactivateDialog(teacher)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => openActivateDialog(teacher)}
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

          {/* Teacher Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
          <div className="hidden md:grid md:grid-cols-2 gap-4 mt-4 lg:hidden">
            {teachers.map((teacher: Teacher, index: number) => (
              <div key={teacher.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
                <div className="flex items-center mb-2">
                  <TeacherAvatar teacher={teacher} />
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">{teacher.first_name} {teacher.last_name}</div>
                    <div className="text-xs text-gray-500">{teacher.gender} • {teacher.role}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">ID: {teacher.id?.substring(0, 8) || '-'}</div>
                <div className="text-xs text-gray-500 mb-2">Email: {teacher.email}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {teacher.isActive ? (
                    <button
                      onClick={() => openDeactivateDialog(teacher)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => openActivateDialog(teacher)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Teacher Cards - Mobile (md:hidden) */}
          <div className="md:hidden space-y-4 mt-4">
            {teachers.map((teacher: Teacher, index: number) => (
              <div key={teacher.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
                <div className="flex items-center mb-2">
                  <TeacherAvatar teacher={teacher} />
                  <div className="ml-4">
                    <div className="font-bold text-base text-gray-800">{teacher.first_name} {teacher.last_name}</div>
                    <div className="text-xs text-gray-500">{teacher.gender} • {teacher.role}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">ID: {teacher.id?.substring(0, 8) || '-'}</div>
                <div className="text-xs text-gray-500 mb-2">Email: {teacher.email}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {teacher.isActive ? (
                    <button
                      onClick={() => openDeactivateDialog(teacher)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => openActivateDialog(teacher)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeactivateTeachers;
